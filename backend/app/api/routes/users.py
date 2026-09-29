"""System administrator account management."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, require_auth, require_system_admin
from app.db.session import get_db
from app.models.tables import AuditLog, User
from app.schemas.admin import AdminUserOut, ChangeRoleIn
from app.schemas.catalog import Page

router = APIRouter(prefix="/admin/users", tags=["system-admin"])


def _admin_user(user: User) -> AdminUserOut:
    """Project account details for privileged administration."""
    return AdminUserOut(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        created_at=user.created_at,
    )


@router.get("", response_model=Page[AdminUserOut])
def list_users(
    auth: Annotated[AuthContext, Depends(require_auth)],
    db: Annotated[Session, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[AdminUserOut]:
    """Page through accounts for a system administrator."""
    if auth.user.role != "system_admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "System administrator role required")
    total = db.scalar(select(func.count()).select_from(User)) or 0
    rows = db.scalars(select(User).order_by(User.created_at.desc()).limit(limit).offset(offset))
    return Page(items=[_admin_user(user) for user in rows], total=total, limit=limit, offset=offset)


@router.put("/{user_id}/role", response_model=AdminUserOut)
def change_role(
    user_id: str,
    payload: ChangeRoleIn,
    auth: Annotated[AuthContext, Depends(require_system_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> AdminUserOut:
    """Change one account role and record the action."""
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")
    if user.id == auth.user.id and payload.role != "system_admin":
        raise HTTPException(status.HTTP_409_CONFLICT, "Cannot remove your own system role")
    old_role = user.role
    user.role = payload.role
    db.add(
        AuditLog(
            actor_id=auth.user.id,
            action="user.role.change",
            target_type="user",
            target_id=user.id,
            reason=f"{old_role} -> {payload.role}",
        )
    )
    db.commit()
    return _admin_user(user)
