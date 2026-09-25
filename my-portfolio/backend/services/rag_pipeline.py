
"""
backend/services/pipeline.py
Unified RAG Pipeline — robust and production-friendly.
"""

import re
import random
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from config.fallback_answers import get_fallback_answer

from groq import AsyncGroq
from config.settings import settings
from services.retriever import UltraPreciseRetriever
from services.formatter import ResponseFormatter
from services.memory import ConversationMemory

logger = logging.getLogger(__name__)

# -----------------------------------------------------------------------------
# GLOBAL CONFIG
# -----------------------------------------------------------------------------

_PERSPECTIVE_RULES = """
PERSPECTIVE RULES (CRITICAL):
- You are AdilChat, a portfolio assistant answering ABOUT Adil Saeed, NOT Adil himself.
- ALWAYS use third person: "he", "his", "him", "Adil", "Adil's".
- NEVER use first person for Adil: "I", "my", "me", "mine".
- NEVER use second person for Adil: "you", "your".

SCOPE:
- ONLY answer questions about Adil Saeed's portfolio.
- If asked about anyone else -> "I only have information about Adil Saeed."
- If asked about unrelated topics -> redirect politely.
"""

_FORMATTING_RULES = """
FORMATTING RULES:
- Use **bold** ONLY for section headings when needed.
- NO markdown headers (#, ##, ###).
- Bullet points max 5 items.
- Keep answers concise and natural.
- Max 1-2 emojis per response.
- For contact/social links: write platform names only (system converts links).
"""

# Base retrieval config. Runtime tuning adapts from these.
_RETRIEVAL_CONFIG: Dict[str, Dict[str, Any]] = {
    "FACTOID": {"k": 6, "score_threshold": 0.22, "max_tokens": 180},
    "VERIFICATION": {"k": 8, "score_threshold": 0.18, "max_tokens": 280},
    "EXPLORATORY": {"k": 10, "score_threshold": 0.15, "max_tokens": 520},
}

_TOPIC_ENHANCEMENTS: Dict[str, str] = {
    "education": "adil saeed education university degree college imsciences giki diploma academic",
    "projects": "adil saeed projects built developed ocr rag chatbot sentiment analysis mlops ai ml",
    "skills": "adil saeed skills python java javascript html css tensorflow pytorch nlp cv",
    "experience": "adil saeed experience internship mlsa microsoft lead giki role achievements",
    "contact": "adil saeed contact email linkedin github facebook medium social accounts",
    "personal": "adil saeed personal family brother asad friends hasnain saad rohail umer daud",
    "research": "adil saeed research paper publication article writing medium",
}

_STOPWORDS = {
    "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "about",
    "is", "are", "was", "were", "be", "with", "that", "this", "it", "as",
    "me", "you", "your", "his", "her", "their", "my"
}

# -----------------------------------------------------------------------------
# INTENT CLASSIFIER
# -----------------------------------------------------------------------------

class _IntentClassifier:
    _GREETING_KW = {
        "hi", "hello", "hey", "greetings", "good morning", "good afternoon",
        "good evening", "salam", "assalam", "yo", "howdy", "hola"
    }

    _GREETING_BLOCKERS = {
        "project", "skills", "experience", "education", "contact",
        "who", "what", "where", "when", "which", "explain", "describe",
        "linkedin", "github", "email", "friend", "brother", "internship"
    }

    _POLITE_CHAT = {"how are you", "how r u", "what's up", "whats up"}
    _CAPABILITY_KW = {
        "what can you do", "how can you help", "what is this chatbot",
        "tell me about yourself", "your capabilities", "what information do you have"
    }
    _ACK_KW = {"thanks", "thank you", "ok thanks", "appreciate", "got it"}
    _CLARIFICATION_KW = {"i mean", "not that", "i said", "wrong", "clarify"}

    _VERIFICATION_KW = {
        "prove", "evidence", "verify", "is it true", "credentials",
        "certificate", "qualification", "why hire", "better than", "instead of"
    }
    _EXPLORATORY_KW = {
        "tell me about", "overview", "explain", "all about", "summary",
        "comprehensive", "details", "who is", "background"
    }

    _TOPIC_KW = {
        "education": ["education", "degree", "university", "college", "imsciences", "academic"],
        "projects": ["project", "built", "developed", "created", "ocr", "chatbot", "portfolio"],
        "skills": ["skill", "technology", "programming", "language", "framework", "python", "ai", "ml"],
        "experience": ["experience", "internship", "role", "job", "mlsa", "giki", "hire"],
        "contact": ["contact", "email", "linkedin", "github", "facebook", "social"],
        "personal": ["family", "brother", "friend", "asad", "hasnain", "saad", "rohail", "umer", "daud"],
        "research": ["research", "paper", "publication", "article", "blog"],
    }

    _NAME_PATTERNS = [
        re.compile(r"\b(?:i am|i'm|my name is|call me)\s+([a-zA-Z]+)\b", re.I),
    ]
    _NAME_RECALL_PATTERNS = [
        re.compile(r"\bmy name\b", re.I),
        re.compile(r"\bwho am i\b", re.I),
        re.compile(r"\bremember me\b", re.I),
    ]
    _FAKE_NAMES = {"am", "is", "are", "the", "a", "an", "here", "there"}

    def classify(self, query: str, session_context: Optional[Dict] = None) -> Dict[str, Any]:
        if not query or not query.strip():
            return self._resp("INVALID", False)

        q = query.lower().strip()

        # gibberish guard
        words = q.split()
        if words and all(not w.isalpha() for w in words) and len(q) < 20:
            return self._resp("INVALID", False)

        if any(p in q for p in self._POLITE_CHAT):
            return self._resp("POLITE_CHAT", False)

        if any(p in q for p in self._CLARIFICATION_KW):
            return self._resp("CLARIFICATION", True, topic=self._detect_topic(q), retrieval_type=self._retrieval_type(q))

        if len(q) <= 30 and any(p in q for p in self._ACK_KW):
            return self._resp("ACKNOWLEDGMENT", False)

        name = self._extract_name(query)
        if name and self._valid_introduction(q):
            return self._resp("USER_INTRODUCTION", False, user_name=name)

        if any(k in q for k in self._CAPABILITY_KW):
            return self._resp("CAPABILITY", False)

        if self._is_greeting(q):
            return self._resp("GREETING", False)

        if session_context and any(p.search(q) for p in self._NAME_RECALL_PATTERNS):
            return self._resp("NAME_RECALL", False)

        topic = self._detect_topic(q)
        rt = self._retrieval_type(q)
        return self._resp(rt, True, topic=topic, retrieval_type=rt)

    def _is_greeting(self, q: str) -> bool:
        if any(b in q for b in self._GREETING_BLOCKERS):
            return False
        parts = set(q.split())
        return (len(parts) <= 3 and bool(parts & self._GREETING_KW)) or any(q.startswith(k) for k in self._GREETING_KW)

    def _extract_name(self, query: str) -> Optional[str]:
        for pat in self._NAME_PATTERNS:
            m = pat.search(query)
            if m:
                n = m.group(1).strip()
                if n.isalpha() and n.lower() not in self._FAKE_NAMES:
                    return n.capitalize()
        return None

    def _valid_introduction(self, q: str) -> bool:
        if re.search(r"\bwho (is|are)\b", q):
            return False
        return any(k in q for k in ("i am", "i'm", "my name is", "call me"))

    def _detect_topic(self, q: str) -> Optional[str]:
        # score-based topic detection to reduce first-match errors
        scores = {}
        for t, kws in self._TOPIC_KW.items():
            s = sum(1 for kw in kws if kw in q)
            if s > 0:
                scores[t] = s
        if not scores:
            return None
        return max(scores.items(), key=lambda x: x[1])[0]

    def _retrieval_type(self, q: str) -> str:
        if any(k in q for k in self._VERIFICATION_KW):
            return "VERIFICATION"
        if any(k in q for k in self._EXPLORATORY_KW) or (" and " in q and len(q.split()) > 8):
            return "EXPLORATORY"
        return "FACTOID"

    @staticmethod
    def _resp(intent: str, needs_retrieval: bool, user_name: Optional[str] = None,
              topic: Optional[str] = None, retrieval_type: str = "FACTOID") -> Dict[str, Any]:
        return {
            "intent": intent,
            "needs_retrieval": needs_retrieval,
            "user_name": user_name,
            "topic": topic,
            "retrieval_type": retrieval_type,
        }

# -----------------------------------------------------------------------------
# SESSION MEMORY (with lightweight entity/result tracking for follow-ups)
# -----------------------------------------------------------------------------

class _SessionMemory:
    def __init__(self, max_history: int = 6, timeout_minutes: int = 30):
        self._sessions: Dict[str, Dict[str, Any]] = {}
        self._max_history = max_history
        self._timeout = timedelta(minutes=timeout_minutes)

    def get_context(self, session_id: str) -> Dict[str, Any]:
        s = self._get_or_create(session_id)
        return {
            "user_name": s.get("user_name"),
            "greeted": s.get("greeted", False),
            "interaction_count": s.get("count", 0),
            "last_topic": self._fresh_last_topic(s),
            "last_entities": s.get("last_entities", []),
            "last_results": s.get("last_results", []),  # ordered list for "first one"
            "has_history": s.get("count", 0) > 0,
        }

    def set_user_name(self, session_id: str, name: str):
        self._get_or_create(session_id)["user_name"] = name

    def mark_greeted(self, session_id: str):
        self._get_or_create(session_id)["greeted"] = True

    def set_last_topic(self, session_id: str, topic: Optional[str], entities: Optional[List[str]] = None):
        s = self._get_or_create(session_id)
        s["last_topic"] = {"topic": topic, "timestamp": datetime.now()}
        s["last_entities"] = entities or []

    def set_last_results(self, session_id: str, ordered_results: List[str]):
        s = self._get_or_create(session_id)
        s["last_results"] = ordered_results[:10]

    def add_interaction(self, session_id: str, query: str, answer: str, intent: str):
        s = self._get_or_create(session_id)
        s["interactions"].append({"query": query, "answer": answer, "intent": intent, "ts": datetime.now().isoformat()})
        if len(s["interactions"]) > self._max_history:
            s["interactions"] = s["interactions"][-self._max_history:]
        s["count"] += 1

    def _fresh_last_topic(self, s: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        lt = s.get("last_topic")
        if not lt:
            return None
        if (datetime.now() - lt["timestamp"]).total_seconds() <= 420:
            return lt
        return None

    def _cleanup(self):
        expired = []
        for sid, st in self._sessions.items():
            if (datetime.now() - st["last_active"]) > self._timeout:
                expired.append(sid)
        for sid in expired:
            del self._sessions[sid]

    def _get_or_create(self, session_id: str) -> Dict[str, Any]:
        self._cleanup()
        if session_id not in self._sessions:
            self._sessions[session_id] = {
                "user_name": None,
                "greeted": False,
                "count": 0,
                "interactions": [],
                "last_topic": None,
                "last_entities": [],
                "last_results": [],
                "created_at": datetime.now(),
                "last_active": datetime.now(),
            }
        else:
            self._sessions[session_id]["last_active"] = datetime.now()
        return self._sessions[session_id]

# -----------------------------------------------------------------------------
# MAIN PIPELINE
# -----------------------------------------------------------------------------

class RAGPipeline:
    def __init__(self):
        self.retriever = UltraPreciseRetriever()
        self.groq_client: Optional[AsyncGroq] = None
        self.formatter = ResponseFormatter()
        self.memory = ConversationMemory()
        self._session = _SessionMemory()
        self._classifier = _IntentClassifier()
        self.initialized = False

    async def initialize(self):
        try:
            self.groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)
            await self.retriever.initialize()
            self.initialized = True
            logger.info("RAGPipeline initialized successfully")
        except Exception as exc:
            logger.error(f"RAGPipeline initialization failed: {exc}")
            raise

    async def refresh_data(self) -> bool:
        try:
            await self.retriever.initialize()
            return True
        except Exception as exc:
            logger.error(f"refresh_data failed: {exc}")
            return False

    async def process_query(
        self,
        query: str,
        language: str = "en",
        session_id: str = "default",
        conversation_history: List = None,
        user_context: Dict = None,
    ) -> Dict[str, Any]:
        if not self.initialized:
            raise RuntimeError("Pipeline not initialized — call initialize() first")

        stripped = (query or "").strip()
        if len(stripped) < 2:
            return await self.formatter.format_response({
                "answer": "Your message is too short. Ask about Adil's projects, skills, education, or experience.",
                "sources": [],
                "query_type": "invalid_input",
                "confidence": 0.95,
                "original_query": query or "",
            }, language)

        t0 = time.time()
        try:
            ctx = self._session.get_context(session_id)

            # follow-up resolution before intent classification
            resolved_query = self._resolve_follow_up_query(stripped, ctx)

            intent = self._classifier.classify(resolved_query, ctx)
            raw = await self._route(resolved_query, intent, ctx, session_id)
            raw["original_query"] = query

            result = await self.formatter.format_response(raw, language)
            result["processing_time"] = round((time.time() - t0) * 1000, 1)

            self._session.add_interaction(session_id, query, result.get("answer", ""), intent["intent"])
            return result

        except Exception as exc:
            logger.error(f"process_query error: {exc}", exc_info=True)
            return await self.formatter.format_response({
                "answer": "I'm having a temporary issue. Please try again.",
                "sources": [],
                "query_type": "error",
                "confidence": 0.0,
                "original_query": query,
            }, language)

    # -------------------------------------------------------------------------
    # ROUTING
    # -------------------------------------------------------------------------

    async def _route(self, query: str, intent: Dict[str, Any], ctx: Dict[str, Any], session_id: str) -> Dict[str, Any]:
        code = intent["intent"]

        if code == "GREETING":
            return self._handle_greeting(ctx, session_id)
        if code == "INVALID":
            return {"answer": "Could you rephrase that? I can help with Adil's portfolio details.",
                    "sources": [], "query_type": "invalid", "confidence": 0.95}
        if code == "POLITE_CHAT":
            return self._handle_polite_chat(ctx)
        if code == "ACKNOWLEDGMENT":
            return self._handle_acknowledgment(ctx)
        if code == "CAPABILITY":
            return self._handle_capability(ctx)
        if code == "USER_INTRODUCTION":
            nm = intent.get("user_name", "")
            self._session.set_user_name(session_id, nm)
            return self._handle_user_introduction(nm)
        if code == "NAME_RECALL":
            return self._handle_name_recall(ctx)

        if self._is_general_knowledge(query):
            return await self._handle_general(query)

        if self._is_chatbot_meta(query):
            return self._handle_chatbot_meta()

        resp = await self._handle_knowledge(query, intent, ctx, session_id)
        if code == "CLARIFICATION" and resp.get("answer"):
            resp["answer"] = "Thanks for clarifying. " + resp["answer"]
        return resp

    # -------------------------------------------------------------------------
    # Conversational handlers
    # -------------------------------------------------------------------------

    def _handle_greeting(self, ctx: Dict[str, Any], session_id: str) -> Dict[str, Any]:
        name = ctx.get("user_name")
        greeted = ctx.get("greeted", False)

        if name:
            ans = f"Hello {name}! What would you like to know about Adil's portfolio?"
        elif not greeted:
            ans = ("Hello! I'm AdilChat, Adil Saeed's portfolio assistant. "
                   "Ask me about his projects, skills, education, experience, or contact.")
            self._session.mark_greeted(session_id)
        else:
            ans = "Hi again! Ask me anything about Adil's projects, skills, education, or experience."

        return {"answer": ans, "sources": [], "query_type": "greeting", "confidence": 0.95}

    def _handle_polite_chat(self, ctx: Dict[str, Any]) -> Dict[str, Any]:
        nm = ctx.get("user_name")
        tail = f", {nm}" if nm else ""
        return {"answer": f"Doing well{tail}! What would you like to know about Adil?",
                "sources": [], "query_type": "polite_chat", "confidence": 0.95}

    def _handle_acknowledgment(self, ctx: Dict[str, Any]) -> Dict[str, Any]:
        nm = ctx.get("user_name")
        tail = f", {nm}" if nm else ""
        opts = [
            f"You're welcome{tail}! Ask anything else about Adil.",
            f"Happy to help{tail}! Want to explore projects, skills, or experience next?",
            f"Anytime{tail}! I'm here for Adil's portfolio details.",
        ]
        return {"answer": random.choice(opts), "sources": [], "query_type": "acknowledgment", "confidence": 0.95}

    def _handle_capability(self, ctx: Dict[str, Any]) -> Dict[str, Any]:
        nm = ctx.get("user_name")
        intro = f"Great question, {nm}." if nm else "Great question."
        return {
            "answer": (
                f"{intro}\n\n"
                "I can help with:\n"
                "**Projects** — what he built and tech used\n"
                "**Skills** — languages, frameworks, AI/ML stack\n"
                "**Education** — institutions, programs, certifications\n"
                "**Experience** — internships, leadership, achievements\n"
                "**Contact** — email and social platforms"
            ),
            "sources": [],
            "query_type": "capability",
            "confidence": 0.95,
        }

    @staticmethod
    def _handle_user_introduction(name: str) -> Dict[str, Any]:
        return {
            "answer": f"Nice to meet you, {name}! Ask me anything about Adil Saeed's portfolio.",
            "sources": [],
            "query_type": "user_introduction",
            "confidence": 0.95,
        }

    @staticmethod
    def _handle_name_recall(ctx: Dict[str, Any]) -> Dict[str, Any]:
        n = ctx.get("user_name")
        if n:
            return {"answer": f"Your name is {n}. What would you like to ask next?",
                    "sources": [], "query_type": "name_recall", "confidence": 0.95}
        return {"answer": "I don't have your name yet. You can say: 'My name is ...'",
                "sources": [], "query_type": "name_recall", "confidence": 0.95}

    # -------------------------------------------------------------------------
    # General/meta
    # -------------------------------------------------------------------------

    @staticmethod
    def _is_general_knowledge(query: str) -> bool:
        q = query.lower()
        if re.search(r"\d+\s*[\+\-\*\/]\s*\d+", q):
            return True
        pats = [r"capital of", r"weather in", r"population of", r"currency of", r"recipe for"]
        is_general = any(re.search(p, q) for p in pats)
        about_adil = any(w in q for w in ("adil", "portfolio", "his", "him"))
        return is_general and not about_adil

    @staticmethod
    def _is_chatbot_meta(query: str) -> bool:
        q = query.lower()
        pats = [
            r"who (made|created|built) you",
            r"what is your name",
            r"are you (an )?(ai|bot|assistant|chatbot)",
            r"what are you"
        ]
        return any(re.search(p, q) for p in pats)

    async def _handle_general(self, query: str) -> Dict[str, Any]:
        m = re.search(r"(\d+)\s*([\+\-\*\/])\s*(\d+)", query)
        if m:
            a, op, b = m.groups()
            a, b = int(a), int(b)
            val = None
            if op == "+": val = a + b
            elif op == "-": val = a - b
            elif op == "*": val = a * b
            elif op == "/": val = a / b if b != 0 else "undefined"
            return {"answer": f"The result is **{val}**.", "sources": [], "query_type": "math", "confidence": 0.99}

        try:
            r = await self.groq_client.chat.completions.create(
                model=settings.GROQ_MODEL_EN,
                messages=[
                    {"role": "system", "content": "Answer in one short sentence."},
                    {"role": "user", "content": query},
                ],
                temperature=0.1,
                max_tokens=60,
            )
            return {"answer": r.choices[0].message.content.strip(),
                    "sources": [], "query_type": "general", "confidence": 0.78}
        except Exception:
            return {"answer": "I focus on Adil Saeed's portfolio. Ask about his projects, skills, education, or experience.",
                    "sources": [], "query_type": "redirect", "confidence": 0.70}

    @staticmethod
    def _handle_chatbot_meta() -> Dict[str, Any]:
        return {
            "answer": ("I'm AdilChat, an AI assistant built to explain Adil Saeed's portfolio, "
                       "including projects, skills, education, experience, and contact info."),
            "sources": [],
            "query_type": "chatbot_meta",
            "confidence": 0.95,
        }

    # -------------------------------------------------------------------------
    # FOLLOW-UP RESOLUTION
    # -------------------------------------------------------------------------

    def _resolve_follow_up_query(self, query: str, ctx: Dict[str, Any]) -> str:
        q = query.lower()
        last_results = ctx.get("last_results", [])
        last_entities = ctx.get("last_entities", [])
        last_topic = (ctx.get("last_topic") or {}).get("topic")

        # Ordinal references
        ord_map = {"first": 0, "second": 1, "third": 2, "last": -1}
        for k, idx in ord_map.items():
            if f"{k} one" in q or re.search(rf"\b{k}\b", q):
                if last_results:
                    ref = last_results[idx]
                    return f"{query} about {ref}"

        # Pronoun/implicit references
        if any(t in q for t in ("that project", "that one", "it", "them", "those", "more about that")):
            hints = []
            if last_topic:
                hints.append(last_topic)
            hints.extend(last_entities[:3])
            if hints:
                return f"{query} {' '.join(hints)}"

        return query

    # -------------------------------------------------------------------------
    # KNOWLEDGE (RAG)
    # -------------------------------------------------------------------------

    async def _handle_knowledge(self, query: str, intent: Dict[str, Any], ctx: Dict[str, Any], session_id: str) -> Dict[str, Any]:
        topic = intent.get("topic")
        retrieval_type = intent.get("retrieval_type", "FACTOID")

        norm = self._normalize(query)
        enhanced = self._enhance_query(norm, query, topic, ctx)

        # dynamic tuning
        cfg = self._adaptive_config(retrieval_type, enhanced)

        docs = await self._retrieve(enhanced, cfg)
        if not docs:
            docs = await self._emergency_retrieve(enhanced)

        if not docs:
            return self._no_info_response(topic)

        # rerank + diversify
        docs = self._rerank_and_diversify(enhanced, docs, keep=min(8, cfg["k"]))

        # context selection
        chunks = self._select_context_chunks(docs, retrieval_type, max_chars=5200)
        if not chunks:
            return self._no_info_response(topic)

        # collect entities/results from chunks for future follow-up resolution
        entities = self._extract_entities_from_docs(chunks)
        ordered_results = self._extract_ordered_items(chunks)

        answer, cited_sources, grounded_ratio = await self._generate(
            query=query,
            chunks=chunks,
            retrieval_type=retrieval_type,
            topic=topic,
            ctx=ctx,
            max_tokens=cfg["max_tokens"],
        )

        # NOW chunks exist and have "_cid" set by _generate() — build retrieved_chunks here
        retrieved_chunks = [
            {
                "id": d.get("_cid", f"C{i+1}"),
                "content": (d.get("content") or "")[:220],
                "source": str(d.get("source", "Adil_Data")),
                "score": round(float(d.get("retrieval_score", 0)), 2),
            }
            for i, d in enumerate(chunks)
        ]

        self._session.set_last_topic(session_id, topic, entities=entities)
        if ordered_results:
            self._session.set_last_results(session_id, ordered_results)

        conf = self._confidence(
            max_score=max(d.get("retrieval_score", 0.0) for d in chunks),
            num_docs=len(chunks),
            grounded_ratio=grounded_ratio
        )

        return {
            "answer": answer,
            "sources": cited_sources,
            "query_type": f"{topic or 'portfolio'}_{retrieval_type.lower()}",
            "confidence": conf,
            "retrieved_chunks": retrieved_chunks,
        }
    # -------------------------------------------------------------------------
    # Retrieval utilities
    # -------------------------------------------------------------------------

    @staticmethod
    def _normalize(query: str) -> str:
        fixes = {
            "adeel": "adil",
            "porject": "project",
            "porjects": "projects",
            "skils": "skills",
            "eduction": "education",
            "experiance": "experience",
            "contct": "contact",
            "socila": "social",
            "mdeia": "media",
            "insted": "instead",
            "instent": "instead",
        }
        q = query.lower().strip()
        for w, r in fixes.items():
            q = q.replace(w, r)
        return q

    def _enhance_query(self, norm_query: str, original_query: str, topic: Optional[str], ctx: Dict[str, Any]) -> str:
        q = norm_query

        # direct targeted boosts
        if "friend" in q:
            return "adil saeed friends network hasnain saad rohail umer daud asad"
        if any(t in q for t in ("social media", "social accounts", "all accounts", "online presence")):
            return "adil saeed contact linkedin github facebook medium social profiles"

        base = original_query
        if topic and topic in _TOPIC_ENHANCEMENTS:
            base = f"{base} {_TOPIC_ENHANCEMENTS[topic]}"

        # carry last entities into ambiguous follow-up
        if any(x in q for x in ("that", "it", "them", "those", "more about")):
            ents = ctx.get("last_entities") or []
            if ents:
                base = f"{base} {' '.join(ents[:3])}"

        return base

    def _adaptive_config(self, retrieval_type: str, query: str) -> Dict[str, Any]:
        cfg = dict(_RETRIEVAL_CONFIG[retrieval_type])

        q = query.lower()
        complexity = len(query.split())
        multi_topic = (" and " in q) or ("compare" in q) or ("difference" in q)

        if retrieval_type == "FACTOID":
            if complexity > 12:
                cfg["k"] = min(cfg["k"] + 2, 9)
                cfg["max_tokens"] = 220
        elif retrieval_type == "EXPLORATORY":
            if multi_topic:
                cfg["k"] = min(cfg["k"] + 3, 14)
                cfg["max_tokens"] = 650
            if complexity < 6:
                cfg["score_threshold"] = max(0.12, cfg["score_threshold"] - 0.02)
        elif retrieval_type == "VERIFICATION":
            cfg["k"] = min(cfg["k"] + 1, 10)

        return cfg

    async def _retrieve(self, query: str, cfg: Dict[str, Any]) -> List[Dict[str, Any]]:
        try:
            raw = await self.retriever.hybrid_retrieve(query=query, top_k=cfg["k"])
        except Exception as exc:
            logger.error(f"Retrieve error: {exc}")
            return []

        # dedup by (id + chunk index if available)
        seen = set()
        docs = []
        for d in raw:
            doc_id = str(d.get("id", ""))
            chunk_idx = str(d.get("chunk_index", d.get("chunk_id", "")))
            key = f"{doc_id}:{chunk_idx}"
            score = float(d.get("retrieval_score", 0.0))
            if key in seen:
                continue
            if score < cfg["score_threshold"]:
                continue
            seen.add(key)
            docs.append(d)

        return sorted(docs, key=lambda x: x.get("retrieval_score", 0.0), reverse=True)

    async def _emergency_retrieve(self, query: str) -> List[Dict[str, Any]]:
        try:
            raw = await self.retriever.hybrid_retrieve(query=query, top_k=14)
            docs = [d for d in raw if float(d.get("retrieval_score", 0.0)) >= 0.08]
            return sorted(docs, key=lambda x: x.get("retrieval_score", 0.0), reverse=True)
        except Exception as exc:
            logger.error(f"Emergency retrieve error: {exc}")
            return []

    def _rerank_and_diversify(self, query: str, docs: List[Dict[str, Any]], keep: int = 8) -> List[Dict[str, Any]]:
        # lightweight rerank: lexical overlap + retrieval score
        q_terms = {t for t in re.findall(r"[a-zA-Z0-9]+", query.lower()) if t not in _STOPWORDS and len(t) > 2}
        rescored = []
        for d in docs:
            txt = (d.get("content") or "").lower()
            d_terms = set(re.findall(r"[a-zA-Z0-9]+", txt))
            overlap = len(q_terms & d_terms) / (len(q_terms) + 1e-6)
            base = float(d.get("retrieval_score", 0.0))
            d["_rerank_score"] = 0.72 * base + 0.28 * overlap
            rescored.append(d)

        rescored.sort(key=lambda x: x.get("_rerank_score", 0.0), reverse=True)

        # simple diversity by source/id
        selected = []
        used_sources = set()
        for d in rescored:
            src = str(d.get("source", d.get("id", "unknown")))
            if src not in used_sources or len(selected) < max(2, keep // 2):
                selected.append(d)
                used_sources.add(src)
            if len(selected) >= keep:
                break

        return selected

    def _select_context_chunks(self, docs: List[Dict[str, Any]], retrieval_type: str, max_chars: int = 5200) -> List[Dict[str, Any]]:
        limits = {"FACTOID": 3, "VERIFICATION": 5, "EXPLORATORY": 7}
        max_n = limits.get(retrieval_type, 5)

        chosen = []
        total = 0
        for d in docs:
            c = (d.get("content") or "").strip()
            if not c:
                continue
            c_len = len(c)
            if total + c_len > max_chars and chosen:
                continue
            chosen.append(d)
            total += c_len
            if len(chosen) >= max_n:
                break
        return chosen

    @staticmethod
    def _extract_entities_from_docs(docs: List[Dict[str, Any]]) -> List[str]:
        text = " ".join((d.get("content") or "")[:600] for d in docs)
        # simple proper noun extractor
        cands = re.findall(r"\b[A-Z][a-zA-Z0-9\-\+]{2,}\b", text)
        uniq = []
        seen = set()
        for c in cands:
            lc = c.lower()
            if lc in seen:
                continue
            seen.add(lc)
            uniq.append(c)
        return uniq[:10]

    @staticmethod
    def _extract_ordered_items(docs: List[Dict[str, Any]]) -> List[str]:
        items = []
        for d in docs:
            txt = d.get("content") or ""
            # pick list-like lines
            for line in txt.splitlines():
                line = line.strip("-• ").strip()
                if 4 <= len(line) <= 80 and any(k in line.lower() for k in ("project", "intern", "cert", "skill", "bootcamp")):
                    items.append(line)
        # dedup preserve order
        out = []
        seen = set()
        for it in items:
            k = it.lower()
            if k not in seen:
                seen.add(k)
                out.append(it)
        return out[:10]

    # -------------------------------------------------------------------------
    # Generation + citation
    # -------------------------------------------------------------------------

    async def _generate(
        self,
        query: str,
        chunks: List[Dict[str, Any]],
        retrieval_type: str,
        topic: Optional[str],
        ctx: Dict[str, Any],
        max_tokens: int,
    ) -> Tuple[str, List[str], float]:

        emoji = {
            "contact": "📧", "skills": "🛠️", "projects": "💻", "education": "🎓",
            "experience": "💼", "personal": "👤", "research": "📄"
        }.get(topic or "", "📋")

        # Build context with chunk IDs
        context_parts = []
        for i, d in enumerate(chunks, start=1):
            cid = f"C{i}"
            d["_cid"] = cid
            snippet = (d.get("content") or "").strip()
            context_parts.append(f"[{cid}] {snippet}")
        context = "\n\n".join(context_parts)

        if retrieval_type == "FACTOID":
            task_rule = f"Answer in 2-3 sentences. Start with {emoji} if relevant."
        elif retrieval_type == "VERIFICATION":
            task_rule = "Provide precise proof-style answer with concrete details from context."
        else:
            task_rule = f"Use short heading + bullets if needed. Start with {emoji}. Cover each asked part."

        system = f"""
You answer using ONLY provided context chunks.
Never guess. If missing info, say it briefly.
Use third person for Adil.
{_PERSPECTIVE_RULES}
{_FORMATTING_RULES}
{task_rule}

At the end, add one short line:
CITATIONS: [C#], [C#]
(Only include chunk IDs actually used.)
"""

        user_name = ctx.get("user_name")
        uname = f"User name: {user_name}\n" if user_name else ""
        user = f"{uname}Query: {query}\n\nContext chunks:\n{context}"

        try:
            resp = await self.groq_client.chat.completions.create(
                model=settings.GROQ_MODEL_EN,
                messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
                temperature=0.1,
                max_tokens=max_tokens,
            )
            txt = (resp.choices[0].message.content or "").strip()
        except Exception as exc:
            logger.error(f"Generation error: {exc}")
            return get_fallback_answer(query), ["📎 Offline mode"], 0.3

        answer, citation_ids = self._split_citations(txt)
        sources = self._map_citations_to_sources(citation_ids, chunks)

        grounded_ratio = min(1.0, len(citation_ids) / max(1, min(4, len(chunks))))
        if not sources:
            # fallback source list
            sources = [self._safe_source_label(d, i + 1) for i, d in enumerate(chunks[:2])]

        return answer, sources, grounded_ratio

    @staticmethod
    def _split_citations(text: str) -> Tuple[str, List[str]]:
        lines = text.splitlines()
        cite_line_idx = None
        for i in range(len(lines) - 1, -1, -1):
            if lines[i].strip().lower().startswith("citations:"):
                cite_line_idx = i
                break

        if cite_line_idx is None:
            return text.strip(), []

        ans = "\n".join(lines[:cite_line_idx]).strip()
        line = lines[cite_line_idx]
        ids = re.findall(r"\[(C\d+)\]", line, flags=re.I)
        ids = [x.upper() for x in ids]
        # dedup order
        seen = set()
        ordered = []
        for x in ids:
            if x not in seen:
                seen.add(x)
                ordered.append(x)
        return ans, ordered

    def _map_citations_to_sources(self, citation_ids: List[str], chunks: List[Dict[str, Any]]) -> List[str]:
        id_to_doc = {d.get("_cid"): d for d in chunks if d.get("_cid")}
        out = []
        for cid in citation_ids:
            d = id_to_doc.get(cid)
            if d:
                out.append(self._safe_source_label(d, int(cid[1:])))
        # dedup
        seen = set()
        fin = []
        for s in out:
            if s not in seen:
                seen.add(s)
                fin.append(s)
        return fin

    @staticmethod
    def _safe_source_label(doc: Dict[str, Any], idx: int) -> str:
        src = str(doc.get("source") or doc.get("id") or f"chunk_{idx}")
        return f"📚 {src}"

    # -------------------------------------------------------------------------
    # Confidence & fallback
    # -------------------------------------------------------------------------

    @staticmethod
    def _confidence(max_score: float, num_docs: int, grounded_ratio: float) -> float:
        # weighted confidence: retrieval strength + support count + grounding
        retrieval_part = min(1.0, max_score)
        support_part = min(1.0, num_docs / 5.0)
        conf = 0.50 * retrieval_part + 0.20 * support_part + 0.30 * grounded_ratio
        return round(max(0.25, min(0.96, conf)), 2)

    @staticmethod
    def _no_info_response(topic: Optional[str]) -> Dict[str, Any]:
        ts = topic.replace("_", " ") if topic else "that"
        choices = [
            f"I don't have verified details about {ts} in Adil's portfolio yet.",
            f"I couldn't find reliable context for {ts}.",
            f"There isn't enough grounded information for {ts} right now.",
        ]
        return {
            "answer": random.choice(choices) + " You can ask about projects, skills, education, experience, or contact info.",
            "sources": [],
            "query_type": "no_info",
            "confidence": 0.30,
        }

# -----------------------------------------------------------------------------
# Backward-compatibility shim
# -----------------------------------------------------------------------------

def classify_query_type(query: str) -> str:
    return _IntentClassifier().classify(query).get("retrieval_type", "FACTOID")