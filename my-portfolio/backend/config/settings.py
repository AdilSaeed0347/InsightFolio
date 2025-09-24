"""
Configuration settings for portfolio backend
"""
import os
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Portfolio RAG Chatbot"
    VERSION: str = "1.0.0"
    
    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # CORS Configuration
    ALLOWED_ORIGINS: List[str] = os.getenv(
        "ALLOWED_ORIGINS", 
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080"
    ).split(",")
    
    # Groq Configuration - Updated for Llama 4
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    
    # Updated models - now using Llama 4 Scout from your .env file
    GROQ_MODEL_EN: str = os.getenv("GROQ_MODEL_EN", "meta-llama/llama-4-scout-17b-16e-instruct")
    GROQ_MODEL_UR: str = os.getenv("GROQ_MODEL_UR", "meta-llama/llama-4-scout-17b-16e-instruct")
    
    # General fallback model (used in /health, / root, etc.) - updated to use GROQ_MODEL_EN
    GROQ_MODEL_NAME: str = os.getenv("GROQ_MODEL_EN", "meta-llama/llama-4-scout-17b-16e-instruct")
    
    GROQ_TEMPERATURE: float = float(os.getenv("GROQ_TEMPERATURE", 0.2))
    GROQ_MAX_TOKENS: int = int(os.getenv("GROQ_MAX_TOKENS", 500))
    
    # RAG Configuration
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    RETRIEVAL_TOP_K: int = int(os.getenv("RETRIEVAL_TOP_K", 5))
    MIN_SIMILARITY_SCORE: float = float(os.getenv("MIN_SIMILARITY_SCORE", 0.3))
    
    # Vector Store Configuration
    VECTOR_STORE_TYPE: str = os.getenv("VECTOR_STORE_TYPE", "faiss")
    VECTOR_STORE_PATH: str = os.getenv("VECTOR_STORE_PATH", "./rag/vectorstore/")
    
    # Memory Configuration
    MAX_CONVERSATION_TURNS: int = int(os.getenv("MAX_CONVERSATION_TURNS", 5))
    SESSION_CLEANUP_HOURS: int = int(os.getenv("SESSION_CLEANUP_HOURS", 24))
    
    # Safety Configuration
    MAX_QUERY_LENGTH: int = int(os.getenv("MAX_QUERY_LENGTH", 500))
    ENABLE_CONTENT_FILTERING: bool = os.getenv("ENABLE_CONTENT_FILTERING", "True").lower() == "true"
    
    # Logging Configuration
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.getenv("LOG_FILE", "logs/app.log")
    
    class Config:
        case_sensitive = True
        env_file = ".env"

# Global settings instance
settings = Settings()

# Validation
def validate_settings():
    """Validate critical settings"""
    if not settings.GROQ_API_KEY:
        raise ValueError("❌ GROQ_API_KEY is required! Get it from https://console.groq.com/")

    # Create necessary directories
    directories = ["logs", "rag/vectorstore", "rag/embeddings"]
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
    
    return True

# Run validation on import
validate_settings()


#last code run 