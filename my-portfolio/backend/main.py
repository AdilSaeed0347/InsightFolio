"""
FastAPI application for Adil Saeed's Portfolio RAG Chatbot
Powered by Groq API (Llama-3 / Mixtral models)
"""

import logging
import uvicorn

import time
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Fix Unicode encoding for Windows console
import os
import sys

# Windows-compatible UTF-8 setup
if os.name == 'nt':  # Windows
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from config.settings import settings, validate_settings

# ----------------- Logging Setup -----------------
def setup_logging():
    """Setup logging for the app with UTF-8 support"""
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    # Create custom formatter that handles Unicode
    class UnicodeFormatter(logging.Formatter):
        def format(self, record):
            try:
                return super().format(record)
            except UnicodeEncodeError:
                # Fallback: replace problematic characters
                record.msg = str(record.msg).encode('ascii', 'replace').decode('ascii')
                return super().format(record)

    formatter = UnicodeFormatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    
    # File handler with UTF-8 encoding
    file_handler = logging.FileHandler(settings.LOG_FILE, encoding='utf-8')
    file_handler.setFormatter(formatter)
    
    # Stream handler with UTF-8 encoding
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    
    logging.basicConfig(
        level=getattr(logging, settings.LOG_LEVEL, logging.INFO),
        handlers=[file_handler, stream_handler],
    )

setup_logging()
logger = logging.getLogger(__name__)

# ----------------- Lifespan -----------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """App startup and shutdown lifecycle"""

    logger.info("🚀 Starting Portfolio RAG Chatbot...")
    startup_start = time.time()

    try:
        # Validate settings
        validate_settings()

        if not settings.GROQ_API_KEY:
            raise ValueError("❌ GROQ_API_KEY is missing! Please check your .env file")

        logger.info(f"✅ Using Groq model: {settings.GROQ_MODEL_NAME}")

        # Initialize RAG pipeline
        from services.rag_pipeline import RAGPipeline
        rag_pipeline = RAGPipeline()
        await rag_pipeline.initialize()
        app.state.rag_pipeline = rag_pipeline

        logger.info("📚 RAG pipeline initialized successfully")

        # Startup summary
        startup_time = (time.time() - startup_start) * 1000
        logger.info("=" * 50)
        logger.info("🌐 PORTFOLIO RAG CHATBOT READY")
        logger.info(f"Startup Time: {startup_time:.2f}ms")
        logger.info(f"Server: http://{settings.HOST}:{settings.PORT}")
        logger.info(f"API: http://{settings.HOST}:{settings.PORT}{settings.API_V1_STR}/chat")
        logger.info("=" * 50)

    except Exception as e:
        logger.error(f"🔥 Startup failed: {e}", exc_info=True)
        raise

    yield

    logger.info("🛑 Shutting down application...")

# ----------------- FastAPI App -----------------
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="RAG-powered chatbot for Adil Saeed's portfolio",
    version=settings.VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# ----------------- CORS -----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Middleware -----------------
@app.middleware("http")
async def add_request_timing(request: Request, call_next):
    """Track request processing time"""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}"
    return response

# ----------------- Routes -----------------
from routes.chat import router as chat_router
app.include_router(chat_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Portfolio RAG Chatbot API",
        "version": settings.VERSION,
        "status": "running",
        "groq_model": settings.GROQ_MODEL_NAME,
        "features": [
            "ultra_precise_rag",
            "contextual_emojis",
            "blue_social_links",
            "conversation_memory",
            "multilingual_support",
        ],
        "endpoints": {
            "chat": f"{settings.API_V1_STR}/chat",
            "health": f"{settings.API_V1_STR}/health",
            "stats": f"{settings.API_V1_STR}/chat/stats",
        },
    }

@app.get("/health")
async def health_check():
    """System health check"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "groq_configured": bool(settings.GROQ_API_KEY),
        "debug_mode": settings.DEBUG,
    }

# ----------------- Global Exception Handler -----------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle uncaught errors globally"""
    logger.error(f"Global exception on {request.method} {request.url.path}: {str(exc)}", exc_info=True)

    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "timestamp": time.time(),
            "path": str(request.url.path),
        },
    )

# ----------------- Run -----------------
if __name__ == "__main__":
    logger.info("Starting server directly...")
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )