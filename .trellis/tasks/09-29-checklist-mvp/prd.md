# Checklist Check-in MVP

## Goal

Build the first usable web application described by the [product requirements](../../spec/product/requirements.md): browse public themed lists, understand each item, record repeat experiences, review personal history, and selectively share individual records. Mobile browser use is primary; desktop browsing and administration must work.

## Confirmed scope

- Email/password accounts and persistent login; public browsing without login.
- Administrator-managed published lists and items, with search, filtering, ordering, item details, same-list relations, and personal progress.
- Unlimited independent check-ins per user/item, optional note, optional multiple photos, optional user-approved position, individual edit/delete, and idempotent submission.
- Private check-ins by default, public experiences and stable share URLs, author history even after a list/item is unpublished, and administrator hiding with audit.
- Server-side authorization, protected media, password hashing, pagination, image metadata removal, backups, and a reproducible local runtime.
- An import/review path for two themes. The user confirmed `archive/ocr.md` is the complete source: seed its 70 food table rows, 26 district food names, and 76 travel rows with source lines. Publish them only as clearly marked OCR reference content, without claiming current place or transport verification. The reviewed import API still requires truthful per-row human review.

## Domain rules

- Each item belongs to exactly one list; two similar items in different lists remain separate.
- Progress counts distinct items with at least one nondeleted check-in. The check-in count counts records.
- Existing checked-in items and their parent lists retain history when unpublished; removal must not erase an author's history.
- A public check-in is visible only while it is public, undeleted, and not hidden. Public responses exclude precise check-in coordinates, email, and original image metadata.
- Check-in requests may omit note, media, or position, but at least one of note or photo is required to avoid an empty experience.
- Coordinates include an explicit coordinate system. Location permission denial cannot block submission.
- Time-sensitive imported facts must carry source and verification time; unverified material is labeled reference material.

## Out of scope

User-authored lists, email verification/recovery/deletion, social interactions, ranks, routes, on-site proof, unrestricted custom fields, offline sync, native apps, and automatic merchant scraping. These are deferred by the product requirements.

## Acceptance criteria

1. A guest can open published lists, items, and paginated public experiences; a check-in action leads to login.
2. A user can register, log in, stay logged in, log out, change nickname/avatar, and cannot edit another person's record or use administrator endpoints.
3. Two check-ins on one item appear separately in reverse chronological history; the list progress rises by one distinct item and the count is two.
4. Same-name items in different lists do not share progress or experiences.
5. A note-only check-in and a photo-only check-in work without location; failed submission leaves the entered form reusable.
6. Each record starts private. Public sharing works and becomes unavailable after privacy change, deletion, or moderator hide. Public payloads do not expose private fields.
7. An author can read existing check-ins after list/item unpublish; an administrator can edit, order, publish/unpublish, and review content actions in an audit log.
8. Two themes use the same check-in and history flow; reviewed import rejects duplicates inside a list and preserves provenance.
9. Retried or double-clicked submissions with one idempotency key produce one check-in. A distinct key permits an intentional repeat.
10. The project has reproducible startup and backend/frontend checks. The actual runtime and tests, rather than only scaffolding, demonstrate the main flow.

## Deferred decisions

Map provider, current place/transport verification and source dating, account recovery, user list creation, and retention policy require later product decisions; none may silently change the MVP behavior above.
