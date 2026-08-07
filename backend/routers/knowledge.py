"""FRIDAY Backend — Knowledge / Obsidian RAG search router."""
from fastapi import APIRouter
from models.knowledge import (
    KnowledgeSearchRequest,
    KnowledgeSearchResponse,
    KnowledgeResult,
    VaultSyncResponse,
)
from config import get_settings

router = APIRouter()
settings = get_settings()

MOCK_DOCS = [
    KnowledgeResult(
        id="doc-1",
        title="FRIDAY Agentic Architecture Overview.md",
        path="Projects/FRIDAY/Architecture.md",
        excerpt=(
            "The FRIDAY system combines Next.js frontend, FastAPI Python microservice, "
            "LangGraph orchestrator, and PostgreSQL + pgvector for persistent conversation memory."
        ),
        tags=["Architecture", "LangGraph", "Python"],
        score=0.94,
        word_count=1420,
        last_synced="10 mins ago",
    ),
    KnowledgeResult(
        id="doc-2",
        title="LlamaIndex RAG Pipeline Setup.md",
        path="Engineering/AI/RAG-LlamaIndex.md",
        excerpt=(
            "Chunking strategy: SentenceSplitter(chunk_size=512, chunk_overlap=64). "
            "Embeddings via text-embedding-3-small (1536 dimensions)."
        ),
        tags=["RAG", "LlamaIndex", "Embeddings"],
        score=0.89,
        word_count=890,
        last_synced="1 hour ago",
    ),
    KnowledgeResult(
        id="doc-3",
        title="FastAPI Async Worker Queue Design.md",
        path="Engineering/Backend/FastAPI-Workers.md",
        excerpt=(
            "Background task routing: asyncio task pool for non-blocking LLM calls. "
            "Each tool invocation runs in an executor to avoid blocking the event loop."
        ),
        tags=["Backend", "FastAPI", "Async"],
        score=0.82,
        word_count=650,
        last_synced="3 hours ago",
    ),
    KnowledgeResult(
        id="doc-4",
        title="Notion & Gmail External Tool Specs.md",
        path="Projects/FRIDAY/Tools-Spec.md",
        excerpt=(
            "OAuth2 authentication and API schema for Notion task database queries "
            "and Gmail draft creation via the Google Workspace API."
        ),
        tags=["Tools", "Notion", "APIs"],
        score=0.78,
        word_count=1100,
        last_synced="Yesterday",
    ),
]


@router.post("/search", response_model=KnowledgeSearchResponse)
async def search_knowledge(request: KnowledgeSearchRequest):
    """
    Perform a semantic search over the Obsidian vault knowledge base.
    Returns the top-k most relevant document chunks.
    """
    # TODO: Replace with real LlamaIndex vector store query
    query_lower = request.query.lower()
    scored = []
    for doc in MOCK_DOCS:
        relevance_boost = any(
            kw in query_lower
            for kw in doc.title.lower().split() + doc.tags
        )
        adjusted_score = min(doc.score + (0.05 if relevance_boost else 0), 1.0)
        scored.append(doc.model_copy(update={"score": adjusted_score}))

    scored.sort(key=lambda d: d.score, reverse=True)
    top_results = scored[: request.top_k]

    return KnowledgeSearchResponse(
        query=request.query,
        results=top_results,
        total_docs_indexed=142,
        vault_path=settings.obsidian_vault_path,
    )


@router.post("/sync", response_model=VaultSyncResponse)
async def sync_vault():
    """
    Trigger a re-index of the Obsidian vault.
    (Stub — returns mock success; wire to LlamaIndex ingestion pipeline.)
    """
    # TODO: Trigger LlamaIndex ingestion pipeline here
    return VaultSyncResponse(
        status="completed",
        docs_indexed=142,
        chunks_created=1847,
        vault_path=settings.obsidian_vault_path,
    )
