"""Environment-backed application settings."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_prefix="TABI_", env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://tabi:tabi@localhost:5432/tabi"
    media_root: Path = Path("./media")
    session_days: int = 30
    cookie_secure: bool = False
    cookie_domain: str | None = None
    max_upload_bytes: int = 8 * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    """Return process settings, cached after first access."""
    return Settings()
