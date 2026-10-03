# Quality check — universal checklist format

2026-10-01. The existing frontend implementer thread was reassigned to the full task checker after the runtime refused a new checker thread. The coordinator independently reviewed the mobile UI. No commit, archive, production deployment, default-instance import, or spec change was performed by this checker.

## Scope and result

Reviewed the approved PRD/design/implementation plan, every referenced check manifest policy, applicable backend/frontend/product indexes, and 56 changed product/runtime/test/generated-artifact files. The scope covers backend API/schema/service/model/migration, frontend/admin/completion/history/sharing/auth/shell, generated API, authoritative docs/examples, Docker development wrappers and persistent Playwright tests.

**Quality check result: PASS.** Code, contract, unit, PostgreSQL, shell and definitive browser gates all passed. No known product-code defect remains from this review. Root retains the final spec synchronization and human-review decision.

## Findings fixed during checking

1. **HTTP preview crash** — `frontend/src/features/entries/use-completion.ts` eagerly called `crypto.randomUUID()` on an insecure HTTP alias. The existing new-record page had the same issue. Browser traces showed the item/list page crashing before interaction. `frontend/src/lib/request-key.ts:1` now generates 128-bit keys using `crypto.getRandomValues`, encoded as 32 hex characters within the API's 16–80 range. Both flows share it; failure retains the key, confirmed completion rotates it. No weak randomness or new dependency was added.
2. **Guest completion handoff lost its flag** — `frontend/src/router.tsx:45` accepted only literal `1`, while TanStack search normalization revalidated a boolean `true`. Traces showed login succeeding but no complete request. The validator now accepts raw and normalized forms and omits false values. The item page consumes the flag via URL replacement before the one-shot request. The persistent browser scenario covers login continuation and re-completion after deletion while the same page stays mounted.
3. **Populated textarea label instability** — implicit labels could include changing control text in strict browser label lookup. Import JSON and new/owner note fields now have separate explicit `htmlFor`/`id` labels. Browser tests keep exact accessible-name/label assertions.
4. **Normalized URL exceeded storage** — a 320-character source URL normalized to 2720 characters, although the schema's source `maxLength=2048` accepted it. `backend/app/schemas/checklist_format.py:20` adds a shared post-normalization check for `online_url` and link URLs. Parameterized ASCII/source-limit and Unicode/normalized-limit API regressions assert located `422` rather than a PostgreSQL storage error.
5. **Normalized item identity exceeded storage** — a 40-character NFKC compatibility name expanded to a 721-character identity for a `VARCHAR(512)` column. `backend/app/services/checklist_imports.py:31` rejects the oversized effective name/address identity with the item's `name` path and a correction message. Name and address expansion cases assert no partial content writes. The existing shared dedupe algorithm and legacy administration/OCR routes are unchanged.
6. **Import sorting exceeded SQL integer range** — strict integer fields had no bound despite being stored in SQL `Integer`. The import-only `ImportSortOrder` now exposes signed 32-bit bounds in both actual Schema and OpenAPI; list/item located-error regressions cover each boundary. Existing ordinary maintenance contracts were not broadened.
7. **Generated contract drift** — final backend URL constraints differed from the frontend's earlier OpenAPI. The final source model regenerated Schema and OpenAPI, then HeyAPI regenerated the client. No generated file was hand-edited. Format docs explain normalized URL/identity and integer storage limits.

Implementation-stage concerns resolved before the checker were also reviewed: completion keys rotate only after success; catalog state controls the completed display after deletion; draft/published/unpublished management labels are accurate; new imports can select their detail beyond the currently loaded list page; asset downloads are emitted/served directly from authoritative docs/examples.

## Actual validation

All development checks used approved project Docker wrappers, with sandbox escalation for Docker socket access. The failed unprivileged initial Docker call was an environment restriction, not counted as a passing check.

| Command / proof | Actual final result |
| --- | --- |
| `./hako python pytest -q tests/test_checklist_format.py -k 'located_validation or sort_order or url_storage'` | 18 passed, 11 deselected; 4.19s |
| `./hako python pytest -q` | 45 passed, 4 skipped; 10.22s. The skipped PostgreSQL cases ran separately below. |
| `HAKO_NETWORK=tabi-checklist-dev_default TABI_TEST_DATABASE_URL=<isolated synthetic DSN> ./hako python pytest -q tests/test_postgres_checklist.py` | 4 passed; 0.63s. Each test creates and drops only its own UUID schema. |
| `./hako python ruff check app tests migrations` | Passed |
| `./hako python ruff format --check app tests migrations` | 49 files already formatted |
| `./hako node npm run api:generate` | Passed using final actual `app.openapi()` |
| `./hako node npm run build` | `tsc -b` and Vite passed; 1754 modules; 1.64s. Current JS `index-Bs-eXz8F.js`. |
| `./hako node npm run format:check` | Passed, including persistent browser config/suite |
| Runtime model equality probe through `./hako python` | Actual OpenAPI equals `frontend/openapi.json`; actual Schema equals `docs/checklist.schema.json` |
| Production asset equality probe through `./hako python` | All six `frontend/dist/checklist-*` docs/schema/examples byte-for-byte match authoritative sources |
| `bash -n hako dev.sh infra/e2e-seed.sh` | Passed |
| `shellcheck hako dev.sh infra/e2e-seed.sh` | Passed |
| `shfmt -d hako dev.sh infra/e2e-seed.sh` | Passed |
| `git diff --check` | Passed |
| `./hako browser npm run test:e2e` | Definitive final run: 14 passed, 19.9s, exit 0, one worker; desktop and mobile Chromium against rebuilt isolated API/Web |

Backend implementer migration evidence was inspected: isolated PostgreSQL `alembic upgrade head` reached additive revision `a748bd701acf`; `alembic check` found no new upgrade operations. The checker did not modify a model/migration after this evidence, so migrations were not needlessly repeated. PostgreSQL races were rerun after the importer normalization changes.

The real PG suite synchronizes independent initial reads for same-key equal/different payload races, verifies loser rollback and exact table counts, injects a late actual NOT NULL error and verifies zero residue, and runs distinct-key concurrent completion through real independent sessions to verify one private record. SQLite results are not used to claim PostgreSQL locking.

The definitive browser log was inspected at `/tmp/tabi-universal-e2e-final.log`; the HTML report is `frontend/playwright-report/index.html`, with screenshots under `frontend/test-results/`. The rebuilt production bundle and doc sizes match the final build above. The guest continuation/deletion regression also passed separately in both viewports (2 tests, 2.4s) before the full run. Its mounted-cache check advances the browser clock beyond the existing 30-second freshness period before dispatching the visibility event, so it verifies actual refetch behavior and request-key renewal without changing the product freshness contract. Exact import/note label assertions remain in the suite.

## AC mapping

| AC / requirements | Review and automated evidence | Browser boundary |
| --- | --- | --- |
| AC1 / R1,R3 | Same parser validates four examples; Schema model equality; no-location defaults; strict fields/version/count/bytes/URLs/sorting; six authoritative build assets | Download-link scenario verifies real JSON/Markdown, not SPA HTML |
| AC2 / R2,R5 | No-write preview; admin/CSRF rules; located errors; actual late-transaction rollback; upload/paste shared raw transport; stale preview invalidation | Admin full upload/paste/error/keyboard/import path in both viewports |
| AC3 / R2 | Independent counts; list+draft transaction; skip removed items; reject empty; public catalog requires both published | Real publish and intentionally removed-item browser paths |
| AC4 / R7 | Canonical effective defaults/source/order; original immutable digest; edit/unpublish preserved; actual same/different PG races and zero orphans | Same-source reuse, changed-content conflict and no overwrite |
| AC5 / R3,R6 | New completion private/empty; existing-row reuse unchanged; operation fingerprints; row lock; repeat records and distinct progress; photo attach path intact | Complete → supplement text/photo → repeat/history/share; guest continuation regression |
| AC6 / R3,R6 | Empty create/edit/last-photo removal; private/public projections; ownership; share delete/private/hidden revocation; final-record progress restore | Real empty history/share, media authorization, content clearing and deletion flows |
| AC7 / R4 | Content-first homepage; no decorative English/promo/footer; data-conditional sections; actual provenance retained; explicit labels/44px/feedback/reduced-motion | 1280×800 and 375×812 Chromium, overflow/state/keyboard assertions and coordinator visual review |
| AC8 / R2,R3,R7 | Existing OCR tests pass; 172-row seed/source/stable-ID/upgrade/legacy reviewed-import regressions included; old seed/data/schema/migrations have no diff | Browser snapshot compares all 172 original OCR draft IDs/source/status/verification before/after unrelated operations |

## Remaining concrete limits

- Mobile Chromium touch emulation does not establish physical-device/mobile-engine behavior or a full assistive-technology audit. Screenshots are review evidence, not approved pixel baselines.
- Installed FastAPI/Starlette deprecation warnings are informational; no dependency upgrade or warning suppression was added.
- Root owns spec synchronization and main verification/human-review decision. New empty records still need compatibility handling before reverting to code that required nonempty records; no deletion-based rollback was introduced.
