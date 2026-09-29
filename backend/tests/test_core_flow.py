"""Acceptance flows across auth, catalog, history and sharing."""

from uuid import uuid4

from fastapi.testclient import TestClient

from app.models.tables import User


def register(client: TestClient, email: str) -> dict[str, str]:
    """Create a user and return the own-account response."""
    response = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "correct horse battery",
            "display_name": email.split("@")[0],
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def csrf(client: TestClient) -> dict[str, str]:
    """Send the explicit CSRF header required for browser mutations."""
    return {"x-csrf-token": client.cookies["tabi_csrf"]}


def create_list(client: TestClient, title: str) -> str:
    """Create and publish one checklist as an administrator."""
    response = client.post(
        "/api/admin/lists",
        headers=csrf(client),
        json={"title": title, "summary": "A test theme"},
    )
    assert response.status_code == 201, response.text
    list_id = response.json()["id"]
    assert (
        client.post(f"/api/admin/lists/{list_id}/publish", headers=csrf(client)).status_code == 200
    )
    return list_id


def create_item(client: TestClient, list_id: str, name: str) -> str:
    """Create and publish one entry as an administrator."""
    response = client.post(
        f"/api/admin/lists/{list_id}/items",
        headers=csrf(client),
        json={"name": name, "summary": "A test item", "place_kind": "none"},
    )
    assert response.status_code == 201, response.text
    item_id = response.json()["id"]
    assert (
        client.post(f"/api/admin/items/{item_id}/publish", headers=csrf(client)).status_code == 200
    )
    return item_id


def test_repeat_checkins_progress_and_share_revocation(client: TestClient) -> None:
    """Repeat visits stay separate while progress and visibility remain correct."""
    admin = register(client, "admin@example.com")
    override = client.app.dependency_overrides
    assert override
    from app.db.session import get_db

    with next(override[get_db]()) as db:
        db.get(User, admin["id"]).role = "content_admin"
        db.commit()
    first_list = create_list(client, "Beijing food")
    second_list = create_list(client, "Weekend play")
    reordered = client.put(
        f"/api/admin/lists/{second_list}",
        headers=csrf(client),
        json={"title": "Weekend play", "summary": "A test theme", "sort_order": 7},
    )
    assert reordered.status_code == 200
    assert reordered.json()["sort_order"] == 7
    assert (
        next(
            entry
            for entry in client.get("/api/admin/lists").json()["items"]
            if entry["id"] == second_list
        )["sort_order"]
        == 7
    )
    first_item = create_item(client, first_list, "Same name")
    second_item = create_item(client, second_list, "Same name")

    first_key = uuid4().hex
    payload = {"note": "First visit", "visibility": "public"}
    first = client.post(
        f"/api/items/{first_item}/checkins",
        headers={**csrf(client), "idempotency-key": first_key},
        json=payload,
    )
    assert first.status_code == 201, first.text
    repeated = client.post(
        f"/api/items/{first_item}/checkins",
        headers={**csrf(client), "idempotency-key": first_key},
        json=payload,
    )
    assert repeated.status_code == 201
    assert repeated.json()["id"] == first.json()["id"]
    assert (
        client.post(
            f"/api/items/{first_item}/checkins",
            headers={**csrf(client), "idempotency-key": first_key},
            json={"note": "Changed request"},
        ).status_code
        == 409
    )

    second = client.post(
        f"/api/items/{first_item}/checkins",
        headers={**csrf(client), "idempotency-key": uuid4().hex},
        json={"note": "Second visit"},
    )
    assert second.status_code == 201, second.text
    assert client.get(f"/api/lists/{first_list}").json()["completed_count"] == 1
    assert client.get(f"/api/lists/{first_list}").json()["record_count"] == 2
    assert client.get(f"/api/lists/{second_list}").json()["completed_count"] == 0
    assert client.get(f"/api/lists/{second_list}/items").json()["items"][0]["id"] == second_item
    assert client.get("/api/me/checkins").json()["total"] == 2

    share_path = f"/api/shares/{first.json()['share_id']}"
    assert client.get(share_path).status_code == 200
    assert "position" not in client.get(share_path).json()
    assert "email" not in client.get(share_path).json()
    assert (
        client.patch(
            f"/api/checkins/{first.json()['id']}",
            headers=csrf(client),
            json={"visibility": "private"},
        ).status_code
        == 200
    )
    assert client.get(share_path).status_code == 404

    assert (
        client.post(f"/api/admin/lists/{first_list}/unpublish", headers=csrf(client)).status_code
        == 200
    )
    assert client.get(f"/api/lists/{first_list}").status_code == 404
    assert client.get(f"/api/checkins/{first.json()['id']}").status_code == 200
    assert (
        client.delete(f"/api/checkins/{second.json()['id']}", headers=csrf(client)).status_code
        == 204
    )
    assert client.get("/api/me/checkins").json()["total"] == 1


def test_guest_and_nonowner_permissions(client: TestClient) -> None:
    """A guest and another account cannot mutate an owned experience."""
    owner = register(client, "owner@example.com")
    from app.db.session import get_db

    with next(client.app.dependency_overrides[get_db]()) as db:
        db.get(User, owner["id"]).role = "content_admin"
        db.commit()
    list_id = create_list(client, "One list")
    item_id = create_item(client, list_id, "One item")
    checkin = client.post(
        f"/api/items/{item_id}/checkins",
        headers={**csrf(client), "idempotency-key": uuid4().hex},
        json={"note": "Private by default"},
    ).json()
    assert client.get(f"/api/shares/{checkin['share_id']}").status_code == 404
    assert client.post("/api/auth/logout", headers=csrf(client)).status_code == 204
    assert client.get(f"/api/checkins/{checkin['id']}").status_code == 401
    register(client, "other@example.com")
    assert (
        client.patch(
            f"/api/checkins/{checkin['id']}", headers=csrf(client), json={"note": "Changed"}
        ).status_code
        == 404
    )
    assert (
        client.post("/api/admin/lists", headers=csrf(client), json={"title": "No"}).status_code
        == 403
    )


def test_display_name_rejects_whitespace_after_normalization(client: TestClient) -> None:
    """Registration and profile edits cannot persist a blank public name."""
    blank = client.post(
        "/api/auth/register",
        json={
            "email": "blank@example.com",
            "password": "correct horse battery",
            "display_name": "   ",
        },
    )
    assert blank.status_code == 422
    user = register(client, "named@example.com")
    edit = client.patch("/api/auth/me", headers=csrf(client), json={"display_name": "   "})
    assert edit.status_code == 422
    assert client.get("/api/auth/me").json()["display_name"] == user["display_name"]


def test_login_attempts_have_a_retry_limit(client: TestClient) -> None:
    """Repeated password guesses for one email eventually receive a retry window."""
    payload = {"email": "limited@example.com", "password": "wrong password"}
    for _ in range(10):
        assert client.post("/api/auth/login", json=payload).status_code == 401
    blocked = client.post("/api/auth/login", json=payload)
    assert blocked.status_code == 429
    assert int(blocked.headers["Retry-After"]) > 0


def test_ocr_candidate_publishes_as_unverified_reference(client: TestClient) -> None:
    """An OCR reference retains provenance and no invented verification date."""
    admin = register(client, "ocr-admin@example.com")
    from app.db.session import get_db

    with next(client.app.dependency_overrides[get_db]()) as db:
        db.get(User, admin["id"]).role = "content_admin"
        db.commit()
    list_id = create_list(client, "OCR candidates")
    payload = {
        "name": "Candidate",
        "source": "archive/ocr.md:9 [OCR Markdown transcription only]",
        "address": "Example street 1",
        "place_kind": "physical",
        "missing_fields": ["verified_at", "coordinates"],
    }
    created = client.post(f"/api/admin/lists/{list_id}/items", headers=csrf(client), json=payload)
    assert created.status_code == 201
    item_id = created.json()["id"]
    assert (
        client.post(f"/api/admin/items/{item_id}/publish", headers=csrf(client)).status_code == 200
    )
    public = client.get(f"/api/items/{item_id}")
    assert public.status_code == 200
    assert public.json()["source"] == payload["source"]
    assert public.json()["verified_at"] is None
    assert "verified_at" in public.json()["missing_fields"]
    assert (
        client.put(
            f"/api/admin/items/{item_id}",
            headers=csrf(client),
            json={**payload, "source": None},
        ).status_code
        == 422
    )
    warning = "本清单整理自 archive/ocr.md 的 OCR 原始资料，仅供参考；出行前请核实。"
    assert (
        client.put(
            f"/api/admin/lists/{list_id}",
            headers=csrf(client),
            json={"title": "OCR candidates", "summary": warning},
        ).status_code
        == 200
    )
    edited_list = client.put(
        f"/api/admin/lists/{list_id}",
        headers=csrf(client),
        json={"title": "OCR candidates", "summary": "Custom note"},
    )
    assert edited_list.status_code == 200
    assert edited_list.json()["summary"] == f"Custom note\n{warning}"
