"""Account and browser session endpoints."""

from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, require_auth, require_csrf
from app.core.config import get_settings
from app.core.rate_limit import client_address, limiter
from app.core.security import hash_password, new_secret, secret_hash, verify_password
from app.db.session import get_db
from app.models.tables import LoginSession, User
from app.schemas.auth import LoginIn, ProfileIn, RegisterIn, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_out(user: User) -> UserOut:
    """Build an own-account response without storage keys."""
    return UserOut(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        avatar_url=f"/api/media/avatar/{user.id}" if user.avatar_key else None,
        role=user.role,
        created_at=user.created_at,
    )


def _issue_session(response: Response, user: User, db: Session) -> None:
    """Create a revocable session and set browser cookies."""
    settings = get_settings()
    token = new_secret()
    csrf = new_secret()
    db.add(
        LoginSession(
            user_id=user.id,
            token_hash=secret_hash(token),
            csrf_hash=secret_hash(csrf),
            expires_at=datetime.now(UTC) + timedelta(days=settings.session_days),
        )
    )
    db.commit()
    max_age = settings.session_days * 24 * 60 * 60
    response.set_cookie(
        "tabi_session",
        token,
        max_age=max_age,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        domain=settings.cookie_domain,
    )
    response.set_cookie(
        "tabi_csrf",
        csrf,
        max_age=max_age,
        httponly=False,
        secure=settings.cookie_secure,
        samesite="lax",
        domain=settings.cookie_domain,
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterIn,
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> UserOut:
    """Create an account and immediately sign in."""
    limiter.check(f"register:{client_address(request)}", 30, 3600)
    email = str(payload.email).lower()
    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        display_name=payload.display_name.strip(),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered") from exc
    db.refresh(user)
    _issue_session(response, user, db)
    return _user_out(user)


@router.post("/login", response_model=UserOut)
def login(
    payload: LoginIn,
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> UserOut:
    """Exchange a password for a browser session."""
    limiter.check(f"login-ip:{client_address(request)}", 60, 900)
    limiter.check(f"login-email:{str(payload.email).lower()}", 10, 900)
    user = db.scalar(select(User).where(User.email == str(payload.email).lower()))
    if user is None or not verify_password(user.password_hash, payload.password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    _issue_session(response, user, db)
    return _user_out(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    auth: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    """Revoke the current browser session."""
    db.delete(auth.session)
    db.commit()
    response.delete_cookie("tabi_session", domain=get_settings().cookie_domain)
    response.delete_cookie("tabi_csrf", domain=get_settings().cookie_domain)


@router.get("/me", response_model=UserOut)
def me(auth: Annotated[AuthContext, Depends(require_auth)]) -> UserOut:
    """Return the logged-in account."""
    return _user_out(auth.user)


@router.patch("/me", response_model=UserOut)
def edit_profile(
    payload: ProfileIn,
    auth: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_db)],
) -> UserOut:
    """Change the display name shown publicly."""
    auth.user.display_name = payload.display_name.strip()
    db.commit()
    db.refresh(auth.user)
    return _user_out(auth.user)
