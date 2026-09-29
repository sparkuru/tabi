"""Photo-only, private media, reviewed import and moderation tests."""

from datetime import UTC, datetime
from io import BytesIO
from uuid import uuid4

from fastapi.testclient import TestClient
from PIL import Image

from app.core.config import get_settings
from app.db.session import get_db
from app.models.tables import User
from tests.test_core_flow import create_item, create_list, csrf, register


def _admin(client: TestClient) -> None:
    """Promote a test account for content setup."""
    user = register(client, "media-admin@example.com")
    with next(client.app.dependency_overrides[get_db]()) as db:
        db.get(User, user["id"]).role = "content_admin"
        db.commit()


def _jpeg_with_exif() -> bytes:
    """Produce a small image containing removable metadata."""
    image = Image.new("RGB", (100, 80), color="red")
    exif = Image.Exif()
    exif[270] = "private-note"
    data = BytesIO()
    image.save(data, format="JPEG", exif=exif)
    return data.getvalue()


def test_photo_only_checkin_and_public_media_scope(client: TestClient) -> None:
    """A photo-only record works and public readers receive stripped thumbnails."""
    _admin(client)
    list_id = create_list(client, "Food")
    item_id = create_item(client, list_id, "Place")
    upload = client.post(
        "/api/media/uploads",
        headers=csrf(client),
        files={"file": ("photo.jpg", _jpeg_with_exif(), "image/jpeg")},
    )
    assert upload.status_code == 201, upload.text
    checkin = client.post(
        f"/api/items/{item_id}/checkins",
        headers={**csrf(client), "idempotency-key": uuid4().hex},
        json={"upload_ids": [upload.json()["upload_id"]]},
    )
    assert checkin.status_code == 201, checkin.text
    record = checkin.json()
    assert record["note"] is None
    photo = record["media"][0]
    original = client.get(photo["original_url"])
    assert original.status_code == 200
    with Image.open(BytesIO(original.content)) as image:
        assert not image.getexif()

    assert client.post("/api/auth/logout", headers=csrf(client)).status_code == 204
    assert client.get(photo["thumbnail_url"]).status_code == 404
    assert client.get(photo["original_url"]).status_code == 404
    client.post(
        "/api/auth/login",
        json={"email": "media-admin@example.com", "password": "correct horse battery"},
    )
    assert (
        client.patch(
            f"/api/checkins/{record['id']}", headers=csrf(client), json={"visibility": "public"}
        ).status_code
        == 200
    )
    client.post("/api/auth/logout", headers=csrf(client))
    assert client.get(photo["thumbnail_url"]).status_code == 200
    assert client.get(photo["original_url"]).status_code == 404


def test_reviewed_import_dedupe_and_moderation(client: TestClient) -> None:
    """Imports require review, block same-list duplicates, and moderation revokes shares."""
    _admin(client)
    list_id = create_list(client, "Play")
    base = {
        "source": "manually reviewed OCR sheet",
        "reviewed_at": datetime.now(UTC).isoformat(),
        "rows": [
            {"item": {"name": "Museum", "address": "Example road"}, "transcription_reviewed": True}
        ],
    }
    imported = client.post(f"/api/admin/lists/{list_id}/imports", headers=csrf(client), json=base)
    assert imported.status_code == 201, imported.text
    assert (
        client.post(
            f"/api/admin/lists/{list_id}/imports", headers=csrf(client), json=base
        ).status_code
        == 409
    )
    unreviewed = {**base, "rows": [{"item": {"name": "Another"}, "transcription_reviewed": False}]}
    assert (
        client.post(
            f"/api/admin/lists/{list_id}/imports", headers=csrf(client), json=unreviewed
        ).status_code
        == 422
    )

    item_id = imported.json()["item_ids"][0]
    assert (
        client.post(f"/api/admin/items/{item_id}/publish", headers=csrf(client)).status_code == 200
    )
    record = client.post(
        f"/api/items/{item_id}/checkins",
        headers={**csrf(client), "idempotency-key": uuid4().hex},
        json={"note": "Good", "visibility": "public"},
    ).json()
    share_path = f"/api/shares/{record['share_id']}"
    assert client.get(share_path).status_code == 200
    assert (
        client.post(
            f"/api/admin/checkins/{record['id']}/hide",
            headers=csrf(client),
            json={"reason": "Policy review"},
        ).status_code
        == 204
    )
    assert client.get(share_path).status_code == 404


def test_cover_replacement_keeps_only_current_thumbnail(client: TestClient) -> None:
    """Cover updates remove generated full-size files and replaced derivatives."""
    _admin(client)
    list_id = create_list(client, "Covers")
    media_root = get_settings().media_root
    for _ in range(2):
        response = client.post(
            f"/api/media/lists/{list_id}/cover",
            headers=csrf(client),
            files={"file": ("cover.jpg", _jpeg_with_exif(), "image/jpeg")},
        )
        assert response.status_code == 204, response.text
        assert list((media_root / "originals").glob("*.jpg")) == []
        assert len(list((media_root / "thumbs").glob("*.jpg"))) == 1
