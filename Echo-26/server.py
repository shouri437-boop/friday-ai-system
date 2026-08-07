#!/usr/bin/env python3
"""Static file server with Featherless AI chat proxy."""

import json
import os
import shutil
import subprocess
import urllib.error
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FEATHERLESS_URL = "https://api.featherless.ai/v1/chat/completions"
DEFAULT_MODEL = "Qwen/Qwen2.5-7B-Instruct"
CURL_BIN = shutil.which("curl") or shutil.which("curl.exe")


def load_env():
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


load_env()


def call_featherless(api_key, payload):
    if CURL_BIN:
        result = subprocess.run(
            [
                CURL_BIN,
                "-sS",
                "-X",
                "POST",
                FEATHERLESS_URL,
                "-H",
                "Content-Type: application/json",
                "-H",
                f"Authorization: Bearer {api_key}",
                "-H",
                "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                "-H",
                "Accept: application/json",
                "-H",
                "HTTP-Referer: http://localhost",
                "-H",
                "X-Title: VNRVJIET Campus Inspector",
                "--data-binary",
                "@-",
            ],
            input=json.dumps(payload).encode("utf-8"),
            capture_output=True,
            timeout=90,
            check=False,
        )
        body = result.stdout.decode("utf-8", errors="replace").strip()
        if result.returncode != 0 and not body:
            raise RuntimeError(result.stderr.decode("utf-8", errors="replace") or "curl request failed")
        try:
            return json.loads(body), result.returncode
        except json.JSONDecodeError:
            raise RuntimeError(body or "Invalid response from Featherless API")

    import urllib.request

    req = urllib.request.Request(
        FEATHERLESS_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept": "application/json",
            "HTTP-Referer": "http://localhost",
            "X-Title": "VNRVJIET Campus Inspector",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read().decode("utf-8")), resp.status


class CampusHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        if self.path != "/api/chat":
            self.send_error(404, "Not Found")
            return

        api_key = os.environ.get("FEATHERLESS_API_KEY", "")
        if not api_key:
            self._json_response(500, {"error": "FEATHERLESS_API_KEY is not configured in .env"})
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            messages = body.get("messages")
            if not isinstance(messages, list) or not messages:
                self._json_response(400, {"error": "messages array is required"})
                return

            model = os.environ.get("FEATHERLESS_MODEL", DEFAULT_MODEL)
            payload = {
                "model": model,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 1024,
            }

            result, status = call_featherless(api_key, payload)
            if status >= 400 or "error" in result:
                detail = result.get("error", result)
                if isinstance(detail, dict):
                    detail = detail.get("message") or json.dumps(detail)
                self._json_response(status if status >= 400 else 502, {"error": str(detail)})
                return

            content = result["choices"][0]["message"]["content"]
            self._json_response(200, {"content": content, "model": model})
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            self._json_response(exc.code, {"error": detail or exc.reason})
        except Exception as exc:
            self._json_response(500, {"error": str(exc)})

    def _json_response(self, status, data):
        payload = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format, *args):
        if args and args[0].startswith("POST /api/chat"):
            print(f"[chat] {args[0]} {args[1]}")
            return
        super().log_message(format, *args)


def main():
    port = int(os.environ.get("PORT", "5500"))
    server = ThreadingHTTPServer(("0.0.0.0", port), CampusHandler)
    print(f"Serving campus app at http://localhost:{port}/index.html")
    print("Featherless chat proxy: POST /api/chat")
    server.serve_forever()


if __name__ == "__main__":
    main()
