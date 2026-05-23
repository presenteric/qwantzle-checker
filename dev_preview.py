#!/usr/bin/env python3
"""Local preview for the Cloudflare-shaped site.

Serves static files from public/ and stubs the API endpoints with in-memory storage.
Use this to verify the UI before deploying. For the real D1-backed API, deploy via wrangler.
"""

import json
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

PORT = 3456
PUBLIC_DIR = Path(__file__).parent / "public"

attempts = []
ryan_events = 0


class PreviewHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC_DIR), **kwargs)

    def do_POST(self):
        global ryan_events
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)

        if self.path == "/api/log":
            try:
                data = json.loads(body)
                attempts.append(data)
                self._json(200, {"ok": True, "total": len(attempts)})
            except Exception as e:
                self._json(400, {"error": str(e)})
            return

        if self.path == "/api/ryan-event":
            ryan_events += 1
            self._json(200, {"ok": True})
            return

        self.send_error(404)

    def do_GET(self):
        if self.path == "/api/count":
            self._json(200, {"total": len(attempts)})
            return
        super().do_GET()

    def _json(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    server = HTTPServer(("", PORT), PreviewHandler)
    print(f"CF preview: http://localhost:{PORT}")
    print(f"  (in-memory stubs for /api/log, /api/count, /api/ryan-event)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print(f"\n{len(attempts)} attempts captured, {ryan_events} ryan events.")
