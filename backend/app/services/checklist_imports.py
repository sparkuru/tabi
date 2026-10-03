"""Normalize and atomically import a universal checklist document."""

from hashlib import sha256
from json import dumps

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.tables import AuditLog, Checklist, ChecklistImport, Item, ItemLink, ItemRelation
from app.schemas.checklist_format import ChecklistDocument, ChecklistImportOut
from app.services.imports import item_dedupe_key


def _field_error(path: list[str | int], message: str) -> HTTPException:
    """Return the same located error envelope as ordinary API validation."""
    return HTTPException(422, [{"type": "value_error", "loc": ["body", *path], "msg": message}])


def normalize_document(payload: ChecklistDocument) -> ChecklistDocument:
    """Resolve defaults/source and validate all same-document relationships."""
    keys: dict[str, int] = {}
    identities: dict[str, int] = {}
    items = []
    for index, item in enumerate(payload.items):
        if item.key in keys:
            raise _field_error(
                ["items", index, "key"], f"Duplicate key from items[{keys[item.key]}]"
            )
        identity = item_dedupe_key(item.name, item.address)
        if len(identity) > 512:
            raise _field_error(
                ["items", index, "name"],
                "Normalized name/address identity exceeds 512 characters; shorten name or address",
            )
        if identity in identities:
            raise _field_error(
                ["items", index, "name"],
                f"Duplicate name/address from items[{identities[identity]}]",
            )
        keys[item.key] = index
        identities[identity] = index
        items.append(
            item.model_copy(
                update={
                    "sort_order": item.sort_order
                    if "sort_order" in item.model_fields_set
                    else index,
                    "source": item.source if item.source is not None else payload.source,
                }
            )
        )
    for index, item in enumerate(items):
        seen: set[str] = set()
        for related_index, key in enumerate(item.related_keys):
            if key not in keys or key == item.key or key in seen:
                raise _field_error(
                    ["items", index, "related_keys", related_index],
                    "Related key must exist in this file, be distinct, and occur once",
                )
            seen.add(key)
    return payload.model_copy(update={"items": items, "source": None})


def document_hash(payload: ChecklistDocument) -> str:
    """Hash validated effective values, independently of object order/whitespace."""
    encoded = dumps(
        payload.model_dump(mode="json"), sort_keys=True, separators=(",", ":"), ensure_ascii=False
    ).encode("utf-8")
    return sha256(encoded).hexdigest()


def find_import(db: Session, key: str) -> ChecklistImport | None:
    """Read the immutable original identity."""
    return db.scalar(select(ChecklistImport).where(ChecklistImport.package_key == key))


def _reuse(prior: ChecklistImport, digest: str) -> ChecklistImportOut:
    """Compare original content without restoring later administrator edits."""
    if prior.payload_hash != digest:
        raise HTTPException(409, "Checklist key has different content; edit the existing checklist")
    return ChecklistImportOut(
        list_id=prior.list_id, item_ids_by_key=prior.item_ids_by_key, reused=True
    )


def import_document(db: Session, payload: ChecklistDocument, actor_id: str) -> ChecklistImportOut:
    """Commit content, references, identity and audit together; retry a race loser."""
    payload = normalize_document(payload)
    digest = document_hash(payload)
    prior = find_import(db, payload.key)
    if prior is not None:
        return _reuse(prior, digest)
    item_ids: dict[str, str] = {}
    try:
        checklist = Checklist(**payload.list.model_dump(), created_by=actor_id)
        db.add(checklist)
        db.flush()
        for entry in payload.items:
            values = entry.model_dump(exclude={"key", "related_keys", "links"})
            values["online_url"] = str(entry.online_url) if entry.online_url else None
            item = Item(
                list_id=checklist.id,
                dedupe_key=item_dedupe_key(entry.name, entry.address),
                **values,
            )
            db.add(item)
            db.flush()
            item_ids[entry.key] = item.id
            for link in entry.links:
                db.add(
                    ItemLink(item_id=item.id, title=link.title, url=str(link.url), kind=link.kind)
                )
        for entry in payload.items:
            for related_key in entry.related_keys:
                db.add(
                    ItemRelation(item_id=item_ids[entry.key], related_item_id=item_ids[related_key])
                )
        db.add(
            ChecklistImport(
                package_key=payload.key,
                format_version=payload.version,
                payload_hash=digest,
                list_id=checklist.id,
                item_ids_by_key=item_ids,
                imported_by=actor_id,
            )
        )
        db.add(
            AuditLog(
                actor_id=actor_id,
                action="list.import-checklist",
                target_type="list",
                target_id=checklist.id,
                reason=f"key={payload.key}; count={len(item_ids)}",
            )
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        prior = find_import(db, payload.key)
        if prior is None:
            raise
        return _reuse(prior, digest)
    return ChecklistImportOut(list_id=checklist.id, item_ids_by_key=item_ids, reused=False)
