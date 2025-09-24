"""
Complete Intelligent RAG pipeline - UPDATED with image integration and query passing
"""
import asyncio
import logging
import time
import re
from typing import Dict, List, Any, Optional
from groq import AsyncGroq
from config.settings import settings
from services.memory import ConversationMemory
from services.formatter import ResponseFormatter
from utils.query_splitter import QuerySplitter
from rag.modules.retriever import UltraPreciseRetriever

logger = logging.getLogger(__name__)

class RAGPipeline:
    """Intelligent RAG pipeline with semantic understanding and clean responses - UPDATED"""
    
    def __init__(self):
        self.retriever = UltraPreciseRetriever()
        self.groq_client = None
        self.memory = ConversationMemory()
        self.formatter = ResponseFormatter()
        self.query_splitter = QuerySplitter()
        self.initialized = False
        self.conversation_context = {}

    async def initialize(self):
        """Initialize components"""
        try:
            self.groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)
            await self.retriever.initialize()
            self.initialized = True
            logger.info("RAG pipeline initialized")
        except Exception as e:
            logger.error(f"Failed to initialize: {e}")
            raise

    def _normalize_query(self, query: str) -> str:
        """Enhanced query normalization with typo fixes"""
        typo_fixes = {
            'adeel': 'adil', 'contct': 'contact', 'porjects': 'projects',
            'skils': 'skills', 'skill': 'skills', 'eduction': 'education', 
            'experiance': 'experience', 'mobil': 'mobile', 'phon': 'phone',
            'socila': 'social', 'mdeia': 'media', 'acounts': 'accounts',
            'linkedin': 'linkedin', 'github': 'github'
        }
        
        normalized = query.lower().strip()
        for typo, fix in typo_fixes.items():
            normalized = normalized.replace(typo, fix)
        
        return normalized

    def _analyze_query_semantics(self, query: str) -> Dict[str, Any]:
        """Analyze query for semantic meaning and synonyms"""
        normalized = self._normalize_query(query)
        
        # Semantic mappings - what the user REALLY wants
        semantic_map = {
            'social_media': ['social', 'media', 'links', 'profiles', 'accounts', 'platforms'],
            'contact_info': ['contact', 'reach', 'get in touch', 'find', 'connect', 'email'],
            'technical_skills': ['skills', 'technologies', 'programming', 'languages', 'tools', 'tech'],
            'projects_work': ['projects', 'work', 'built', 'developed', 'created', 'portfolio'],
            'education_background': ['education', 'study', 'university', 'degree', 'academic'],
            'professional_experience': ['experience', 'job', 'work', 'career', 'internship'],
            'personal_info': ['about', 'who is', 'tell me', 'background', 'story']
        }
        
        detected_intents = []
        for intent, keywords in semantic_map.items():
            if any(keyword in normalized for keyword in keywords):
                detected_intents.append(intent)
        
        return {
            'primary_intent': detected_intents[0] if detected_intents else 'general',
            'all_intents': detected_intents,
            'needs_comprehensive_search': len(detected_intents) > 0,
            'query_complexity': 'complex' if len(detected_intents) > 1 else 'simple'
        }

    def _is_adil_portfolio_query(self, query: str) -> bool:
        """Check if query is specifically about Adil's portfolio content"""
        normalized = self._normalize_query(query)
        
        portfolio_terms = [
            'adil', 'portfolio', 'projects', 'skills', 'education', 'experience',
            'contact', 'github', 'linkedin', 'university', 'degree', 'programming',
            'asad ali', 'sir ali imran', 'brother', 'mentor', 'giki', 'imsciences',
            'chatbot', 'ocr', 'internship', 'bootcamp', 'social', 'media'
        ]
        
        return any(term in normalized for term in portfolio_terms)

    def _is_general_knowledge(self, query: str) -> bool:
        """Detect general knowledge queries"""
        normalized = self._normalize_query(query)
        
        # Math
        if re.search(r'\d+\s*[\+\-\*\/]\s*\d+', normalized):
            return True
        
        # Clear general knowledge patterns
        general_patterns = [
            r'capital of', r'weather', r'temperature', r'president', r'prime minister',
            r'how to make', r'recipe', r'currency of', r'population of'
        ]
        
        is_general = any(re.search(pattern, normalized) for pattern in general_patterns)
        is_about_adil = any(term in normalized for term in ['adil', 'portfolio', 'his', 'him'])
        
        return is_general and not is_about_adil

    def _is_chatbot_personal_query(self, query: str) -> bool:
        """Detect chatbot personal queries"""
        normalized = self._normalize_query(query)
        
        personal_patterns = [
            r'what.*your name', r'who.*you', r'how old.*you', r'who created you',
            r'tell me about yourself', r'are you', r'what are you'
        ]
        
        return any(re.search(pattern, normalized) for pattern in personal_patterns)

    async def process_query(self, query: str, language: str = "en", session_id: str = None, 
                          conversation_history: List = None, user_context: Dict = None) -> Dict[str, Any]:
        """Process queries with intelligent semantic understanding - UPDATED with image support"""
        
        if not self.initialized:
            raise RuntimeError("Pipeline not initialized")
        
        start_time = time.time()
        
        try:
            # Route based on query type
            if self._is_chatbot_personal_query(query):
                response = await self._handle_chatbot_query(query)
            elif self._is_general_knowledge(query) and not self._is_adil_portfolio_query(query):
                response = await self._handle_general_query(query)
            else:
                response = await self._handle_adil_query_intelligent(query)
            
            # CRITICAL: Add original query to response for formatter
            response["original_query"] = query
            
            # Format response - UPDATED to handle images
            formatted = await self.formatter.format_response(response, language)
            formatted["processing_time"] = (time.time() - start_time) * 1000
            
            return formatted
            
        except Exception as e:
            logger.error(f"Processing error: {e}")
            return await self.formatter.format_response({
                "answer": "I'm experiencing technical difficulties. Please try again.",
                "sources": [], 
                "query_type": "error", 
                "confidence": 0.0,
                "original_query": query  # ADDED
            }, language)

    async def _handle_chatbot_query(self, query: str) -> Dict[str, Any]:
        """Handle chatbot personal queries briefly"""
        
        system_prompt = """You are Adil's portfolio assistant. Answer personal questions about yourself briefly (1 sentence) and redirect to Adil's portfolio."""

        try:
            response = await self.groq_client.chat.completions.create(
                model=settings.GROQ_MODEL_EN,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query}
                ],
                temperature=0.2,
                max_tokens=50
            )
            
            return {
                "answer": response.choices[0].message.content.strip(),
                "sources": [],
                "query_type": "chatbot",
                "confidence": 0.95
            }
            
        except Exception:
            return {
                "answer": "I'm Adil's portfolio assistant. Ask me about his projects or experience!",
                "sources": [],
                "query_type": "chatbot",
                "confidence": 0.9
            }

    async def _handle_general_query(self, query: str) -> Dict[str, Any]:
        """Handle general knowledge without portfolio attribution"""
        
        # Math
        math_match = re.search(r'(\d+)\s*[\+\-\*\/]\s*(\d+)', query)
        if math_match:
            try:
                result = eval(math_match.group(0))
                return {
                    "answer": f"🔢 The result is **{result}**.",
                    "sources": [],
                    "query_type": "math",
                    "confidence": 0.95
                }
            except:
                pass
        
        # General knowledge
        try:
            response = await self.groq_client.chat.completions.create(
                model=settings.GROQ_MODEL_EN,
                messages=[
                    {"role": "system", "content": "Answer general knowledge questions briefly and accurately. One sentence only."},
                    {"role": "user", "content": query}
                ],
                temperature=0.1,
                max_tokens=50
            )
            
            answer = response.choices[0].message.content.strip()
            return {
                "answer": f"🌍 {answer}",
                "sources": [],
                "query_type": "general",
                "confidence": 0.8
            }
            
        except Exception:
            return {
                "answer": "📋 I specialize in Adil's portfolio information. Ask about his projects, skills, or experience!",
                "sources": [],
                "query_type": "redirect",
                "confidence": 0.7
            }

    async def _handle_adil_query_intelligent(self, query: str) -> Dict[str, Any]:
        """Intelligent query handling with semantic understanding"""
        
        try:
            # Get query intent and semantic variations
            intent_info = self._analyze_query_semantics(query)
            
            # Multi-strategy retrieval based on semantic analysis
            docs = await self._intelligent_retrieval(query, intent_info)
            
            if not docs:
                return self._no_portfolio_info_response(query)
            
            # Generate intelligent response with clean formatting
            return await self._generate_intelligent_response(query, docs, intent_info)
            
        except Exception as e:
            logger.error(f"Intelligent query error: {e}")
            return {
                "answer": "Information temporarily unavailable.",
                "sources": [],
                "query_type": "error",
                "confidence": 0.5
            }

    async def _intelligent_retrieval(self, query: str, intent_info: Dict) -> List[Dict]:
        """Multi-strategy retrieval based on semantic understanding"""
        
        all_docs = []
        primary_intent = intent_info['primary_intent']
        
        # Primary retrieval
        docs = await self.retriever.hybrid_retrieve(query=query, top_k=4)
        all_docs.extend(docs)
        
        # Intent-specific additional searches
        if primary_intent == 'social_media':
            searches = [
                "github linkedin facebook social contact",
                "adilsaeed047 profiles networking platforms",
                "email social media accounts online"
            ]
        elif primary_intent == 'technical_skills':
            searches = [
                "programming languages python javascript",
                "technical skills technologies tools",
                "ai machine learning frameworks"
            ]
        elif primary_intent == 'projects_work':
            searches = [
                "projects portfolio development work",
                "built created applications systems",
                "chatbot ocr machine learning"
            ]
        elif primary_intent == 'contact_info':
            searches = [
                "email contact adilsaeed047",
                "github linkedin profiles",
                "professional networking"
            ]
        elif primary_intent == 'education_background':
            searches = [
                "education university degree imsciences",
                "academic background study",
                "giki bootcamp training"
            ]
        elif primary_intent == 'professional_experience':
            searches = [
                "experience internship work job",
                "microsoft learn student ambassador",
                "professional career"
            ]
        else:
            searches = ["adil saeed background information"]
        
        # Execute additional searches
        for search_query in searches:
            extra_docs = await self.retriever.hybrid_retrieve(query=search_query, top_k=2)
            all_docs.extend(extra_docs)
        
        # Remove duplicates and return best results
        seen_ids = set()
        unique_docs = []
        for doc in all_docs:
            doc_id = doc.get('id', '')
            if doc_id not in seen_ids and doc.get('retrieval_score', 0) > 0.2:
                seen_ids.add(doc_id)
                unique_docs.append(doc)
        
        return sorted(unique_docs, key=lambda x: x.get('retrieval_score', 0), reverse=True)[:8]

    async def _generate_intelligent_response(self, query: str, docs: List[Dict], intent_info: Dict) -> Dict[str, Any]:
        """Generate intelligent, well-formatted responses"""
        
        # Build comprehensive context
        context = "\n\n".join([doc.get('content', '') for doc in docs[:6]])
        
        intent = intent_info['primary_intent']
        emoji_map = {
            'social_media': '🔗',
            'contact_info': '📧',
            'technical_skills': '🛠️',
            'projects_work': '💻',
            'education_background': '🎓',
            'professional_experience': '💼',
            'personal_info': '👨‍💻',
            'general': '📋'
        }
        emoji = emoji_map.get(intent, '📋')
        
        # Intelligent system prompt - NO "Adil Saeed is" nonsense
        system_prompt = f"""You are Adil's portfolio assistant. Create a natural, intelligent response.

CRITICAL FORMATTING RULES:
1. NEVER start with "Adil Saeed is" - it's terrible formatting
2. Start directly with {emoji} and a clean, relevant heading
3. Use ONLY information from the provided context
4. For social media queries: Recognize GitHub, LinkedIn, Facebook AS social media platforms
5. For skills queries: Be comprehensive and organized
6. For project queries: Show variety and detail
7. Use bullet points and clear structure
8. Third person (Adil, his, he)
9. Be intelligent about connecting available information to user intent
10. If context has relevant info, present it comprehensively

QUERY INTENT: {intent}
RESPONSE STYLE: Professional but conversational"""

        # Adjust response length based on query complexity
        max_tokens = 400 if intent_info['query_complexity'] == 'complex' else 300

        user_prompt = f"Query: '{query}'\n\nContext:\n{context}\n\nCreate a comprehensive, well-formatted response that intelligently addresses what the user is asking for."

        try:
            response = await self.groq_client.chat.completions.create(
                model=settings.GROQ_MODEL_EN,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                max_tokens=max_tokens
            )
            
            answer = response.choices[0].message.content.strip()
            
            # Clean up common formatting issues
            answer = re.sub(r'^Adil Saeed is\s*', '', answer)
            answer = re.sub(r'\bI am\b', 'Adil is', answer)
            answer = re.sub(r'\bmy\b', "Adil's", answer, flags=re.IGNORECASE)
            
            return {
                "answer": answer,
                "sources": ["📚 Adil_Data"],
                "query_type": intent,
                "confidence": 0.9
            }
            
        except Exception as e:
            logger.error(f"Response generation error: {e}")
            return {
                "answer": f"Technical issue occurred while processing query about {intent.replace('_', ' ')}.",
                "sources": [],
                "query_type": "error",
                "confidence": 0.5
            }

    def _no_portfolio_info_response(self, query: str) -> Dict[str, Any]:
        """Response when no portfolio info is found"""
        return {
            "answer": f"📋 I don't have specific information about '{query}' in Adil's portfolio. You can ask about his projects, education, skills, experience, or contact information.",
            "sources": [],
            "query_type": "no_info",
            "confidence": 0.6
        }

    def _classify_intent(self, query: str) -> str:
        """Classify intent for appropriate processing"""
        normalized = self._normalize_query(query)
        
        if any(word in normalized for word in ['project', 'built', 'developed', 'portfolio']):
            return 'projects'
        elif any(word in normalized for word in ['skills', 'programming', 'language', 'technology']):
            return 'skills'
        elif any(word in normalized for word in ['education', 'university', 'degree', 'academic']):
            return 'education'
        elif any(word in normalized for word in ['experience', 'work', 'job', 'internship']):
            return 'experience'
        elif any(word in normalized for word in ['contact', 'email', 'linkedin', 'github', 'social']):
            return 'contact'
        elif any(word in normalized for word in ['asad', 'brother', 'sir ali', 'personal']):
            return 'personal'
        else:
            return 'general'

    async def refresh_data(self):
        """Refresh the retriever data when Adil.txt is updated"""
        try:
            logger.info("Refreshing retriever data...")
            await self.retriever.initialize()
            logger.info("Data refreshed successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to refresh data: {e}")
            return False