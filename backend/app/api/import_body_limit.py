"""Bound checklist import request bytes before any JSON decoding."""

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

MAX_IMPORT_BYTES = 2 * 1024 * 1024


class ImportBodyLimit:
    """Buffer at most 2 MiB for import routes, including chunked requests."""

    def __init__(self, app: ASGIApp) -> None:
        """Wrap only the two universal import paths."""
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """Reject oversized streams without asking FastAPI to decode them."""
        paths = {"/api/admin/checklist-imports", "/api/admin/checklist-imports/preview"}
        if scope["type"] != "http" or scope["path"].rstrip("/") not in paths:
            await self.app(scope, receive, send)
            return
        chunks = []
        size = 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            chunk = message.get("body", b"")
            size += len(chunk)
            if size > MAX_IMPORT_BYTES:
                response = JSONResponse(
                    {"detail": "Checklist JSON must not exceed 2 MiB"}, status_code=413
                )
                await response(scope, receive, send)
                return
            chunks.append(chunk)
            if not message.get("more_body", False):
                break
        body = b"".join(chunks)
        try:
            body.decode("utf-8")
        except UnicodeDecodeError:
            response = JSONResponse(
                {
                    "detail": [
                        {
                            "type": "encoding_invalid",
                            "loc": ["body"],
                            "msg": "Checklist JSON must be UTF-8",
                        }
                    ]
                },
                status_code=422,
            )
            await response(scope, receive, send)
            return
        delivered = False

        async def replay() -> Message:
            """Supply bounded bytes once, then forward disconnect messages."""
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": body, "more_body": False}
            return await receive()

        await self.app(scope, replay, send)
