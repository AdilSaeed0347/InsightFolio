my-portfolio/
│
├── backend/
│   ├── config/
│   │   └── settings.py   # Backend configuration (env vars, DB, API keys, etc.)
|   |---prompts.py           
│   │
│   ├── routes/
│   │   └── chat.py                  # API endpoints for chatbot (FastAPI/Flask)
│   │
│   ├── services/
│   │   ├── rag_pipeline.py          # Orchestrator: query → retrieve → LLM → response
│   │   ├── dynamic_query_processor.py # Handles out-of-scope queries (e.g., capital of Pakistan)
│   │   ├── memory.py                # Stores last 2–5 turns, resolves context
│   │   ├── formatter.py             # Formats response (headings, summary, clickable links in blue)
│   │   └── safety.py                # Detects harmful/sensitive intent
│   │
│   ├── utils/
│   │   ├── text_preproc.py          # Spell-fix, synonym handling, coreference resolution
│   │   └── query_splitter.py        # Splits multi-intent queries (e.g., "Who is Adil + his projects")
│   │
│   └── main.py                      # Entry point: starts API server
│
├── frontend/
│   ├── documents/
│   │   └── images1.png
│   │
│   ├── components/                  # Reusable UI components
│   │   └── Footer.html
│   │
│   ├── pages/                       # Page-level HTML
│   │   ├── home.html
│   │   ├── index.html
│   │   ├── projects.html
│   │   └── contact.html
│   │
│   ├── styles/                      # CSS stylesheets
│   │   ├── global.css
│   │   ├── home.css
│   │   ├── projects.css
│   │   ├── contact.css
│   │   └── chatbot.css
│   │
│   └── utils/                       # Frontend scripts
│   |   ├── chatbot.js               # Chatbot UI + streaming text effect
│   |   ├── home.js
│   |   ├── projects.js
│   |   ├── contact.js
│   |   └── common.js
│   |
│   └── package.json                 # Frontend dependencies
│
├── rag/
│   ├── embeddings/                  # Stores generated embeddings
│   ├── modules/
│   │   └── retriever.py             # Retriever logic (FAISS/Chroma, semantic search)
│   ├── vectorstore/
|       |---bm25.json
│   │   └── documents.json           # Vector DB store
│   └── documents/
│       └── Adil.txt                 # Source personal info/documents
|       |---images/
|           |---giki_bootcamp_2024.png
|           |---28 more images
│
├── venv/                            # Python virtual environment (ignored in git)
│
├── requirements.txt                 # Backend Python dependencies
├── retriever.log                    # Logs for retrieval process
├── app.log                          # Logs for app runtime
├── rag.log                          # Logs for RAG pipeline
├── .gitignore                       # Ignore venv, logs, secrets
├── .env                             # API keys, secrets
└── README.md                        # Project documentation



## 🚀 How to Run the Project

### 1️⃣ Start the Frontend
Navigate to the frontend folder and run:
```powershell

PS C:\Users\HP\Desktop\my-portfolio\my-portfolio\frontend> npm start
PS C:\Users\HP\Desktop\my-portfolio> cd my-portfolio
.\venv\Scripts\Activate
PS C:\Users\HP\Desktop\my-portfolio> cd backend
C:\Users\HP\Desktop\my-portfolio\backend> uvicorn main:app --host 127.0.0.1 --port 8000 --reload




# Portfolio RAG Chatbot

An intelligent AI-powered portfolio assistant that provides comprehensive information about Adil Saeed's professional background using advanced Retrieval Augmented Generation (RAG) techniques.

## Overview

This project implements a sophisticated RAG-based chatbot system that serves as an intelligent portfolio assistant. The system combines modern NLP techniques with a clean web interface to deliver accurate, contextual responses about projects, skills, education, and professional experience.

## Key Features

- **Intelligent Query Processing**: Multi-intent query splitting and semantic understanding
- **Advanced RAG Pipeline**: Hybrid retrieval with FAISS vector search and BM25 keyword matching
- **Dynamic Query Handling**: Out-of-scope query processing for general knowledge questions
- **Context-Aware Memory**: Multi-turn conversation support with contextual understanding
- **Professional Response Formatting**: Clean presentation with clickable links and structured content
- **Content Safety**: Comprehensive input validation and harmful content detection
- **Real-time Communication**: Streaming responses with typing indicators
- **Voice Input Support**: Speech-to-text functionality for hands-free interaction
- **Responsive Web Interface**: Multi-page portfolio website with integrated chatbot

## Technical Architecture

### Backend Components

#### Configuration Layer (`backend/config/`)
- **`settings.py`**: Centralized configuration management for environment variables, API keys, database connections, and system parameters
- **`prompts.py`**: Structured prompt templates and system instructions for different query types and response formats

#### API Layer (`backend/routes/`)
- **`chat.py`**: FastAPI endpoints for chatbot interactions, health checks, and API documentation with comprehensive request/response validation

#### Core Services (`backend/services/`)
- **`rag_pipeline.py`**: Main orchestrator that coordinates query processing, document retrieval, LLM generation, and response formatting
- **`dynamic_query_processor.py`**: Handles out-of-scope queries (general knowledge, calculations, weather) with intelligent routing
- **`memory.py`**: Conversation memory management storing 2-5 recent turns with context resolution and session management
- **`formatter.py`**: Response post-processing including heading generation, clickable link injection, and professional formatting
- **`safety.py`**: Content moderation detecting harmful intent, inappropriate queries, and security threats

#### Utility Functions (`backend/utils/`)
- **`text_preproc.py`**: Advanced text preprocessing with spell correction, synonym expansion, and coreference resolution
- **`query_splitter.py`**: Multi-intent query parsing that splits complex queries like "Who is Adil and what are his projects?"

#### Application Entry Point
- **`main.py`**: FastAPI application initialization, middleware configuration, and server startup

### Frontend Components

#### Static Assets (`frontend/documents/`)
- **`images.png`**: Portfolio images, project screenshots, and visual assets

#### Reusable Components (`frontend/components/`)
- **`Footer.html`**: Consistent footer component with contact links and social media

#### Page Structure (`frontend/pages/`)
- **`home.html`**: Landing page with portfolio overview and chatbot integration
- **`index.html`**: Main entry point with navigation and layout structure
- **`projects.html`**: Project showcase with detailed descriptions and live demos
- **`contact.html`**: Contact form and professional networking information

#### Styling (`frontend/styles/`)
- **`global.css`**: Base styles, typography, color schemes, and responsive grid system
- **`home.css`**: Home page specific styling and animations
- **`projects.css`**: Project gallery layouts and interactive elements
- **`contact.css`**: Contact form styling and validation indicators
- **`chatbot.css`**: Chatbot interface styling with modern chat UI patterns

#### Interactive Scripts (`frontend/utils/`)
- **`chatbot.js`**: Complete chatbot implementation with streaming text effects, voice input, and conversation management
- **`home.js`**: Home page interactions, animations, and dynamic content loading
- **`projects.js`**: Project filtering, sorting, and interactive demonstrations
- **`contact.js`**: Contact form validation, submission handling, and user feedback
- **`common.js`**: Shared utilities, navigation handling, and cross-page functionality

#### Package Management
- **`package.json`**: Frontend dependencies for development tools, build processes, and deployment

### RAG System (`rag/`)

#### Embedding Storage (`rag/embeddings/`)
- Cached sentence embeddings for efficient similarity search
- Vector representations of document chunks with metadata

#### Retrieval Engine (`rag/modules/`)
- **`retriever.py`**: Hybrid search implementation combining FAISS vector similarity with BM25 keyword matching, including semantic chunking and context expansion

#### Vector Database (`rag/vectorstore/`)
- **`documents.json`**: Processed document chunks with embeddings, metadata, and retrieval scores

#### Source Documents (`rag/documents/`)
- **`Adil.txt`**: Comprehensive portfolio information including projects, skills, education, experience, and personal background

## Project Structure Details

```
my-portfolio/
│
├── backend/                         # Python FastAPI backend
│   ├── config/
│   │   ├── settings.py             # Environment configuration
│   │   └── prompts.py              # LLM prompt templates
│   ├── routes/
│   │   └── chat.py                 # API endpoints
│   ├── services/
│   │   ├── rag_pipeline.py         # Main RAG orchestrator
│   │   ├── dynamic_query_processor.py # Out-of-scope handling
│   │   ├── memory.py               # Conversation memory
│   │   ├── formatter.py            # Response formatting
│   │   └── safety.py               # Content safety
│   ├── utils/
│   │   ├── text_preproc.py         # Text preprocessing
│   │   └── query_splitter.py       # Query parsing
│   └── main.py                     # Application entry
│
├── frontend/                        # Static web frontend
│   ├── documents/
│   │   └── images.png              # Visual assets
│   ├── components/
│   │   └── Footer.html             # Reusable components
│   ├── pages/
│   │   ├── home.html               # Landing page
│   │   ├── index.html              # Main entry
│   │   ├── projects.html           # Project showcase
│   │   └── contact.html            # Contact information
│   ├── styles/
│   │   ├── global.css              # Base styling
│   │   ├── home.css                # Home page styles
│   │   ├── projects.css            # Project page styles
│   │   ├── contact.css             # Contact page styles
│   │   └── chatbot.css             # Chatbot interface
│   ├── utils/
│   │   ├── chatbot.js              # Chatbot functionality
│   │   ├── home.js                 # Home interactions
│   │   ├── projects.js             # Project features
│   │   ├── contact.js              # Contact form
│   │   └── common.js               # Shared utilities
│   └── package.json                # Dependencies
│
├── rag/                             # RAG system components
│   ├── embeddings/                 # Vector embeddings cache
│   ├── modules/
│   │   └── retriever.py            # Hybrid search engine
│   ├── vectorstore/
│   │   └── documents.json          # Processed chunks
│   └── documents/
│       └── Adil.txt                # Source portfolio data
│
├── venv/                           # Python virtual environment
├── requirements.txt                # Python dependencies
├── retriever.log                   # Retrieval system logs
├── app.log                         # Application runtime logs
├── rag.log                         # RAG pipeline logs
├── .gitignore                      # Version control exclusions
├── .env                            # Environment variables
└── README.md                       # Documentation
```

## Installation Guide

### Prerequisites
- Python 3.8+
- Node.js 14+ (for frontend development)
- Groq API key
- Git

### 1. Repository Setup
```bash
git clone https://github.com/AdilSaeed0347/my-portfolio
cd my-portfolio
```

### 2. Backend Configuration
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys and settings
```

### 3. Environment Variables (.env)
```env
# Groq API Configuration
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL_EN=llama-3.1-70b-versatile
GROQ_MODEL_UR=llama-3.1-70b-versatile

# Server Configuration
HOST=127.0.0.1
PORT=8000
DEBUG=True
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# RAG Configuration
EMBEDDING_MODEL=all-MiniLM-L6-v2
RETRIEVAL_TOP_K=5
MIN_SIMILARITY_SCORE=0.25
MAX_CONVERSATION_TURNS=5

# Logging Configuration
LOG_LEVEL=INFO
LOG_FILE=logs/app.log
```

### 4. Frontend Setup
```bash
cd frontend
npm install  # Install frontend dependencies
```

### 5. Launch Application

**Backend Server:**
```bash
cd backend
python main.py
# Server starts at http://127.0.0.1:8000
```

**Frontend Development Server:**
```bash
cd frontend
npm start
# Or use Python: python -m http.server 3000
# Frontend available at http://localhost:3000
```

## Usage Examples

### Portfolio Questions
- "Tell me about Adil's background"
- "What projects has Adil worked on?"
- "What are Adil's technical skills?"
- "Show me Adil's educational qualifications"

### Contact and Social Media
- "How can I contact Adil?"
- "What are Adil's social media profiles?"
- "Where can I find Adil's GitHub?"

### Complex Queries
- "Who is Adil and what are his main projects?" (Multi-intent)
- "Compare Adil's AI projects with his web development work"
- "Tell me about Adil's experience and education background"

### Voice Interaction
Click the microphone button in the chatbot interface to use speech-to-text functionality.

## System Architecture

### RAG Pipeline Flow
1. **Query Input**: User submits question via web interface
2. **Preprocessing**: Text normalization, spell correction, intent detection
3. **Query Splitting**: Multi-intent queries separated into components
4. **Retrieval**: Hybrid search across document chunks using vector similarity and keyword matching
5. **Context Assembly**: Relevant chunks combined with conversation history
6. **Generation**: LLM processes context to generate response
7. **Post-processing**: Response formatted with links, headings, and structure
8. **Delivery**: Streaming response sent to frontend with typing animation

### Memory Management
- **Session-based**: Each user gets isolated conversation context
- **Turn Limit**: Maintains last 2-5 conversation turns
- **Context Resolution**: Handles pronouns and references to previous messages
- **Cleanup**: Automatic session expiry and memory management

### Safety Pipeline
- **Input Validation**: Length limits, character filtering, injection prevention
- **Content Moderation**: Harmful keyword detection with context awareness
- **Rate Limiting**: Request throttling and abuse prevention
- **Error Handling**: Graceful degradation with informative error messages

## API Documentation

### POST /api/v1/chat
Main chatbot interaction endpoint.

**Request:**
```json
{
    "query": "What are Adil's programming skills?",
    "language": "en",
    "session_id": "session_123456789",
    "timestamp": "2024-01-01T12:00:00Z",
    "conversation_history": [
        {
            "role": "user",
            "content": "Tell me about Adil",
            "timestamp": "2024-01-01T11:59:00Z"
        }
    ]
}
```

**Response:**
```json
{
    "answer": "🛠️ **Technical Skills**\n\nAdil has expertise in:\n• **Programming Languages:** Python, JavaScript, Java, HTML, CSS, SQL\n• **AI/ML Technologies:** Machine Learning, Deep Learning, NLP, Computer Vision\n• **Frameworks:** TensorFlow, PyTorch, React, Django, Flask\n• **Tools:** Git/GitHub, Docker, FAISS, HuggingFace",
    "sources": ["📚 Adil_Data"],
    "query_type": "skills",
    "confidence": 0.95,
    "processing_time": 1247.5,
    "session_id": "session_123456789"
}
```

### GET /api/v1/chat/health
System health check with component status.

### GET /api/v1/chat/stats
Usage statistics and system metrics.

## Customization Guide

### Adding New Content
1. **Update Source Data**: Edit `rag/documents/Adil.txt`
2. **Restart Backend**: System automatically rebuilds vector index
3. **Test Queries**: Verify new content is retrievable

### Modifying Response Style
Update prompts in `backend/config/prompts.py`:
```python
PORTFOLIO_SYSTEM_PROMPT = """
Your custom system instructions here...
Include formatting requirements, tone, structure preferences.
"""
```

### Adding New Page Types
1. **Create HTML**: Add new page to `frontend/pages/`
2. **Add Styles**: Create corresponding CSS in `frontend/styles/`
3. **Add Scripts**: Implement page logic in `frontend/utils/`
4. **Update Navigation**: Modify common components

### Extending Safety Rules
Modify `backend/services/safety.py`:
```python
harmful_patterns = [
    r'\bnew_harmful_pattern\b',
    # Add custom safety rules
]
```

## Performance Optimization

### Backend Optimizations
- **Vector Caching**: FAISS index loaded once at startup
- **Connection Pooling**: Efficient Groq API connections
- **Memory Management**: Conversation cleanup and session management
- **Async Processing**: Non-blocking I/O operations

### Frontend Optimizations
- **Lazy Loading**: Components loaded on demand
- **Response Streaming**: Real-time message display
- **Local Storage**: Persistent conversation history
- **Debounced Input**: Optimized user input handling

### Production Deployment
- **Environment**: Set `DEBUG=False` for production
- **Server**: Use Gunicorn or Uvicorn for WSGI
- **Reverse Proxy**: Nginx for static files and load balancing
- **SSL**: HTTPS encryption for secure communication
- **Monitoring**: Log aggregation and performance metrics

## Logging and Monitoring

### Log Files
- **`app.log`**: General application events and errors
- **`rag.log`**: RAG pipeline operations and performance
- **`retriever.log`**: Document retrieval and search operations

### Monitoring Metrics
- Query processing time
- Retrieval accuracy scores
- User session analytics
- Error rates and types
- API response times

## Testing

### Unit Tests
```bash
cd backend
python -m pytest tests/
```

### Integration Tests
```bash
# Test API endpoints
python -m pytest tests/integration/

# Test RAG pipeline
python -m pytest tests/rag/
```

### Frontend Testing
```bash
cd frontend
npm test
```

## Deployment Options

### Local Development
```bash
# Backend
cd backend && python main.py

# Frontend
cd frontend && npm start
```

### Production Server
```bash
# Using Gunicorn
cd backend
gunicorn main:app --host 0.0.0.0 --port 8000 --workers 4

# Serve frontend with Nginx or Apache
```

### Docker Deployment
```bash
# Build and run
docker build -t portfolio-chatbot .
docker run -p 8000:8000 --env-file .env portfolio-chatbot
```

## Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Follow coding standards and add tests
4. Update documentation
5. Submit pull request with detailed description

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support and Contact

- **Email**: adilsaeed047@gmail.com
- **GitHub**: https://github.com/AdilSaeed0347
- **LinkedIn**: Professional networking and support
- **Issues**: Use GitHub Issues for bug reports and feature requests

## Acknowledgments

- **Groq**: High-performance LLM API
- **FAISS**: Efficient similarity search
- **SentenceTransformers**: Quality text embeddings
- **FastAPI**: Modern Python web framework
- **Community**: Open-source contributors and supporters

---

**Project**: Portfolio RAG Chatbot  
**Developer**: Adil Saeed  
**Version**: 2.0.0  
**Last Updated**: January 2025
