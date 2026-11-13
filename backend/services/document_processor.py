import os
import fitz  # PyMuPDF
import logging
from typing import List, Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter
import chromadb
from chromadb.config import Settings
from backend.ai.embeddings import get_embedding_model

logger = logging.getLogger("enterprise_ai.doc_processor")

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", os.path.abspath("./chroma_db"))
COLLECTION_NAME = "enterprise_knowledge"

_chroma_client = None
_collection = None

def get_chroma_collection():
    global _chroma_client, _collection
    if _collection is not None:
        return _collection

    os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
    _chroma_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
    _collection = _chroma_client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"}
    )
    logger.info(f"Connected to ChromaDB collection '{COLLECTION_NAME}' at {CHROMA_PERSIST_DIR}")
    return _collection

def extract_text_from_pdf(file_path: str) -> List[Dict[str, Any]]:
    """
    Extracts text and page metadata from a PDF file using PyMuPDF.
    Returns list of {'page': page_num, 'text': page_text}
    """
    pages_data = []
    doc = fitz.open(file_path)
    for page_idx in range(len(doc)):
        page = doc[page_idx]
        text = page.get_text("text").strip()
        if text:
            pages_data.append({
                "page": page_idx + 1,
                "text": text
            })
    doc.close()
    return pages_data

def extract_text_from_file(file_path: str) -> List[Dict[str, Any]]:
    """
    Extracts text from PDF, TXT, MD, or DOCX.
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    else:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        return [{"page": 1, "text": content}]

def chunk_and_index_document(file_path: str, filename: str) -> Dict[str, Any]:
    """
    Full document ingestion pipeline:
    Extract -> Chunk (RecursiveCharacterTextSplitter) -> Embed -> Store in ChromaDB
    """
    collection = get_chroma_collection()
    embedding_model = get_embedding_model()

    pages = extract_text_from_file(file_path)
    if not pages:
        raise ValueError(f"No extractable text found in {filename}")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=700,
        chunk_overlap=120,
        separators=["\n\n", "\n", ". ", " ", ""]
    )

    all_chunks = []
    all_metadatas = []
    all_ids = []

    chunk_idx = 0
    for p in pages:
        page_num = p["page"]
        text_chunks = splitter.split_text(p["text"])
        for chunk in text_chunks:
            chunk = chunk.strip()
            if len(chunk) < 20:
                continue
            chunk_idx += 1
            chunk_id = f"{filename}_p{page_num}_c{chunk_idx}"
            all_chunks.append(chunk)
            all_metadatas.append({
                "source": filename,
                "page": page_num,
                "chunk_id": chunk_id
            })
            all_ids.append(chunk_id)

    if not all_chunks:
        return {"filename": filename, "chunks_indexed": 0, "status": "empty"}

    # Generate embeddings
    embeddings = embedding_model.embed_documents(all_chunks)

    # Upsert into ChromaDB
    collection.upsert(
        ids=all_ids,
        embeddings=embeddings,
        documents=all_chunks,
        metadatas=all_metadatas
    )

    logger.info(f"Indexed {len(all_chunks)} chunks for document '{filename}' into ChromaDB.")
    return {
        "filename": filename,
        "chunks_indexed": len(all_chunks),
        "status": "INDEXED"
    }

def get_collection_count() -> int:
    try:
        col = get_chroma_collection()
        return col.count()
    except Exception:
        return 0
