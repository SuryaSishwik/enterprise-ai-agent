from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from backend.database.connection import Base

class DocumentRecord(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), default="pdf")
    file_size_bytes = Column(Integer, default=0)
    chunk_count = Column(Integer, default=0)
    uploaded_by = Column(String(255), default="System Admin")
    status = Column(String(50), default="INDEXED")
    created_at = Column(DateTime, default=datetime.utcnow)
