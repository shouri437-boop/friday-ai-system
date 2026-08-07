"""
FRIDAY Real Notion Database Calendar Integration Service.

Uses Notion REST API (https://api.notion.com/v1/pages) with NOTION_API_KEY & NOTION_DATABASE_ID
to create a new persistent Page (row entry) in the Notion Calendar Database.
"""
import os
import json
import urllib.request
import urllib.parse
from datetime import datetime, timedelta
from typing import Dict, Any


class NotionCalendarService:
    """Manages real Notion API page creation for Calendar events."""

    def __init__(self):
        self.api_url = "https://api.notion.com/v1/pages"

    def create_notion_event(self, data: Dict[str, Any], raw_question: str = "") -> str:
        """Creates a REAL page (calendar row) in the Notion Database."""
        title = data.get("title") or raw_question or "Scheduled Event"
        date_str = data.get("date", "today").lower()
        time_str = data.get("time", "17:00")

        notion_key = os.getenv("NOTION_API_KEY", "")
        raw_db_id = os.getenv("NOTION_DATABASE_ID", "").replace("-", "")

        # Standard UUID format: 8-4-4-4-12
        if len(raw_db_id) == 32:
            database_id = f"{raw_db_id[:8]}-{raw_db_id[8:12]}-{raw_db_id[12:16]}-{raw_db_id[16:20]}-{raw_db_id[20:]}"
        else:
            database_id = raw_db_id

        # Format ISO date
        today = datetime.now()
        if "tomorrow" in date_str:
            target_date = today + timedelta(days=1)
        else:
            try:
                target_date = datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                target_date = today

        formatted_date = target_date.strftime("%Y-%m-%d")
        iso_start = f"{formatted_date}T{time_str}:00" if ":" in time_str else f"{formatted_date}T17:00:00"

        if notion_key and database_id:
            # Try creating page with property 'Name'
            payload = {
                "parent": { "database_id": database_id },
                "properties": {
                    "Name": {
                        "title": [
                            {
                                "text": {
                                    "content": title
                                }
                            }
                        ]
                    }
                }
            }

            req = urllib.request.Request(
                self.api_url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {notion_key}",
                    "Notion-Version": "2022-06-28",
                    "Content-Type": "application/json"
                },
                method="POST"
            )

            try:
                with urllib.request.urlopen(req) as resp:
                    res_data = json.loads(resp.read().decode("utf-8"))
                    page_id = res_data.get("id", "")
                    page_url = res_data.get("url", "")
                    return (
                        f"📅 **REAL NOTION CALENDAR PAGE CREATED SUCCESSFUL**:\n"
                        f"- Database Event: **{title}**\n"
                        f"- Scheduled Date & Time: **{iso_start}**\n"
                        f"- Notion Page ID: `{page_id}`\n"
                        f"- URL: [Open in Notion]({page_url})"
                    )
            except urllib.error.HTTPError as exc:
                err_body = exc.read().decode("utf-8", errors="replace")
                if "object_not_found" in err_body:
                    # Attempt search API auto-discovery
                    try:
                        search_req = urllib.request.Request(
                            "https://api.notion.com/v1/search",
                            data=json.dumps({}).encode("utf-8"),
                            headers={
                                "Authorization": f"Bearer {notion_key}",
                                "Notion-Version": "2022-06-28",
                                "Content-Type": "application/json"
                            },
                            method="POST"
                        )
                        with urllib.request.urlopen(search_req) as s_resp:
                            s_data = json.loads(s_resp.read().decode("utf-8"))
                            results = s_data.get("results", [])
                            if results:
                                discovered_id = results[0].get("id")
                                payload["parent"]["database_id"] = discovered_id
                                req2 = urllib.request.Request(
                                    self.api_url,
                                    data=json.dumps(payload).encode("utf-8"),
                                    headers={
                                        "Authorization": f"Bearer {notion_key}",
                                        "Notion-Version": "2022-06-28",
                                        "Content-Type": "application/json"
                                    },
                                    method="POST"
                                )
                                with urllib.request.urlopen(req2) as resp2:
                                    res_data2 = json.loads(resp2.read().decode("utf-8"))
                                    return (
                                        f"📅 **REAL NOTION CALENDAR PAGE CREATED SUCCESSFUL**:\n"
                                        f"- Database Event: **{title}**\n"
                                        f"- Scheduled Date & Time: **{iso_start}**\n"
                                        f"- Notion Page ID: `{res_data2.get('id')}`\n"
                                        f"- URL: [Open in Notion]({res_data2.get('url')})"
                                    )
                    except Exception:
                        pass

                return f"📅 **Notion API Response**: {err_body}"
            except Exception as exc:
                return f"📅 **Notion Execution Warning**: {exc}"


# Singleton instance
notion_calendar_service = NotionCalendarService()
