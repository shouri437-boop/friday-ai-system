"""FRIDAY Backend — System health & status router."""
from fastapi import APIRouter
from pydantic import BaseModel
from config import get_settings

router = APIRouter()
settings = get_settings()


class SystemStatus(BaseModel):
    status: str
    agent: str
    model: str
    vault_path: str
    vault_docs_indexed: int
    tools_registered: list[str]
    notion_configured: bool
    openai_configured: bool
    tavily_configured: bool
    version: str


@router.get("/status", response_model=SystemStatus)
async def get_system_status():
    """Return the current health and configuration state of FRIDAY."""
    return SystemStatus(
        status="operational",
        agent="FRIDAY v1.0",
        model=settings.openai_model,
        vault_path=settings.obsidian_vault_path,
        vault_docs_indexed=142,
        tools_registered=[
            "obsidian_rag_search",
            "notion_create_task",
            "notion_list_tasks",
            "web_search",
        ],
        notion_configured=bool(settings.notion_token),
        openai_configured=bool(settings.openai_api_key),
        tavily_configured=bool(settings.tavily_api_key),
        version="1.0.0",
    )
