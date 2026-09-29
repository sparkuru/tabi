"""Database engine and per-request sessions."""

from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.core.config import get_settings


@lru_cache
def get_engine() -> Engine:
    """Create the configured database engine once per process."""
    return create_engine(get_settings().database_url, pool_pre_ping=True)


def get_db() -> Iterator[Session]:
    """Yield a session with rollback on failed requests."""
    with Session(get_engine()) as session:
        try:
            yield session
        except Exception:
            session.rollback()
            raise
