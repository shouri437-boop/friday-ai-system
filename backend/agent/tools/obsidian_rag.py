"""
FRIDAY Agent Tool — Obsidian RAG Query

Stub implementation: returns realistic mock Obsidian note chunks.
Swap `_mock_search` with a real LlamaIndex VectorStoreIndex query
once the PostgreSQL + pgvector pipeline is wired up.
"""
from langchain_core.tools import tool


MOCK_CHUNKS = [
    {
        "title": "FRIDAY Agentic Architecture Overview.md",
        "path": "Projects/FRIDAY/Architecture.md",
        "excerpt": (
            "The FRIDAY system combines a Next.js frontend, FastAPI Python microservice, "
            "LangGraph orchestrator, and PostgreSQL + pgvector for persistent conversation memory. "
            "The RAG pipeline uses LlamaIndex with SentenceSplitter(chunk_size=512, overlap=64)."
        ),
        "score": 0.94,
        "tags": ["Architecture", "LangGraph", "Python"],
    },
    {
        "title": "LlamaIndex RAG Pipeline Setup.md",
        "path": "Engineering/AI/RAG-LlamaIndex.md",
        "excerpt": (
            "Chunking strategy: SentenceSplitter with chunk_size=512, chunk_overlap=64. "
            "Embeddings via text-embedding-3-small (1536 dimensions). "
            "Storage: PGVectorStore backed by PostgreSQL."
        ),
        "score": 0.89,
        "tags": ["RAG", "LlamaIndex", "Embeddings"],
    },
    {
        "title": "FastAPI Async Worker Queue Design.md",
        "path": "Engineering/Backend/FastAPI-Workers.md",
        "excerpt": (
            "Background task routing: asyncio task pool for non-blocking LLM calls. "
            "Each tool invocation runs in an executor to avoid blocking the event loop."
        ),
        "score": 0.82,
        "tags": ["Backend", "FastAPI", "Async"],
    },
]


@tool
def obsidian_rag_search(query: str) -> str:
    """
    Search the Obsidian knowledge vault using semantic RAG retrieval.
    Returns the most relevant note excerpts for the given query.

    Args:
        query: The user's question or topic to search for.

    Returns:
        Formatted string of relevant note excerpts with scores.
    """
    # TODO: Replace with real LlamaIndex VectorStoreIndex query:
    # index = VectorStoreIndex.from_vector_store(pg_vector_store)
    # retriever = index.as_retriever(similarity_top_k=3)
    # nodes = retriever.retrieve(query)

    results = []
    for chunk in MOCK_CHUNKS:
        results.append(
            f"📄 [{chunk['score']:.0%} match] **{chunk['title']}**\n"
            f"   Path: {chunk['path']}\n"
            f"   Tags: {', '.join(chunk['tags'])}\n"
            f"   Excerpt: {chunk['excerpt']}\n"
        )

    return (
        f"Found {len(results)} relevant chunks in your Obsidian vault "
        f"for query: '{query}'\n\n" + "\n".join(results)
    )
