"""System administrator account contracts."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr


class AdminUserOut(BaseModel):
    """Account fields visible only to a system administrator."""

    id: str
    email: EmailStr
    display_name: str
    role: str
    created_at: datetime


class ChangeRoleIn(BaseModel):
    """Allowed account roles."""

    role: Literal["user", "content_admin", "system_admin"]
