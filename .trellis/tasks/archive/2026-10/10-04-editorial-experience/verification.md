# Verification — editorial experience

## Outcome and boundary

2026-10-04: existing application adopts an original city field-journal identity:
ivory paper, forest ink, burnt-orange accents, local serif display copy,
original folded-map/journal/compass SVG, a responsive editorial home and shared
forms/cards/navigation. No API, database schema, generated client, dependency,
runtime configuration or existing content changes belong to this diff.

User authorized autonomous implementation and repeated visual refinement in
the active goal. In response to the actual-preview administrator credential
request, user explicitly replied “自己注册、自己测试”. One synthetic account was
registered through the actual UI; only this account received temporary
`content_admin` for non-writing admin preview checks, then returned to `user`.
No existing account password or role was changed. Original system-admin count
remains 2. Credentials stay in a mode-0600 temporary JSON file, outside Git and
reports; no password, session token or database secret is recorded here.

## Acceptance mapping

| Requirement / acceptance | Current implementation and evidence |
| --- | --- |
| R1 / AC1 | Semantic home h1, section h2 and card h3; native discovery anchor; original city artwork; three distinct fallback card covers. Live counts, titles, categories and progress use the API. Final home screenshots reviewed at 375/768/1440px. |
| R2 / AC2 | Shared paper/ink/accent tokens, intros, cards, fields and controls across discovery, lists/items, auth, profile, records/history, sharing and admin. Actual profile, focused upload, successful share and admin screenshots reviewed. Standalone action/navigation targets have 44px minimum height; large cards remain whole links. |
| R3 / AC4 | Short CSS entrance, hover/press and transform-based progress feedback. Native scrolling; no perpetual decorative motion. Reduced-motion test verifies no entrance or card movement and no image/art hover transition. Loading spinner reflects actual pending work. |
| R4 / AC5 | 24 real desktop/mobile isolated browser checks preserve discovery, imports/publication, guest intent, completion, repeat records, editing, private media, sharing/revocation and deletion. Actual-preview suite adds 2 authenticated desktop/mobile checks. |
| R5 / AC3 | 320/375/768/1024/1440px; 768×540 landscape; 200% root text size; long Chinese titles; actual main focus from skip link; keyboard tabs and upload focus; real list search; pending/failure/retry logout. No horizontal overflow in assertions. |
| AC6 | Eight dimensions audited below against actual renders; discovered defects fixed and final candidate rebuilt/retested. Award quality is a design target, not a claimed award or jury certification. |

## Checks actually executed

- `./hako node npm run typecheck`: passed; final Docker production build also
  runs `tsc -b` against the candidate.
- `./hako node npm run typecheck:e2e` and `typecheck:preview`: passed.
- `./hako node npm run format:check`: passed after final CSS adjustment.
- `./hako node npm run build`: passed earlier; final `./dev.sh` and
  `./preview.sh build` production builds passed again. Final output: CSS
  31.91KB (gzip 7.63KB), JS 482.43KB (gzip 148.05KB), font 11.70KB.
- `./hako browser npm run test:e2e`: **24 passed**, Chromium desktop 1280×800
  and mobile 375×812, one worker, no retries. All existing suites plus five
  editorial cases per project. Latest rerun includes final secondary-text color.
- `npm run test:preview` in the pinned Playwright Docker image, host network,
  actual origin `http://192.168.9.4:7081`, owner-only credentials path:
  **2 passed**, desktop/mobile. Real login, content-admin identity, admin page,
  valid synthetic JSON preview, unchanged checklist inventory and logout.
- Actual UI self-registration: 201 desktop, subsequent mobile login 200;
  profile saved then original synthetic nickname restored; empty history;
  ordinary user denied admin; logout 204 and subsequent `/auth/me` 401.
- Final post-restoration browser check: both widths log in with role `user`,
  cannot access admin, log out successfully; actual rendered secondary-text
  color and HTTP resource hashes match the final tested candidate.
- Actual anonymous home at all five widths: no overflow, local font loaded,
  no page errors. Current preview public inventory is **0**; no example content
  was published to make screenshots look populated.
- `git diff --check` and task context validation: passed. Implement/check each
  explicitly register 16 real, unique references including applicable policies.

Backend tests and database migration checks were not rerun for this frontend
presentation task; backend/schema/API contracts were not edited. Browser flows
exercise the existing real API/database behavior relevant to the UI.

## Runtime identity

Actual `infra` preview and isolated `tabi-checklist-dev` runtime contain
identical index/JS/CSS/font hashes. Browser HTTP responses from the confirmed
origin also match these files:

| Resource | SHA-256 |
| --- | --- |
| index.html | `e6ee42da5ebdf8bc3bbf225e3dfdee6bf71639e9157123df9ab6f655e6a4b55d` |
| assets/index-DP5zqlRC.js | `ca23d277b33f46b1bcfc89581735d6c3f36211275626d91a1f12f05a66e74c47` |
| assets/index-Bej_pUyQ.css | `73668c77219df2c32abb1ddcad07bfa3e22b98e1feacd11e0ae9e12603b9e4e2` |
| assets/journal-display-DOymQnA7.woff2 | `b2c1fed26e194d5a965454f91974d30efb46b8bc667860916cf0f974d9caeb2b` |

Preview was rebuilt and started with the existing `preview.sh`; root dotenv,
ports, Compose identity and persistent volumes were preserved. No public
hosting release or Git commit/archive was requested.

## Eight-dimension rendered audit

| Dimension | Findings, refinement and final review |
| --- | --- |
| Typography | Static serif headlines give the journal its voice; user content stays sans and wraps. Replaced fixed text sizes with rem; tested 200% text. Local font subset prevents Linux browser fallback changing the hero composition. Registration hint now describes the password input separately from its exact accessible label. |
| Whitespace | Desktop asymmetric hero, bounded forms, thin rules and generous section gaps. Phone hero stacks with a smaller illustration. Removed empty-summary reservation in cards; aligned progress/meta via flexible content. Final cards no longer retain an unhelpful blank paragraph. |
| Hierarchy | Single primary discovery CTA, visible h1/h2/h3 structure, collection number/category then title/progress. Mobile collection heading deliberately splits into balanced two-line phrases; process labels fit three columns. Detail controls remain directly below progress. |
| Color | Consistent ivory/forest/terracotta; cover variants are muted. Final contrast calculations: ink/paper 10.29:1, accent/paper 5.39:1, secondary `#706b62`/paper over 4.5:1, white/button over 9:1. Darkened stone-500 after finding original secondary text below 4.5:1 on the new paper. Decorative rules/art are not readable text. |
| Motion | Short entrance and restrained card/CTA feedback; progress animates through transforms. Card/art hover movement is restricted to hover-capable devices; reduced-motion suppresses entrances, transitions and hover transforms. No scroll interception, parallax loop or animation dependency. |
| Microinteractions | Visible selected tabs/nav, keyboard roving tab focus, 44px controls, upload-wrapper focus, proper main focus, busy submit/logout and visible logout error with real retry. Search icon clearance fixed through unlayered `.field-search` after Tailwind padding was overridden. |
| Responsive | Real rendered widths 320–1440, landscape and enlarged text remain usable. Fixed desktop profile target shrinking to 20px, small back/view/share links and long-email overflow. Final record/share/profile screenshots confirm shared shell and forms at phone width. |
| Originality | Independent journal direction and hand-written imaginary city/map, notebook/ticket and compass artwork tie discovery to recording experiences. No stock hero, borrowed layout, fake destination data or remote font. Licensed 31-glyph Noto subset has exact copyright and embedded notices retained in third_party. |

Independent read-only visual review found the target/focus/overflow issues
above; its findings were reproduced and resolved. A bounded implementation
review added the keyboard/target/reduced-motion assertions and record/share
artifacts. Parent reviewed their edits and ran the final candidate checks.
No unresolved obvious layout or interaction defect remains in the reviewed
pages and states.

## Artifacts and fixture limits

Reviewed artifacts are under ignored `frontend/test-results/` and
`/tmp/tabi-editorial-review/`: home at all widths, auth including 200% text,
list/search, new-record upload focus, record/history, successful and revoked
share, profile and masked admin preview. Actual API/registration/final checks
produce sanitized JSON results. Credentials and private browser state are not
included in the task.

Compact isolated visual screenshots trim the real list response to its first
three records for comparing covers; they do not replace names/statistics or
represent actual preview content. The 24-case regression uses unmodified real
API data; a dedicated long-title stress case modifies text expressly for the
responsive assertion.

Current user-owned OCR seed is already incompatible with its schema (missing
source fields/empty prefix). Normal seed initialization fails; do not repair
or revert it as part of this visual task. Isolated initialization used the
known-valid seed from commit `86b4318` through a temporary fixture and explicit
isolated database URL; it found 2 existing OCR drafts/172 rows and added no OCR
lists. Existing unrelated test data and actual preview data were preserved.

Human review classification: `human-optional` for remaining aesthetic
preference after the authorized autonomous self-review. Chromium mobile is
touch emulation; physical phones, Safari/Firefox and assistive technologies
have not been verified. No approved pixel baseline, accessibility scanner,
performance lab measurement, external-device LAN reachability or HTTPS
certificate acceptance is claimed. These limits do not invalidate the tested
responsive browser flows or create a new deployment/commit authorization.

## Standing spec continuation — 2026-10-05

User requested promoting the award-quality constraint and approved adaptation
to Trellis specs for future visual and mental-model continuity. R6/AC7 are met
by `.trellis/spec/frontend/experience-design.md`: exact latest user quotation,
cross-theme checklist/item/completion/additional-record/history/private and
optional-share model, source-backed palette/type/layout/art/component/motion
rules, and an eight-dimension rendered review/refinement stopping criterion.
The contract separates the journal metaphor from travel-only product behavior.

Frontend/product indexes, frontend quality guidance and Trellis Plus frontend
workflow now point to this authority and require actual reading plus explicit
implement/check registration for future UI tasks. Current manifests each have
**17** unique existing paths; the new contract occurs once in each. This is the
current count; the 16-entry result above belongs to the earlier implementation.

Focused read-only Trellis review verified 29 local Markdown targets, source
values/layout/motion timings, product mental model and context loading. The
latest quote (including its space after “以”) matches exactly. Review identified
over-broad hover wording; it was narrowed to the card/art behavior actually
gated by hover capability. Both focused findings are resolved.

`task.py validate` and `git diff --check` pass. Protected tracked Trellis runtime
files remain identical to HEAD; no application, environment or credential
changes were made in this continuation. Application/browser suites were not
rerun for these spec-only edits; earlier results remain dated evidence, not new
test executions. Human-review classification is `human-not-needed` for this
source-checked documentation promotion. Work remains uncommitted/unarchived.

## Commit and finish authorization — 2026-10-05

User explicitly replied “提交” after reviewing the completed implementation and
standing specifications. Commit scope is this task's frontend presentation,
browser regressions, shared specs/mainline, exact font notices and task evidence.
No existing unrelated work, runtime configuration, credentials or ignored test
artifacts are included. Earlier statements about no commit request describe
their respective implementation/spec-review stage and are superseded here.

Before committing, the confirmed HTTP origin was checked again with the
dedicated ordinary-user account: desktop/mobile login, role `user`, admin denial,
logout/session invalidation and index/JS/CSS/font hashes all passed. The earlier
24-case isolated and 2-case content-admin acceptance results cover the same
unchanged application candidate; no role elevation was repeated for commit.
Task context remains 17 unique entries per manifest and diff checks pass.

Work committed as `cf6b7f9dde7f5e3228e99df725db62e57ce2d476`. The task was
archived on 2026-10-05 through `task.py archive --no-commit`, then a separate
archive commit preserves its completion metadata and the single required Codex
trailer. The moved design link was rebased; context paths remain repository-root
relative. Final work/archive references are maintained in mainline and the
independent developer journal.
