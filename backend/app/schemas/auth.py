"""Account request and response contracts."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class DisplayName(BaseModel):
    """Shared display-name normalization for account writes."""

    display_name: str = Field(min_length=1, max_length=80)

    @field_validator("display_name")
    @classmethod
    def nonblank_name(cls, value: str) -> str:
        """Reject names that become empty after trimming."""
        name = value.strip()
        if not name:
            raise ValueError("Display name cannot be blank")
        return name


class RegisterIn(DisplayName):
    """Account registration input."""

    email: EmailStr
    password: str = Field(min_length=12, max_length=128)


class LoginIn(BaseModel):
    """Password login input."""

    email: EmailStr
    password: str


class ProfileIn(DisplayName):
    """Editable public profile fields."""


class UserOut(BaseModel):
    """Own account response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    display_name: str
    avatar_url: str | None = None
    role: str
    created_at: datetime
