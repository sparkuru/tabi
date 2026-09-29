"""API test fixtures using an isolated SQLite database."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import tables  # noqa: F401


@pytest.fixture
def client(
    tmp_path: pytest.TempPathFactory, monkeypatch: pytest.MonkeyPatch
) -> Iterator[TestClient]:
    """Yield an API client with clean tables and private media storage."""
    database_path = tmp_path / "test.db"
    monkeypatch.setenv("TABI_MEDIA_ROOT", str(tmp_path / "media"))
    get_settings.cache_clear()
    engine = create_engine(f"sqlite:///{database_path}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)

    def test_db() -> Iterator[Session]:
        """Provide request sessions from this test's database."""
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_db] = test_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    engine.dispose()
    get_settings.cache_clear()
