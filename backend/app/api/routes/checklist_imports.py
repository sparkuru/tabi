"""Administrator-only universal checklist preview and import."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, require_admin
from app.db.session import get_db
from app.schemas.checklist_format import ChecklistDocument, ChecklistImportOut, ChecklistPreviewOut
from app.services.checklist_imports import (
    document_hash,
    find_import,
    import_document,
    normalize_document,
)

router = APIRouter(prefix="/admin/checklist-imports", tags=["admin"])


@router.post("/preview", response_model=ChecklistPreviewOut)
def preview_checklist(
    payload: ChecklistDocument,
    auth: Annotated[AuthContext, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> ChecklistPreviewOut:
    """Validate and preview without writing content or audit rows."""
    payload = normalize_document(payload)
    prior = find_import(db, payload.key)
    state = "ready"
    if prior is not None:
        state = "existing" if prior.payload_hash == document_hash(payload) else "conflict"
    return ChecklistPreviewOut(
        key=payload.key,
        title=payload.list.title,
        item_count=len(payload.items),
        items=payload.items,
        state=state,
        existing_list_id=prior.list_id if prior else None,
    )


@router.post(
    "",
    response_model=ChecklistImportOut,
    status_code=201,
    responses={200: {"model": ChecklistImportOut}},
)
def create_checklist_import(
    payload: ChecklistDocument,
    response: Response,
    auth: Annotated[AuthContext, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> ChecklistImportOut:
    """Revalidate and atomically import, or return the immutable original result."""
    result = import_document(db, payload, auth.user.id)
    if result.reused:
        response.status_code = 200
    return result
