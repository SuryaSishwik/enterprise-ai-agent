import random
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.models.ticket import SupportTicket
from backend.models.leave_request import LeaveAndRemoteRequest
from backend.models.user import User

logger = logging.getLogger("enterprise_ai.api_tickets")
router = APIRouter(prefix="/api", tags=["Tickets & Business Actions"])

class CreateTicketRequest(BaseModel):
    title: str
    description: str
    category: Optional[str] = "IT Support"
    priority: Optional[str] = "Medium"
    user_email: Optional[str] = "alex.smith@enterprise.ai"

class StatusUpdateRequest(BaseModel):
    status: str

class CreateRemoteRequest(BaseModel):
    target_date: str
    reason: str
    request_type: Optional[str] = "REMOTE_WORK"
    user_email: Optional[str] = "alex.smith@enterprise.ai"

@router.get("/tickets")
def get_tickets(db: Session = Depends(get_db)):
    tickets = db.query(SupportTicket).order_by(SupportTicket.created_at.desc()).all()
    return [
        {
            "id": t.id,
            "ticket_code": t.ticket_code,
            "title": t.title,
            "description": t.description,
            "category": t.category,
            "priority": t.priority,
            "status": t.status,
            "user_id": t.user_id,
            "created_at": t.created_at.isoformat(),
            "updated_at": t.updated_at.isoformat() if t.updated_at else None
        }
        for t in tickets
    ]

@router.post("/tickets")
def create_ticket(req: CreateTicketRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.user_email).first()
    user_id = user.id if user else 1

    ticket_code = f"TKT{random.randint(1000, 9999)}"
    ticket = SupportTicket(
        ticket_code=ticket_code,
        user_id=user_id,
        title=req.title,
        description=req.description,
        category=req.category,
        priority=req.priority,
        status="OPEN"
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return {
        "success": True,
        "ticket_code": ticket.ticket_code,
        "message": f"Support ticket {ticket.ticket_code} created successfully."
    }

@router.patch("/tickets/{ticket_id}/status")
def update_ticket_status(ticket_id: int, req: StatusUpdateRequest, db: Session = Depends(get_db)):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.status = req.status.upper()
    db.commit()
    return {"success": True, "ticket_id": ticket.id, "status": ticket.status}

@router.get("/requests/remote")
def get_remote_requests(db: Session = Depends(get_db)):
    reqs = db.query(LeaveAndRemoteRequest).order_by(LeaveAndRemoteRequest.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "request_code": r.request_code,
            "request_type": r.request_type,
            "target_date": r.target_date,
            "reason": r.reason,
            "status": r.status,
            "created_at": r.created_at.isoformat()
        }
        for r in reqs
    ]

@router.post("/requests/remote")
def create_remote_request(req: CreateRemoteRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.user_email).first()
    user_id = user.id if user else 1

    code = f"REQ-WFH-{random.randint(100, 999)}"
    record = LeaveAndRemoteRequest(
        request_code=code,
        user_id=user_id,
        request_type=req.request_type,
        target_date=req.target_date,
        reason=req.reason,
        status="PENDING"
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {
        "success": True,
        "request_code": record.request_code,
        "message": f"Request {record.request_code} filed successfully."
    }
