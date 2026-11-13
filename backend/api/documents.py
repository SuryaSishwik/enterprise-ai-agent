import os
import shutil
import logging
from typing import List
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.models.document import DocumentRecord
from backend.services.document_processor import (
    chunk_and_index_document,
    get_collection_count
)

logger = logging.getLogger("enterprise_ai.api_docs")
router = APIRouter(prefix="/api/documents", tags=["Document Management & Ingestion"])

DOCS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "documents"))
UPLOAD_DIR = os.path.join(DOCS_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("")
def list_documents(db: Session = Depends(get_db)):
    """
    Returns list of indexed documents in the enterprise knowledge base.
    """
    docs = db.query(DocumentRecord).order_by(DocumentRecord.created_at.desc()).all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "file_type": d.file_type,
            "file_size_bytes": d.file_size_bytes,
            "chunk_count": d.chunk_count,
            "uploaded_by": d.uploaded_by,
            "status": d.status,
            "created_at": d.created_at.isoformat()
        }
        for d in docs
    ]

@router.get("/stats")
def get_knowledge_base_stats(db: Session = Depends(get_db)):
    doc_count = db.query(DocumentRecord).count()
    chunk_count = get_collection_count()
    return {
        "total_documents": doc_count,
        "total_vector_chunks": chunk_count,
        "collection_name": "enterprise_knowledge"
    }

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Step 1 & 2 in Document Processing:
    Receives PDF or text document, saves to disk, extracts text using PyMuPDF,
    chunks it, embeds it, and stores in ChromaDB.
    """
    allowed_extensions = [".pdf", ".txt", ".md", ".docx"]
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file_ext}'. Allowed types: {', '.join(allowed_extensions)}"
        )

    saved_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(saved_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(saved_path)

    try:
        index_result = chunk_and_index_document(saved_path, file.filename)
        chunks_indexed = index_result.get("chunks_indexed", 0)

        # Record in DB
        doc_record = db.query(DocumentRecord).filter(DocumentRecord.filename == file.filename).first()
        if not doc_record:
            doc_record = DocumentRecord(
                filename=file.filename,
                file_path=saved_path,
                file_type=file_ext.replace(".", ""),
                file_size_bytes=file_size,
                chunk_count=chunks_indexed,
                uploaded_by="Admin",
                status="INDEXED"
            )
            db.add(doc_record)
        else:
            doc_record.chunk_count = chunks_indexed
            doc_record.file_size_bytes = file_size
            doc_record.status = "INDEXED"

        db.commit()
        db.refresh(doc_record)

        return {
            "success": True,
            "message": f"Successfully processed and indexed '{file.filename}' into ChromaDB.",
            "document_id": doc_record.id,
            "chunks_created": chunks_indexed
        }
    except Exception as e:
        logger.error(f"Error processing document upload: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

@router.post("/index-sample-docs")
def index_sample_documents(db: Session = Depends(get_db)):
    """
    Ingests initial enterprise policy PDFs from the documents directory.
    """
    results = []
    if os.path.exists(DOCS_DIR):
        for f in os.listdir(DOCS_DIR):
            if f.endswith(".pdf"):
                full_path = os.path.join(DOCS_DIR, f)
                try:
                    res = chunk_and_index_document(full_path, f)
                    chunks = res.get("chunks_indexed", 0)

                    record = db.query(DocumentRecord).filter(DocumentRecord.filename == f).first()
                    if not record:
                        record = DocumentRecord(
                            filename=f,
                            file_path=full_path,
                            file_type="pdf",
                            file_size_bytes=os.path.getsize(full_path),
                            chunk_count=chunks,
                            uploaded_by="System Initializer",
                            status="INDEXED"
                        )
                        db.add(record)
                    else:
                        record.chunk_count = chunks
                    db.commit()
                    results.append({"filename": f, "chunks": chunks, "status": "SUCCESS"})
                except Exception as e:
                    results.append({"filename": f, "error": str(e), "status": "FAILED"})

    return {"processed": results, "total_chunks": get_collection_count()}
