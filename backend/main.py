import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("enterprise_ai.main")

from backend.database.connection import init_db, get_session
from backend.models.document import DocumentRecord
from backend.services.document_processor import (
    chunk_and_index_document,
    get_collection_count
)
from backend.api import auth, chat, documents, tickets, settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize Database Tables and Default Users
    logger.info("Initializing Enterprise Database...")
    init_db()

    # 2. Check if Knowledge Base is populated, otherwise index sample policies
    docs_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "documents"))
    existing_chunks = get_collection_count()
    logger.info(f"Existing ChromaDB vector chunks count: {existing_chunks}")

    if existing_chunks == 0 and os.path.exists(docs_dir):
        logger.info("Indexing initial enterprise policy documents...")
        db = get_session()
        try:
            for fname in os.listdir(docs_dir):
                if fname.endswith(".pdf"):
                    fpath = os.path.join(docs_dir, fname)
                    try:
                        res = chunk_and_index_document(fpath, fname)
                        chunks = res.get("chunks_indexed", 0)
                        rec = DocumentRecord(
                            filename=fname,
                            file_path=fpath,
                            file_type="pdf",
                            file_size_bytes=os.path.getsize(fpath),
                            chunk_count=chunks,
                            uploaded_by="System Setup",
                            status="INDEXED"
                        )
                        db.add(rec)
                        db.commit()
                        logger.info(f"Auto-indexed {fname} ({chunks} chunks).")
                    except Exception as err:
                        logger.warning(f"Failed to auto-index {fname}: {err}")
        finally:
            db.close()

    yield
    logger.info("Enterprise AI Backend shutting down.")

app = FastAPI(
    title="Enterprise AI Knowledge & Automation Agent",
    description="Full-stack AI assistant with RAG, LangChain, LangGraph, ChromaDB, and Business Automation",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(documents.router)
app.include_router(tickets.router)
app.include_router(settings.router)

@app.get("/")
def read_root():
    return {
        "project": "Enterprise AI Knowledge & Automation Agent",
        "status": "Online",
        "architecture": "LangGraph + RAG + ChromaDB + FastAPI + React",
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "vector_db": "ChromaDB Connected",
        "vector_chunks": get_collection_count()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
