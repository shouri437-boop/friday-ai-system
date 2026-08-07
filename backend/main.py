"""
FRIDAY Backend — FastAPI Application Entry Point
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routers import chat, tasks, knowledge, system, vision


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup / shutdown lifecycle handler."""
    print("[INIT] FRIDAY Real Production Backend initializing...")
    print(f"   Origin : {settings.frontend_origin}")
    yield
    print("[SHUTDOWN] FRIDAY Backend shutting down.")


app = FastAPI(
    title="FRIDAY — Personal AI Agent API",
    description=(
        "Backend API for the FRIDAY autonomous AI assistant. "
        "Exposes chat streaming, Notion task management, "
        "Obsidian RAG search, and Vision object detection."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(system.router,    prefix="/api/system",    tags=["System"])
app.include_router(chat.router,      prefix="/api/chat",      tags=["Chat"])
app.include_router(tasks.router,     prefix="/api/tasks",     tags=["Tasks"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["Knowledge"])
app.include_router(vision.router,    prefix="/vision",        tags=["Vision"])
app.include_router(vision.router,    prefix="/api/vision",    tags=["Vision"])





from fastapi import HTTPException
from models.chat import AskRequest, AskResponse
from agent.core import friday_agent_core


@app.post("/ask", response_model=AskResponse, tags=["Controller Multi-LLM"])
async def ask_controller(request: AskRequest):
    """
    Controller-driven Multi-LLM endpoint.
    Receives prompt question, selects Agent, and executes real Groq model API call.
    """
    try:
        result = friday_agent_core.execute_task(request.question)
        return AskResponse(
            answer=result["answer"],
            model_used=result["model_used"],
            agent_used=result["agent_used"]
        )

    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/", tags=["Root"])
async def root():
    return {
        "service": "FRIDAY AI Agent Backend — Multi-LLM Controller Core",
        "version": "2.0.0",
        "status": "operational",
        "docs": "/docs",
    }

