#!/usr/bin/env bash
# Create synthetic test accounts and original OCR drafts only in hako's isolated project.
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly REPO_ROOT

main() {
	[[ $# -eq 0 ]] || {
		printf 'Usage: ./infra/e2e-seed.sh\n' >&2
		return 2
	}
	"$REPO_ROOT/hako" compose exec -T api python -c '
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.security import hash_password
from app.db.session import get_engine
from app.models.tables import User

accounts = [
        ("admin@e2e.example.com", "system_admin", "E2E Administrator"),
        ("user@e2e.example.com", "user", "E2E User"),
]
for project in ["desktop", "mobile"]:
    for scenario in ["catalog", "completion", "import"]:
        for kind, role in [("admin", "system_admin"), ("user", "user")]:
            accounts.append((f"{kind}-{project}-{scenario}@e2e.example.com", role, f"E2E {kind}"))
with Session(get_engine()) as db:
    for email, role, name in accounts:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            db.add(User(email=email, role=role, display_name=name,
                        password_hash=hash_password("E2e-Checklist-Password-42")))
        elif user.role != role:
            raise RuntimeError("Synthetic account role differs; use a fresh isolated project")
    db.commit()
'
	"$REPO_ROOT/hako" compose exec -T api python -m app.seed_ocr --owner-email admin@e2e.example.com
}

main "$@"
