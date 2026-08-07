"""
FRIDAY Backend — Minimal Multi-LLM Chat Router & /ask Endpoint.

POST /ask      — Endpoint returning strictly {"answer": string, "model_used": string}.
POST /api/chat — SSE streaming endpoint for FRIDAY Chat UI.
"""
import json
import uuid
import asyncio
from typing import AsyncIterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from agent.core import friday_agent_core
from models.chat import ChatRequest, AskRequest, AskResponse

router = APIRouter()


@router.post("/ask", response_model=AskResponse)
async def ask(request: AskRequest):
    """
    Minimal Multi-LLM Endpoint.
    Controller selects Agent ONLY -> Agent selects Model -> Returns answer & model_used.

    Output format:
        {
          "answer": "string",
          "model_used": "string"
        }
    """
    result = friday_agent_core.execute_task(request.question)
    return AskResponse(
        answer=result["answer"],
        model_used=result["model_used"],
        agent_used=result["agent_used"]
    )


async def _stream_agent_response(request: ChatRequest, session_id: str) -> AsyncIterator[str]:
    """
    SSE stream handler for FRIDAY agent responses.
    """
    def _sse(data: dict) -> str:
        return f"data: {json.dumps(data)}\n\n"

    try:
        # Run Central Orchestrator & Agent Core
        task_result = friday_agent_core.execute_task(request.message)

        # 1. Emit model & agent info metadata chunk first
        yield _sse({
            "type": "model_info",
            "model_used": task_result["model_used"],
            "agent_used": task_result["agent_used"],
            "session_id": session_id
        })


        await asyncio.sleep(0.03)

        # 2. Stream tokens of the generated answer
        answer = task_result["answer"]
        words = answer.split(" ")
        for i, word in enumerate(words):
            chunk_str = word if i == len(words) - 1 else word + " "
            yield _sse({
                "type": "token",
                "content": chunk_str,
                "model_used": task_result["model_used"]
            })
            await asyncio.sleep(0.015)

        # 3. Signal completion
        yield _sse({
            "type": "done",
            "session_id": session_id,
            "model_used": task_result["model_used"]
        })

    except Exception as exc:
        yield _sse({"type": "error", "error": str(exc)})


@router.post("")
async def chat(request: ChatRequest):
    """
    Stream the FRIDAY agent response for a user chat message.
    """
    session_id = request.session_id or str(uuid.uuid4())

    return StreamingResponse(
        _stream_agent_response(request, session_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
