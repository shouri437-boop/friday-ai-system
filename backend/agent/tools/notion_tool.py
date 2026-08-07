"""
FRIDAY Agent Tool — Notion Task Manager

Stub implementation: returns mock confirmation.
Swap `_call_notion_api` with real httpx calls to the Notion API
once NOTION_TOKEN and NOTION_DATABASE_ID are configured.
"""
from langchain_core.tools import tool
from datetime import datetime


@tool
def notion_create_task(title: str, priority: str = "medium", description: str = "") -> str:
    """
    Create a new task in the connected Notion database.

    Args:
        title: The task title.
        priority: Task priority — 'low', 'medium', 'high', or 'urgent'.
        description: Optional task description or notes.

    Returns:
        Confirmation string with the created task details.
    """
    # TODO: Replace with real Notion API call:
    # async with httpx.AsyncClient() as client:
    #     response = await client.post(
    #         "https://api.notion.com/v1/pages",
    #         headers={"Authorization": f"Bearer {settings.notion_token}", "Notion-Version": "2022-06-28"},
    #         json={
    #             "parent": {"database_id": settings.notion_database_id},
    #             "properties": {
    #                 "Name": {"title": [{"text": {"content": title}}]},
    #                 "Priority": {"select": {"name": priority.capitalize()}},
    #                 "Status": {"status": {"name": "Not started"}},
    #             }
    #         }
    #     )

    mock_notion_id = f"notion-{hash(title) % 9999:04d}"
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M")

    return (
        f"✅ Task successfully created in Notion!\n\n"
        f"  Title       : {title}\n"
        f"  Priority    : {priority.upper()}\n"
        f"  Description : {description or '—'}\n"
        f"  Notion ID   : {mock_notion_id}\n"
        f"  Status      : To Do\n"
        f"  Created At  : {created_at}\n\n"
        f"The task is now synced with your Notion workspace."
    )


@tool
def notion_list_tasks(status_filter: str = "all") -> str:
    """
    Retrieve tasks from the connected Notion database.

    Args:
        status_filter: Filter by status — 'todo', 'in_progress', 'completed', or 'all'.

    Returns:
        Formatted list of matching tasks.
    """
    mock_tasks = [
        {"title": "Implement FastAPI Async Tool Worker", "status": "in_progress", "priority": "high"},
        {"title": "Setup Obsidian Vault RAG Pipeline",   "status": "completed",   "priority": "urgent"},
        {"title": "Integrate Tavily Web Search Tool",    "status": "todo",        "priority": "low"},
    ]

    filtered = mock_tasks if status_filter == "all" else [
        t for t in mock_tasks if t["status"] == status_filter
    ]

    lines = [f"📋 Notion Tasks ({status_filter}):\n"]
    for task in filtered:
        icon = {"todo": "⬜", "in_progress": "🔄", "completed": "✅"}.get(task["status"], "•")
        lines.append(f"  {icon} [{task['priority'].upper()}] {task['title']}")

    return "\n".join(lines)
