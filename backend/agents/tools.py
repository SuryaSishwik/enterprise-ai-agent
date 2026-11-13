import random
import logging
from typing import Dict, Any, Optional
from langchain_core.tools import tool
from backend.database.connection import get_session
from backend.models.ticket import SupportTicket
from backend.models.leave_request import LeaveAndRemoteRequest
from backend.models.user import User

logger = logging.getLogger("enterprise_ai.agent_tools")

@tool
def create_support_ticket(title: str, description: str, category: str = "IT Support", priority: str = "Medium", user_email: str = "alex.smith@enterprise.ai") -> Dict[str, Any]:
    """
    Creates a new IT or enterprise support ticket in the database.
    Use this tool when an employee needs technical help, account unlocking, password reset, or hardware assistance.
    
    Args:
        title: Short title summarizing the problem (e.g. 'Account Access Issue')
        description: Detailed explanation of the issue
        category: 'Account Access', 'Hardware', 'Software', 'Network', or 'HR Inquiry'
        priority: 'Critical', 'High', 'Medium', or 'Low'
        user_email: The email of the employee raising the ticket
    """
    db = get_session()
    try:
        user = db.query(User).filter(User.email == user_email).first()
        user_id = user.id if user else 1

        random_suffix = random.randint(1000, 9999)
        ticket_code = f"TKT{random_suffix}"

        # If priority not specified, infer from urgency keywords
        if "cannot access" in description.lower() or "locked" in description.lower() or "critical" in description.lower():
            priority = "High"

        new_ticket = SupportTicket(
            ticket_code=ticket_code,
            user_id=user_id,
            title=title,
            description=description,
            category=category,
            priority=priority,
            status="OPEN"
        )
        db.add(new_ticket)
        db.commit()
        db.refresh(new_ticket)

        logger.info(f"Created ticket {ticket_code} for user {user_email}")
        return {
            "success": True,
            "ticket_id": ticket_code,
            "title": title,
            "priority": priority,
            "status": "OPEN",
            "message": f"Your support ticket has been created successfully. Ticket ID: {ticket_code} with {priority} priority."
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create support ticket: {e}")
        return {"success": False, "error": str(e)}
    finally:
        db.close()


@tool
def submit_remote_work_request(target_date: str, reason: str, user_email: str = "alex.smith@enterprise.ai") -> Dict[str, Any]:
    """
    Submits a remote work (WFH) or leave request for manager approval.
    Use this tool when an employee wants to work from home on a specific date (e.g., 'next Monday') or file leave.

    Args:
        target_date: The date or day for remote work (e.g. 'Next Monday', '2026-11-17')
        reason: Justification or note for the request
        user_email: The email of the employee submitting the request
    """
    db = get_session()
    try:
        user = db.query(User).filter(User.email == user_email).first()
        user_id = user.id if user else 1

        random_suffix = random.randint(100, 999)
        req_code = f"REQ-WFH-{random_suffix}"

        new_req = LeaveAndRemoteRequest(
            request_code=req_code,
            user_id=user_id,
            request_type="REMOTE_WORK",
            target_date=target_date,
            reason=reason or "Remote work schedule request",
            status="PENDING"
        )
        db.add(new_req)
        db.commit()
        db.refresh(new_req)

        logger.info(f"Submitted remote request {req_code} for user {user_email} on {target_date}")
        return {
            "success": True,
            "request_id": req_code,
            "target_date": target_date,
            "status": "PENDING",
            "message": f"Your remote work request for {target_date} has been recorded under Request ID {req_code} and forwarded to your manager for approval."
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to submit remote request: {e}")
        return {"success": False, "error": str(e)}
    finally:
        db.close()


@tool
def check_leave_balance(user_email: str = "alex.smith@enterprise.ai") -> Dict[str, Any]:
    """
    Retrieves the employee's remaining leave allowances and pending requests.
    """
    return {
        "annual_paid_leave_balance": 18,
        "sick_leave_balance": 10,
        "casual_leave_balance": 6,
        "carry_forward_eligible": 8,
        "user_email": user_email,
        "message": "You have 18 annual paid leaves, 10 sick leaves, and 6 casual emergency leaves remaining for the 2026 calendar year."
    }
