"""
FRIDAY Real Google Calendar API Integration Service.

Uses OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN)
to create real events in Google Calendar primary calendar.
"""
import os
import json
import urllib.request
import urllib.parse
from datetime import datetime, timedelta
from typing import Dict, Any


class GoogleCalendarService:
    """Manages real Google Calendar API authentication and event creation."""

    def __init__(self):
        self.client_id = os.getenv("GOOGLE_CLIENT_ID", "")
        self.client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "")
        self.refresh_token = os.getenv("GOOGLE_REFRESH_TOKEN", "")
        self.token_url = "https://oauth2.googleapis.com/token"
        self.calendar_api_url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"

    def get_access_token(self) -> str:
        """Exchanges refresh token for a live Google OAuth access token."""
        if not self.refresh_token or not self.client_id or not self.client_secret:
            return ""

        payload = urllib.parse.urlencode({
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": self.refresh_token,
            "grant_type": "refresh_token"
        }).encode("utf-8")

        req = urllib.request.Request(self.token_url, data=payload, headers={"Content-Type": "application/x-www-form-urlencoded"})
        try:
            with urllib.request.urlopen(req) as resp:
                res_data = json.loads(resp.read().decode("utf-8"))
                return res_data.get("access_token", "")
        except Exception as e:
            print(f"[GOOGLE CALENDAR OAUTH ERROR] {e}")
            return ""

    def create_event(self, data: Dict[str, Any], raw_question: str = "") -> str:
        """Creates a REAL event in Google Calendar."""
        title = data.get("title") or raw_question or "Scheduled Event"
        date_str = data.get("date", "today").lower()
        time_str = data.get("time", "17:00")

        # Normalize date format
        today = datetime.now()
        if "tomorrow" in date_str:
            target_date = today + timedelta(days=1)
        else:
            try:
                target_date = datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                target_date = today

        # Parse time HH:MM
        try:
            clean_time = time_str.replace("pm", "").replace("am", "").strip()
            if ":" in clean_time:
                parts = clean_time.split(":")
                hh, mm = int(parts[0]), int(parts[1])
            else:
                hh, mm = int(clean_time), 0
            if "pm" in time_str.lower() and hh < 12:
                hh += 12
        except Exception:
            hh, mm = 17, 0

        start_dt = target_date.replace(hour=hh, minute=mm, second=0)
        end_dt = start_dt + timedelta(hours=1)

        start_iso = start_dt.strftime("%Y-%m-%dT%H:%M:%S")
        end_iso = end_dt.strftime("%Y-%m-%dT%H:%M:%S")

        access_token = self.get_access_token()

        if access_token:
            event_payload = {
                "summary": title,
                "description": f"Created via FRIDAY Real Action Control System on {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                "start": {"dateTime": start_iso, "timeZone": "Asia/Kolkata"},
                "end": {"dateTime": end_iso, "timeZone": "Asia/Kolkata"}
            }

            req = urllib.request.Request(
                self.calendar_api_url,
                data=json.dumps(event_payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                method="POST"
            )

            try:
                with urllib.request.urlopen(req) as resp:
                    created_data = json.loads(resp.read().decode("utf-8"))
                    html_link = created_data.get("htmlLink", "")
                    return (
                        f"📅 **REAL GOOGLE CALENDAR EVENT CREATED**:\n"
                        f"- Event: **{title}**\n"
                        f"- Start Time: **{start_iso}**\n"
                        f"- Link: [View in Google Calendar]({html_link})"
                    )
            except Exception as exc:
                return (
                    f"📅 **Google Calendar API Invoked**: Event payload prepared for **\"{title}\"** on {start_iso}.\n"
                    f"*(API Transport Notice: {exc})*"
                )
        else:
            return (
                f"📅 **Google Calendar Event Prepared**: Created event object **\"{title}\"** for {start_iso}.\n"
                f"*(Note: Provide GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET & GOOGLE_REFRESH_TOKEN in backend/.env to execute live OAuth calendar sync)*"
            )


# Singleton instance
google_calendar_service = GoogleCalendarService()
