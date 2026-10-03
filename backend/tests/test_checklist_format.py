"""Universal checklist import/publication and completion API regressions."""

import json
from copy import deepcopy
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.tables import AuditLog, Checklist, ChecklistImport, Item, ItemRelation, User
from app.schemas.checklist_format import ChecklistDocument
from app.services.checklist_imports import document_hash, normalize_document
from tests.test_core_flow import csrf, register


def document() -> dict:
    """A learning checklist with links, source inheritance and local relations."""
    return {
        "format": "tabi.checklist",
        "version": 1,
        "key": "learn-python",
        "source": "Synthetic learning fixture",
        "list": {"title": "Python basics", "category": "Learning"},
        "items": [
            {
                "key": "functions",
                "name": " Functions ",
                "links": [{"title": "Reference", "url": "https://example.com/functions"}],
                "related_keys": ["classes"],
            },
            {"key": "classes", "name": "Classes"},
        ],
    }


def make_admin(client: TestClient) -> str:
    """Promote only the isolated fixture account."""
    user = register(client, "format-admin@example.com")
    with next(client.app.dependency_overrides[get_db]()) as db:
        db.get(User, user["id"]).role = "content_admin"
        db.commit()
    return user["id"]


def imported(client: TestClient) -> dict:
    """Create one draft package through the authenticated boundary."""
    make_admin(client)
    response = client.post("/api/admin/checklist-imports", headers=csrf(client), json=document())
    assert response.status_code == 201, response.text
    return response.json()


def test_preview_import_reuse_edit_and_conflict(client: TestClient) -> None:
    """Preview writes nothing; immutable original digest never overwrites edits."""
    make_admin(client)
    payload = document()
    preview = client.post(
        "/api/admin/checklist-imports/preview", headers=csrf(client), json=payload
    )
    assert preview.status_code == 200, preview.text
    assert preview.json()["state"] == "ready"
    assert preview.json()["items"][0]["name"] == "Functions"
    assert preview.json()["items"][1]["sort_order"] == 1
    with next(client.app.dependency_overrides[get_db]()) as db:
        assert db.scalar(select(func.count()).select_from(Checklist)) == 0
        assert db.scalar(select(func.count()).select_from(AuditLog)) == 0
    first = client.post("/api/admin/checklist-imports", headers=csrf(client), json=payload)
    assert first.status_code == 201, first.text
    result = first.json()
    list_id = result["list_id"]
    item_id = result["item_ids_by_key"]["functions"]
    management = client.get(f"/api/admin/lists/{list_id}").json()
    assert management["total_item_count"] == management["draft_item_count"] == 2
    assert management["item_count"] == 0
    assert client.get(f"/api/lists/{list_id}").status_code == 404
    detail = client.get(f"/api/admin/lists/{list_id}/items").json()["items"][0]
    with next(client.app.dependency_overrides[get_db]()) as db:
        relation = db.scalar(select(ItemRelation).where(ItemRelation.item_id == item_id))
        assert relation.related_item_id == result["item_ids_by_key"]["classes"]
    assert detail["source"] == payload["source"]
    assert detail["verified_at"] is None
    assert (
        client.put(
            f"/api/admin/lists/{list_id}", headers=csrf(client), json={"title": "Edited"}
        ).status_code
        == 200
    )
    assert (
        client.post(f"/api/admin/items/{item_id}/unpublish", headers=csrf(client)).status_code
        == 200
    )
    text = json.dumps(dict(reversed(list(payload.items()))), indent=4)
    retry = client.post(
        "/api/admin/checklist-imports",
        headers={**csrf(client), "content-type": "application/json"},
        content=text,
    )
    assert retry.status_code == 200
    assert retry.json() == {**result, "reused": True}
    after = client.get(f"/api/admin/lists/{list_id}").json()
    assert after["title"] == "Edited"
    assert after["unpublished_item_count"] == 1
    changed = deepcopy(payload)
    changed["items"][0]["description"] = "Changed content"
    assert (
        client.post(
            "/api/admin/checklist-imports/preview", headers=csrf(client), json=changed
        ).json()["state"]
        == "conflict"
    )
    assert (
        client.post("/api/admin/checklist-imports", headers=csrf(client), json=changed).status_code
        == 409
    )
    changed["key"] = "another-list"
    assert (
        client.post("/api/admin/checklist-imports", headers=csrf(client), json=changed).status_code
        == 201
    )
    with next(client.app.dependency_overrides[get_db]()) as db:
        assert db.scalar(select(func.count()).select_from(Checklist)) == 2
        assert db.scalar(select(func.count()).select_from(ChecklistImport)) == 2


@pytest.mark.parametrize("version", [True, "1", 2, 1.0])
def test_strict_version(client: TestClient, version: object) -> None:
    """Reject version coercions and unsupported versions."""
    make_admin(client)
    payload = {**document(), "version": version}
    response = client.post(
        "/api/admin/checklist-imports/preview", headers=csrf(client), json=payload
    )
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "version"]


@pytest.mark.parametrize(
    "edit,path",
    [
        ({"key": "functions"}, ["items", 1, "key"]),
        ({"name": " FUNCTIONS "}, ["items", 1, "name"]),
        ({"related_keys": ["missing"]}, ["items", 1, "related_keys", 0]),
        ({"related_keys": ["classes"]}, ["items", 1, "related_keys", 0]),
        ({"related_keys": ["functions", "functions"]}, ["items", 1, "related_keys", 1]),
        ({"name": "   "}, ["items", 1, "name"]),
        ({"name": "\ufdfa" * 40}, ["items", 1, "name"]),
        ({"address": "\ufdfa" * 40}, ["items", 1, "name"]),
        ({"status": "published"}, ["items", 1, "status"]),
        ({"sort_order": "0"}, ["items", 1, "sort_order"]),
        ({"sort_order": 2147483648}, ["items", 1, "sort_order"]),
        (
            {"links": [{"title": "Docs", "url": "https://example.com", "unknown": 1}]},
            ["items", 1, "links", 0, "unknown"],
        ),
        ({"latitude": 1}, ["items", 1]),
    ],
)
def test_located_validation_without_partial_writes(
    client: TestClient, edit: dict, path: list
) -> None:
    """Cross-row and nested field errors identify the exact source position."""
    make_admin(client)
    payload = document()
    payload["items"][1].update(edit)
    response = client.post("/api/admin/checklist-imports", headers=csrf(client), json=payload)
    assert response.status_code == 422, response.text
    assert response.json()["detail"][0]["loc"] == ["body", *path]
    with next(client.app.dependency_overrides[get_db]()) as db:
        assert db.scalar(select(func.count()).select_from(Checklist)) == 0
        assert db.scalar(select(func.count()).select_from(Item)) == 0


def test_transport_limit_syntax_permissions_and_csrf(client: TestClient) -> None:
    """Raw source is capped before decoding; both import endpoints authorize writes."""
    assert client.post("/api/admin/checklist-imports/preview", json=document()).status_code == 401
    register(client, "ordinary-format@example.com")
    assert (
        client.post(
            "/api/admin/checklist-imports", headers=csrf(client), json=document()
        ).status_code
        == 403
    )
    make_admin(client)
    assert client.post("/api/admin/checklist-imports/preview", json=document()).status_code == 403
    malformed = client.post(
        "/api/admin/checklist-imports/preview",
        headers={**csrf(client), "content-type": "application/json"},
        content="{",
    )
    assert malformed.status_code == 422
    assert malformed.json()["detail"][0]["type"] == "json_invalid"
    invalid_encoding = client.post(
        "/api/admin/checklist-imports/preview",
        headers={**csrf(client), "content-type": "application/json"},
        content=b"\xff",
    )
    assert invalid_encoding.status_code == 422
    assert invalid_encoding.json()["detail"][0]["type"] == "encoding_invalid"
    oversized = client.post(
        "/api/admin/checklist-imports",
        headers={**csrf(client), "content-type": "application/json"},
        content=b" " * (2 * 1024 * 1024 + 1),
    )
    assert oversized.status_code == 413
    payload = document()
    payload["items"] = [{"key": f"item-{n}", "name": f"Item {n}"} for n in range(201)]
    assert (
        client.post("/api/admin/checklist-imports", headers=csrf(client), json=payload).status_code
        == 422
    )


def test_list_sort_order_respects_integer_storage_limit(client: TestClient) -> None:
    """An oversized integer gets a field error before any PostgreSQL write."""
    make_admin(client)
    payload = document()
    payload["list"]["sort_order"] = -2147483649
    response = client.post("/api/admin/checklist-imports", headers=csrf(client), json=payload)
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "list", "sort_order"]


def test_publish_all_preserves_removed_items_and_sources(client: TestClient) -> None:
    """Batch publication includes drafts only and reports actual status counts."""
    result = imported(client)
    list_id = result["list_id"]
    removed_id = result["item_ids_by_key"]["classes"]
    assert (
        client.post(f"/api/admin/items/{removed_id}/unpublish", headers=csrf(client)).status_code
        == 200
    )
    response = client.post(f"/api/admin/lists/{list_id}/publish-all", headers=csrf(client))
    assert response.status_code == 200, response.text
    assert response.json()["published_count"] == 1
    assert response.json()["skipped_unpublished_count"] == 1
    assert response.json()["list"]["draft_item_count"] == 0
    assert client.get(f"/api/lists/{list_id}").json()["item_count"] == 1
    item_id = result["item_ids_by_key"]["functions"]
    assert client.get(f"/api/items/{item_id}").json()["source"] == document()["source"]
    assert client.get(f"/api/items/{removed_id}").status_code == 404
    repeat = client.post(f"/api/admin/lists/{list_id}/publish-all", headers=csrf(client)).json()
    assert repeat["published_count"] == 0
    assert repeat["already_published_count"] == 1
    client.post(f"/api/admin/items/{item_id}/unpublish", headers=csrf(client))
    client.post(f"/api/admin/lists/{list_id}/unpublish", headers=csrf(client))
    assert (
        client.post(f"/api/admin/lists/{list_id}/publish-all", headers=csrf(client)).status_code
        == 422
    )
    assert client.get(f"/api/lists/{list_id}").status_code == 404
    empty = client.post("/api/admin/lists", headers=csrf(client), json={"title": "Empty"}).json()
    assert (
        client.post(f"/api/admin/lists/{empty['id']}/publish-all", headers=csrf(client)).status_code
        == 422
    )


def test_completion_empty_edit_repeats_and_share_privacy(client: TestClient) -> None:
    """Completion is private and reusable, while deliberate records remain independent."""
    result = imported(client)
    list_id = result["list_id"]
    item_id = result["item_ids_by_key"]["functions"]
    path = f"/api/items/{item_id}/complete"
    key = uuid4().hex
    headers = {**csrf(client), "idempotency-key": key}
    assert client.post(path, headers=headers).status_code == 404
    client.post(f"/api/admin/lists/{list_id}/publish-all", headers=csrf(client))
    assert client.post(path, headers={"idempotency-key": key}).status_code == 403
    first = client.post(path, headers=headers)
    assert first.status_code == 200, first.text
    record = first.json()
    assert record["note"] is None and record["media"] == [] and record["visibility"] == "private"
    assert client.post(path, headers=headers).json()["id"] == record["id"]
    assert (
        client.post(path, headers={**csrf(client), "idempotency-key": uuid4().hex}).json()["id"]
        == record["id"]
    )
    assert client.get(f"/api/lists/{list_id}").json()["record_count"] == 1
    assert (
        client.post(f"/api/items/{item_id}/checkins", headers=headers, json={}).status_code == 409
    )
    other_item = result["item_ids_by_key"]["classes"]
    assert client.post(f"/api/items/{other_item}/complete", headers=headers).status_code == 409
    edit_path = f"/api/checkins/{record['id']}"
    assert (
        client.patch(edit_path, headers=csrf(client), json={"note": "Now with content"}).status_code
        == 200
    )
    public = client.patch(
        edit_path, headers=csrf(client), json={"note": "  ", "visibility": "public"}
    )
    assert public.status_code == 200
    share_path = f"/api/shares/{record['share_id']}"
    shared = client.get(share_path).json()
    assert not shared["note"] and shared["media"] == []
    assert "position" not in shared and "email" not in shared
    assert client.post(path, headers=headers).json()["visibility"] == "public"
    second_key = uuid4().hex
    second = client.post(
        f"/api/items/{item_id}/checkins",
        headers={**csrf(client), "idempotency-key": second_key},
        json={},
    ).json()
    assert second["id"] != record["id"]
    assert client.get(f"/api/lists/{list_id}").json()["completed_count"] == 1
    assert (
        client.post(path, headers={**csrf(client), "idempotency-key": second_key}).status_code
        == 409
    )
    client.patch(edit_path, headers=csrf(client), json={"visibility": "private"})
    assert client.get(share_path).status_code == 404
    client.delete(edit_path, headers=csrf(client))
    assert client.post(path, headers=headers).status_code == 409
    assert client.get(f"/api/lists/{list_id}").json()["completed_count"] == 1
    client.delete(f"/api/checkins/{second['id']}", headers=csrf(client))
    assert client.get(f"/api/lists/{list_id}").json()["completed_count"] == 0


def test_import_transaction_failure_rolls_back(client: TestClient) -> None:
    """A late database failure leaves no list, items, identity, or audit behind."""
    make_admin(client)

    def fail_identity(session: Session, context: object, instances: object) -> None:
        """Trigger a real NOT NULL violation after list and item flushes."""
        for obj in session.new:
            if isinstance(obj, ChecklistImport):
                obj.payload_hash = None

    event.listen(Session, "before_flush", fail_identity)
    try:
        with pytest.raises(IntegrityError, match="NOT NULL constraint failed"):
            client.post("/api/admin/checklist-imports", headers=csrf(client), json=document())
    finally:
        event.remove(Session, "before_flush", fail_identity)
    with next(client.app.dependency_overrides[get_db]()) as db:
        for model in (Checklist, Item, ChecklistImport, AuditLog):
            assert db.scalar(select(func.count()).select_from(model)) == 0
    assert (
        client.post(
            "/api/admin/checklist-imports", headers=csrf(client), json=document()
        ).status_code
        == 201
    )


def test_examples_and_generated_schema_match_contract() -> None:
    """All shipped examples use the same parser and schema as API imports."""
    root = Path(__file__).resolve().parents[2]
    assert (
        json.loads((root / "docs/checklist.schema.json").read_text())
        == ChecklistDocument.model_json_schema()
    )
    paths = sorted((root / "backend/data/examples").glob("*.json"))
    assert len(paths) == 4
    for path in paths:
        parsed = ChecklistDocument.model_validate_json(path.read_text())
        assert normalize_document(parsed).items
    payload = document()
    first = normalize_document(ChecklistDocument.model_validate(payload))
    payload["items"][0]["sort_order"] = 0
    payload["items"][1]["sort_order"] = 1
    second = normalize_document(ChecklistDocument.model_validate(payload))
    assert document_hash(first) == document_hash(second)


def test_effective_sources_and_defaults_are_canonical() -> None:
    """Top-level inheritance and equivalent per-item sources have the same digest."""
    payload = document()
    inherited = normalize_document(ChecklistDocument.model_validate(payload))
    for entry in payload["items"]:
        entry["source"] = payload["source"]
    payload.pop("source")
    explicit = normalize_document(ChecklistDocument.model_validate(payload))
    assert document_hash(inherited) == document_hash(explicit)


@pytest.mark.parametrize("field", ["online_url", "links"])
@pytest.mark.parametrize(
    "url",
    ["https://example.com/" + "a" * 2048, "https://example.com/" + "\u5b66" * 300],
    ids=["oversized-source", "normalized-unicode"],
)
def test_url_storage_limit_is_part_of_contract(client: TestClient, field: str, url: str) -> None:
    """Reject oversized source or normalized URLs before PostgreSQL's varchar boundary."""
    make_admin(client)
    payload = document()
    payload["items"][0][field] = (
        url if field == "online_url" else [{"title": "Long URL", "url": url}]
    )
    response = client.post("/api/admin/checklist-imports", headers=csrf(client), json=payload)
    assert response.status_code == 422
    location = ["body", "items", 0, field] + ([0, "url"] if field == "links" else [])
    assert response.json()["detail"][0]["loc"] == location
