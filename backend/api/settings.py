import os
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.ai.llm import get_available_providers, get_active_provider_name

logger = logging.getLogger("enterprise_ai.api_settings")
router = APIRouter(prefix="/api/ai", tags=["AI Provider Configuration"])

class ProviderSelectRequest(BaseModel):
    provider: str
    model: Optional[str] = None
    api_key: Optional[str] = None

class TestKeyRequest(BaseModel):
    provider: str
    api_key: str
    base_url: Optional[str] = None
    model: Optional[str] = None

@router.get("/providers")
def list_providers():
    """
    Returns all supported AI providers (OpenAI, Gemini, NVIDIA, Grok, ABAKI, Local),
    their configured status, and current active selection.
    """
    active = get_active_provider_name()
    return {
        "active_provider": active,
        "env_file_path": os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env")),
        "providers": get_available_providers()
    }

@router.post("/select-provider")
def select_provider(req: ProviderSelectRequest):
    valid_providers = ["openai", "gemini", "nvidia", "grok", "abaki", "local"]
    p = req.provider.lower().strip()
    if p not in valid_providers:
        raise HTTPException(status_code=400, detail=f"Invalid provider '{p}'. Choose from: {valid_providers}")
    
    os.environ["LLM_PROVIDER"] = p
    if req.model:
        if p == "openai":
            os.environ["OPENAI_MODEL"] = req.model
        elif p == "gemini":
            os.environ["GEMINI_MODEL"] = req.model
        elif p == "nvidia":
            os.environ["NVIDIA_MODEL"] = req.model
        elif p == "grok":
            os.environ["GROK_MODEL"] = req.model
        elif p == "abaki":
            os.environ["CUSTOM_LLM_MODEL"] = req.model
    
    if req.api_key:
        if p == "openai":
            os.environ["OPENAI_API_KEY"] = req.api_key
        elif p == "gemini":
            os.environ["GEMINI_API_KEY"] = req.api_key
        elif p == "nvidia":
            os.environ["NVIDIA_API_KEY"] = req.api_key
        elif p == "grok":
            os.environ["GROK_API_KEY"] = req.api_key
        elif p == "abaki":
            os.environ["CUSTOM_LLM_API_KEY"] = req.api_key

    logger.info(f"Switched active AI provider to: {p}")
    return {
        "success": True,
        "active_provider": p,
        "message": f"Successfully activated {p.upper()} as the active AI intelligence provider."
    }
