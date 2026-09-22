"""Import the prototype JSON data into Supabase.

Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.
The service-role key is used only by this local migration script.
"""

import argparse
import json
import os
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent


def supabase_request(method, table, payload=None, query="", prefer="return=representation"):
    base_url = os.environ["SUPABASE_URL"].rstrip("/")
    service_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    url = f"{base_url}/rest/v1/{table}"
    if query:
        url = f"{url}?{query}"
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    request = Request(url, data=body, method=method)
    request.add_header("apikey", service_key)
    request.add_header("Authorization", f"Bearer {service_key}")
    request.add_header("Content-Type", "application/json")
    if prefer:
        request.add_header("Prefer", prefer)
    try:
        with urlopen(request, timeout=30) as response:
            content = response.read().decode("utf-8")
            return json.loads(content) if content else []
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase returned HTTP {error.code}: {detail}") from error
    except URLError as error:
        raise RuntimeError(f"Could not connect to Supabase: {error.reason}") from error


def require_environment():
    missing = [name for name in ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY") if not os.getenv(name)]
    if missing:
        raise RuntimeError(f"Missing environment variable(s): {', '.join(missing)}")


def load_json(filename):
    return json.loads((ROOT / filename).read_text(encoding="utf-8"))


def import_weeks(data):
    rows = []
    for week in data["weeks"]:
        meeting = week["meeting"]
        display = week["weekDisplay"]
        project = week["project"]
        rows.append(
            {
                "week_number": int(week["week"].split()[-1]),
                "meeting_date": week["meetingDate"],
                "meeting_time": meeting["time"],
                "topic": meeting["topic"],
                "preparation": meeting["prepare"],
                "week_title": display["title"],
                "week_body": display["body"],
                "week_status": display["status"],
                "project_title": project["title"],
                "project_percent": int(project["percent"]),
                "project_explanation": project["explanation"],
            }
        )
    result = supabase_request("POST", "weeks", rows, urlencode({"on_conflict": "week_number"}), "resolution=merge-duplicates,return=representation")
    return {int(row["week_number"]): row["id"] for row in result}


def import_deadlines(data, week_ids, replace):
    if replace:
        supabase_request("DELETE", "deadlines", query="id=gt.0", prefer="return=minimal")
    rows = []
    for week in data["weeks"]:
        week_number = int(week["week"].split()[-1])
        for index, deadline in enumerate(week.get("deadlines", [])):
            rows.append({"week_id": week_ids[week_number], "title": deadline["title"], "deadline_date": deadline["date"], "sort_order": index})
    if rows:
        supabase_request("POST", "deadlines", rows)
    return len(rows)


def import_announcements(data, replace):
    announcements = data.get("announcements", [])
    if replace:
        supabase_request("DELETE", "announcements", query="id=gt.0", prefer="return=minimal")
    rows = [{"announcement_date": item["date"], "text": item["text"]} for item in announcements]
    if rows:
        supabase_request("POST", "announcements", rows)
    return len(rows)


def import_resources(data, replace):
    lessons = data.get("lessons", [])
    if replace:
        supabase_request("DELETE", "resources", query="id=gt.0", prefer="return=minimal")
    rows = [
        {
            "resource_type": "video",
            "lesson": lesson["lesson"],
            "objective": lesson["objective"],
            "title": lesson["title"],
            "url": lesson.get("url"),
            "published": True,
            "sort_order": index,
        }
        for index, lesson in enumerate(lessons)
    ]
    if rows:
        supabase_request("POST", "resources", rows)
    return len(rows)


def main():
    parser = argparse.ArgumentParser(description="Import Creative Vision JSON data into Supabase")
    parser.add_argument("--replace", action="store_true", help="Clear deadlines, announcements, and resources before importing")
    args = parser.parse_args()
    require_environment()
    dashboard = load_json("dashboard_data.json")
    videos = load_json("video_lessons.json")
    week_ids = import_weeks(dashboard)
    deadline_count = import_deadlines(dashboard, week_ids, args.replace)
    announcement_count = import_announcements(dashboard, args.replace)
    resource_count = import_resources(videos, args.replace)
    print(f"Imported {len(week_ids)} weeks, {deadline_count} deadlines, {announcement_count} announcements, and {resource_count} resources.")


if __name__ == "__main__":
    try:
        main()
    except (KeyError, FileNotFoundError, json.JSONDecodeError, RuntimeError) as error:
        print(f"Import failed: {error}", file=sys.stderr)
        sys.exit(1)
