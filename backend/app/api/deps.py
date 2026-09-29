"""Request authorization dependencies."""

from dataclasses import dataclass
from datetime import UTC, datetime
from hmac import compare_digest
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import secret_hash
from app.db.session import get_db
from app.models.tables import LoginSession, User


@dataclass(frozen=True)
class AuthContext:
    """Current account and revocable browser session."""

    user: User
    session: LoginSession


def _aware(value: datetime) -> datetime:
    """Normalize SQLite's naive timestamp during tests."""
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value


def optional_auth(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> AuthContext | None:
    """Resolve an active browser session when present."""
    token = request.cookies.get("tabi_session")
    if not token:
        return None
    login_session = db.scalar(
        select(LoginSession).where(LoginSession.token_hash == secret_hash(token))
    )
    if login_session is None or _aware(login_session.expires_at) <= datetime.now(UTC):
        return None
    user = db.get(User, login_session.user_id)
    return AuthContext(user, login_session) if user else None


def require_auth(auth: Annotated[AuthContext | None, Depends(optional_auth)]) -> AuthContext:
    """Require a valid account session."""
    if auth is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Login required")
    return auth


def require_csrf(
    request: Request,
    auth: Annotated[AuthContext, Depends(require_auth)],
    x_csrf_token: Annotated[str | None, Header()] = None,
) -> AuthContext:
    """Validate the readable CSRF cookie and explicit request header."""
    cookie = request.cookies.get("tabi_csrf")
    if not cookie or not x_csrf_token or not compare_digest(cookie, x_csrf_token):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "CSRF check failed")
    if not compare_digest(secret_hash(cookie), auth.session.csrf_hash):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "CSRF check failed")
    return auth


def require_admin(auth: Annotated[AuthContext, Depends(require_csrf)]) -> AuthContext:
    """Require a content or system administrator for mutations."""
    if auth.user.role not in {"content_admin", "system_admin"}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Administrator role required")
    return auth


def require_admin_view(auth: Annotated[AuthContext, Depends(require_auth)]) -> AuthContext:
    """Require an administrator for read-only management views."""
    if auth.user.role not in {"content_admin", "system_admin"}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Administrator role required")
    return auth


def require_system_admin(auth: Annotated[AuthContext, Depends(require_csrf)]) -> AuthContext:
    """Require the system administrator role."""
    if auth.user.role != "system_admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "System administrator role required")
    return auth
