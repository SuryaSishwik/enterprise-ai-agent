from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database.connection import Base

class LeaveAndRemoteRequest(Base):
    __tablename__ = "leave_and_remote_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_code = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    request_type = Column(String(50), default="REMOTE_WORK")  # REMOTE_WORK, PAID_LEAVE, SICK_LEAVE
    target_date = Column(String(100), nullable=False)  # e.g., "Next Monday", "2026-11-17"
    reason = Column(Text, nullable=False)
    status = Column(String(50), default="PENDING")  # PENDING, APPROVED, REJECTED
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="leave_requests")
