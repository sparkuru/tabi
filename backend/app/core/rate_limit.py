"""Small single-process request limits for the default one-worker API runtime."""

from collections import deque
from math import ceil
from threading import Lock
from time import monotonic

from fastapi import HTTPException, Request, status


class SlidingWindowLimiter:
    """Bound repeated actions without persisting private request details."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._events: dict[str, deque[float]] = {}
        self._last_prune = 0.0

    def check(self, key: str, limit: int, period_seconds: int) -> None:
        """Record one attempt or return a standard retryable response."""
        now = monotonic()
        with self._lock:
            if now - self._last_prune >= 60:
                for existing_key, events in list(self._events.items()):
                    while events and events[0] <= now - 3600:
                        events.popleft()
                    if not events:
                        del self._events[existing_key]
                self._last_prune = now
            events = self._events.setdefault(key, deque())
            while events and events[0] <= now - period_seconds:
                events.popleft()
            if len(events) >= limit:
                retry_after = max(1, ceil(events[0] + period_seconds - now))
                raise HTTPException(
                    status.HTTP_429_TOO_MANY_REQUESTS,
                    "Too many requests",
                    headers={"Retry-After": str(retry_after)},
                )
            events.append(now)


limiter = SlidingWindowLimiter()


def client_address(request: Request) -> str:
    """Use the client address provided by the sole public reverse proxy."""
    forwarded = request.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
    return (forwarded or (request.client.host if request.client else "unknown"))[:128]
