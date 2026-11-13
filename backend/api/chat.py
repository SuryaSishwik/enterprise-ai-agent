import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.agents.workflow import run_agent_workflow
from backend.api.auth import SECRET_KEY, ALGORITHM
from jose import jwt

logger = logging.getLogger("enterprise_ai.api_chat")

router = APIRouter(prefix="/api/chat", tags=["AI Chat & Agent"])

class ChatRequest(BaseModel):
    message: str

class Citation(BaseModel):
    source: str
    page: Optional[int] = 1
    snippet: str

class ChatResponse(BaseModel):
    response: str
    intent: str
    citations: List[Citation]
    tool_results: List[Dict[str, Any]]

def extract_user_email_optional(authorization: Optional[str] = Header(None)) -> str:
    default_email = "alex.smith@enterprise.ai"
    if not authorization:
        return default_email
    try:
        scheme, token = authorization.split()
        if scheme.lower() == "bearer":
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload.get("sub", default_email)
    except Exception:
        pass
    return default_email

@router.post("", response_model=ChatResponse)
def handle_chat_message(
    payload: ChatRequest,
    user_email: str = Depends(extract_user_email_optional),
    db: Session = Depends(get_db)
):
    """
    Step 2 in Question Answering / Agent Workflow:
    Receives user query, routes through LangGraph workflow,
    retrieves context via ChromaDB, executes tools if requested, and returns grounded answer.
    """
    if not payload.message.strip():
        return {
            "response": "Please enter a valid question or command.",
            "intent": "KNOWLEDGE_QUERY",
            "citations": [],
            "tool_results": []
        }

    logger.info(f"Received query from {user_email}: '{payload.message}'")
    result = run_agent_workflow(query=payload.message, user_email=user_email)

    formatted_citations = []
    for c in result.get("citations", []):
        formatted_citations.append(
            Citation(
                source=c.get("source", "Enterprise Docs"),
                page=c.get("page", 1),
                snippet=c.get("snippet", "")
            )
        )

    return {
        "response": result["response"],
        "intent": result.get("intent", "KNOWLEDGE_QUERY"),
        "citations": formatted_citations,
        "tool_results": result.get("tool_results", [])
    }
