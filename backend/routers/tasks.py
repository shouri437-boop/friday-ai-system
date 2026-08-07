"""FRIDAY Backend — Tasks router (Notion-backed)."""
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException

from models.task import TaskModel, TaskListResponse, CreateTaskRequest, UpdateTaskRequest

router = APIRouter()

# In-memory store (replace with Notion API calls in production)
_TASK_STORE: dict[str, TaskModel] = {
    "task-1": TaskModel(
        id="task-1",
        title="Implement FastAPI Async Tool Worker Endpoint",
        description="Connect LangGraph tool caller with background worker queue.",
        status="in_progress",
        priority="high",
        notion_id="notion-9821",
        tags=["Backend", "FastAPI", "Python"],
        created_at="2026-08-01",
    ),
    "task-2": TaskModel(
        id="task-2",
        title="Setup Obsidian Vault Local RAG Pipeline",
        description="Parse markdown notes into vector embeddings with LlamaIndex.",
        status="completed",
        priority="urgent",
        notion_id="notion-9820",
        tags=["RAG", "Obsidian", "VectorDB"],
        created_at="2026-07-31",
    ),
    "task-3": TaskModel(
        id="task-3",
        title="Integrate Tavily Web Search Tool",
        description="Allow FRIDAY to query real-time web results for context.",
        status="todo",
        priority="low",
        tags=["Tool", "WebSearch"],
        created_at="2026-07-30",
    ),
}


@router.get("", response_model=TaskListResponse)
async def list_tasks(status: str = "all"):
    """Return all tasks, optionally filtered by status."""
    tasks = list(_TASK_STORE.values())
    if status != "all":
        tasks = [t for t in tasks if t.status == status]
    return TaskListResponse(tasks=tasks, total=len(tasks), notion_synced=False)


@router.post("", response_model=TaskModel, status_code=201)
async def create_task(request: CreateTaskRequest):
    """Create a new task and (stub) sync to Notion."""
    task_id = f"task-{str(uuid.uuid4())[:8]}"
    task = TaskModel(
        id=task_id,
        title=request.title,
        description=request.description,
        status="todo",
        priority=request.priority,
        notion_id=f"notion-{hash(request.title) % 9999:04d}",
        tags=request.tags,
        created_at=datetime.now().strftime("%Y-%m-%d"),
    )
    _TASK_STORE[task_id] = task
    return task


@router.patch("/{task_id}", response_model=TaskModel)
async def update_task(task_id: str, request: UpdateTaskRequest):
    """Update an existing task's status, priority, or description."""
    if task_id not in _TASK_STORE:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")
    task = _TASK_STORE[task_id]
    update_data = request.model_dump(exclude_unset=True)
    updated = task.model_copy(update=update_data)
    _TASK_STORE[task_id] = updated
    return updated


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: str):
    """Delete a task from the store."""
    if task_id not in _TASK_STORE:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")
    del _TASK_STORE[task_id]
