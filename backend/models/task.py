"""FRIDAY Backend — Pydantic models for Tasks."""
from pydantic import BaseModel, Field
from typing import Optional, Literal


TaskStatus = Literal["todo", "in_progress", "completed"]
TaskPriority = Literal["low", "medium", "high", "urgent"]


class TaskModel(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: TaskStatus = "todo"
    priority: TaskPriority = "medium"
    notion_id: Optional[str] = None
    tags: list[str] = []
    created_at: str


class CreateTaskRequest(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    priority: TaskPriority = "medium"
    tags: list[str] = []


class UpdateTaskRequest(BaseModel):
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    description: Optional[str] = None


class TaskListResponse(BaseModel):
    tasks: list[TaskModel]
    total: int
    notion_synced: bool = False
