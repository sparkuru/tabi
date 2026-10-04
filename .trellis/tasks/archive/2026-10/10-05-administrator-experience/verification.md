# Administrator workspace verification

## Current status

Implementation and runnable verification passed on 2026-10-05, following the
user's “开始” approval. The actual preview serves the final candidate. The user
accepted the result with “不错；可以提交”, satisfying visual review and authorizing
the work commit and normal task wrap-up. Earlier intermediate findings below
are retained as history and resolved by the final evidence section.

## Environment and baseline

- Existing user preview: `infra`, confirmed origin `http://192.168.9.4:7081`.
- Existing isolated test stack: `tabi-checklist-dev`, web on loopback 18080.
  Docker inspection confirmed separate web/API/database containers for both.
  Unrelated running projects were left untouched.
- Docker socket access failed in the sandbox; narrowly scoped
  `require_escalated` commands succeeded. This is an execution permission
  boundary, not an application failure or a bypassed browser check.
- Read-only database inspection confirmed the existing synthetic desktop and
  mobile import fixture accounts are system administrators. No fixture
  reseeding, password/role changes, data deletion or OCR seed repairs ran.
- Captured fresh current-page screenshots through real isolated browser login:
  `/tmp/tabi-admin-review/before-desktop.png`, `before-mobile.png`, and the
  corresponding `-full.png` files. Both sessions logged out with HTTP 204.
  Desktop 1280×800 and mobile 375×812, locked Playwright 1.62.1 Chromium.
- Actually inspected the two viewport images. Whole-checklist JSON import
  occupies the initial desktop/phone viewport; editing begins below it, and
  unrelated management tools continue down the same page. Existing journal
  colors and typography are visible and are the redesign's retained identity.
- A direct API-container `get_engine()` probe failed because Compose exec
  does not inherit the database URL assembled by the service entrypoint.
  Switched to a read-only PostgreSQL query in the isolated DB container;
  credential values were not printed or changed. No runtime configuration fix
  was made as part of this frontend task.

## Actual preview access

The user answered the asynchronous credential request with “自行创建，自行测试”,
explicitly authorizing a dedicated account in the actual preview. Registered
through the real UI, then independently verified login HTTP 200, role `user`,
administration denial and logout. Random credentials are held only in the
mode-0600 `/tmp/tabi-admin-review/preview-credentials.json`; the sanitized result
is in `registration-result.json` in the same private directory.

Registration returned HTTP 201, but immediate response-body inspection failed
around the page's hard navigation. One retry consequently created an additional
ordinary synthetic account. Stopped registration retries and instead logged in
with the already-created second account to verify `/api/auth/me`. Both new
accounts are ordinary users at this point; no existing account or password
changed. Baseline actual-preview roles were two system administrators and two
ordinary users. The unused new account remains ordinary and logged out; no
unknown account cleanup or deletion was attempted.

Only the second newly-created account received temporary `content_admin`
for non-writing acceptance, then returned to `user`. The previous task's account
was not reused or elevated. Final acceptance and restoration evidence follows.

## Implementation, checks and acceptance

Implement agent completed production edits and persistent admin tests. Reported
application/E2E/preview type checks, formatting, build and diff checks passed.
Focused administrative suite passed 12 desktop/mobile cases. First complete
suite: 28 passed, 2 failed before catalog UI execution because the original OCR
lookup checked only the first 100 administrator lists. Independent read-only
isolated DB inspection by implement agent found 130 total lists and intact
draft OCR fixtures: Beijing food 96 and weekend travel 76, total 172. This was
pagination in a historical test helper, not missing/deleted fixtures or a seed
repair. All existing OCR identity/source/status/skip assertions remain required.

Check agent reviewed the source: original fields and SDK mutation bodies remain,
hidden workspaces stay mounted, role filtering and disclosure validation are
coherent. It is adapting that catalog lookup/navigation and adding missing
long dynamic-title, populated-disclosure and reviewed-material import evidence
to existing focused cases. Final suite, AC mapping and rollout are pending.

## Initial candidate render review

Main session independently exercised all five workspaces with real isolated
administrator sessions. Content views at 320/375/768/1024/1280/1440px and each
workspace at desktop 1280×800/mobile 375×812 had no page overflow or pageerror.
The review used existing synthetic content and only non-writing JSON previews;
both sessions logged out. Results and diagnostic images are under
`/tmp/tabi-admin-review/`, with `render-results.json` as the non-sensitive matrix.

Actually viewed content, import, moderation, users and audit images. Found two
concrete shortcomings: the unlayered shared `.field` min-height overrode the
JSON textarea's Tailwind min-height utility, and the phone catalog lacked a
height bound. Implement agent corrected these with a scoped 16rem JSON source
height and 18rem phone/38rem desktop catalog bounds; the revised build/render
still needs final confirmation. Earlier screenshot full-page captures retained
the scroll position after element clicks, putting the sticky header mid-image;
the diagnostic script now explicitly resets scroll before capture.

Calculated shared-token contrast: ink/paper 10.29:1, secondary/paper 4.73:1,
accent/paper 5.39:1, filled-primary/white 9.48:1, secondary/card 5.20:1. These
values cover the established text palette; they are not a complete automated
accessibility audit.

An anonymous public-resource hash probe confirmed the isolated candidate now
differs from the still-old actual preview. This is expected before rollout;
`runtime-before.json` records both resource sets. Do not describe the current
preview as updated until the final served resources are compared again.

## Final checks and refinements

- Independent check found no omitted editor fields, changed SDK mutation
  contracts, hidden-panel remount regression or remaining code/spec issue.
- Fixed the historical catalog test helper to page through all administrator
  lists and enter the new workspace/edit flow. Preserved all original 172 OCR
  draft identity, source, null verification and publication-skip assertions.
  No seed/schema changes or fixture reseeding were performed.
- Strengthened existing administrative tests with saved long list/item titles
  in actual headings/selection rows, populated optional-field defaults,
  reviewed-material import rejection/source retention/success/draft privacy,
  and a synthetic system-admin session's fallback after downgrade to content
  admin. Rejected-import textarea assertions use semantic textbox locators.
- Corrected all three scoped scroll-container padding declarations from
  0.2rem to 0.4rem, giving the shared 6px focus outline adequate space.
- Application, E2E and preview TypeScript checks, Prettier formatting and
  production build passed through `./hako node`. No ESLint script exists.
- Full `./hako browser npm run test:e2e`: **30/30 passed**, 53.5 seconds,
  desktop and mobile. Log: `/tmp/tabi-admin-review/check-full.log`.
- After the final focus-padding change, rebuilt/started only the isolated web
  service and ran `./hako browser npm run test:e2e -- import.spec.ts -g
  'administration layouts'`: **2/2 passed**, 5.6 seconds. Log:
  `/tmp/tabi-admin-review/check-final-layout.log`. The previous complete suite
  covers behavior; the final focused rerun covers the subsequent CSS change.
- Isolated web health passed; checker compared served index/JS/CSS to
  `frontend/dist` and confirmed exact hashes.
- `task.py validate`: implement/check each **18** unique existing entries.
  `git diff --check` passed. Backend/API/schema/dependencies/config/runtime
  scripts remain outside this frontend change; backend tests were not rerun.
- Captured reusable workspace state, disclosure validation and label/height
  conventions in frontend state-management/component/quality specs. No
  protected Trellis runtime or generated platform file was edited.

## Final render review: eight dimensions

Main independently reran `render-review.mjs` after the final isolated web
rebuild. All five workspaces at 1280×800 and 375×812, plus content at
320/768/1024/1440px, had no page overflow or pageerror. Both sessions logged out
with HTTP 204. `render-results.json` records the matrix. The private `/tmp`
images with the same names as the initial review were refreshed; old renders
must not be treated as the final candidate.

Actually inspected final content images at every width; import desktop/mobile
and mobile full page; moderation, users and audit desktop/mobile; final layout
test screenshots for 200% text and landscape; and the actual-preview mobile
synthetic result. Test full-page screenshots can retain a sticky header at the
scrolled viewport location; independent controlled images reset scroll first.
They are diagnostic screenshots, with no approved pixel baseline.

| Dimension | Observed outcome / refinement |
| --- | --- |
| Typography | Workspace headings, selected titles, field labels and subdued metadata form distinct levels. Saved long Chinese titles and unbroken identifiers wrap in headings/rows. |
| Whitespace | Desktop navigation/editor alignment and bounded form groups separate tasks. Phone catalog is limited to 18rem; JSON input is 16rem and other admin textareas 6rem, correcting the initial shared-CSS override. |
| Hierarchy | Selected workspace/target/status remain identifiable. Common fields precede optional disclosures. Import source and readable result are side by side on desktop, sequential on phones. Save, draft import and publication stay explicit. |
| Color | Shared paper/forest/accent palette retained; selected rows and workspace controls add border/color/text cues. Palette contrast values above cover sampled text combinations only. |
| Motion | Existing restrained shared transitions retained; persistent reduced-motion assertion reports 0s for workspace navigation. No new decorative animation. |
| Microinteractions | Real loading/error/success, busy controls, selection feedback, focus, invalid disclosure recovery, source-revision invalidation and explicit edit transition pass on both projects. Focus padding fixed after review. |
| Responsiveness | Five required widths, 1280 desktop, landscape, 200% root text, long saved content, 44px workspace targets and keyboard activation pass. Final screenshots show wrapping navigation and stacked forms without page overflow. |
| Originality | Existing exploration-journal identity, Chinese operational labels, numbered import stages and content-specific reference groups remain coherent with the public application. No third-party visual asset or generic dashboard template introduced. |

## Final actual-preview acceptance

Ran `./preview.sh build` then `./preview.sh start` with the existing root env and
`infra` project. Backend layers were cached; preview data/config/volumes were
preserved. Readiness completed and the mandatory console listed actual host
address candidates. The confirmed review URL remains
`http://192.168.9.4:7081/admin`; other host candidates are not verified from
another device.

Temporarily elevated exactly the new dedicated account, matching its validated
UUID, synthetic email pattern, display name and prior `user` role. Ran
`npm run test:preview` in locked Playwright 1.62.1 with host networking,
temporary HOME, frontend mount and owner-only credentials mounted read-only:
**2/2 passed**, 2.3 seconds (desktop 1280×800/mobile 375×812). Real login200,
administrator identity, default content and workspace switching, successful
non-writing JSON preview200, retained source, unchanged checklist inventory,
logout204 and anonymous identity401 passed. The suite blocks content writes;
no checklist/import/publication/moderation/user-data mutation ran on preview.
Screenshots contain only the synthetic preview region in
`frontend/test-results/preview/`.

Immediately restored exactly that account to `user` (UPDATE1). Read-only final
role counts: system_admin2/user4/content_admin0, consistent with baseline plus
the two new ordinary synthetic registrations described above. Both new
accounts are ordinary and logged out; original administrators are unchanged.
Independent actual-HTTP desktop/mobile login after restoration confirmed
roleuser, page denial, admin API403, logout204/me401.
`restoration-results.json` records sanitized results; passwords never entered
task documents, command arguments, traces or logs.

`hash-runtime.mjs final` confirmed actual-preview and isolated final index,
JavaScript, CSS and local font hashes are identical (`runtime-final.json`):

| Resource | Final SHA-256 |
| --- | --- |
| index | `87b405048793c19f96b53bf42fb4e06496b1b6ddfab216556de9fd60300c3483` |
| `index-BazNSiRm.js` | `67d0e260810f7774a3b691b28bde8c047df5d3553c2cca0ca00bae6ad33c9151` |
| `index-BwG2BrNb.css` | `d107914b3d74694c75f812d4cb750db7b2427d76d84ff6bf755b8e79d331e8ad` |
| `journal-display-DOymQnA7.woff2` | `b2c1fed26e194d5a965454f91974d30efb46b8bc667860916cf0f974d9caeb2b` |

Actual database migration remains `a748bd701acf`, verified read-only. This is
not a new migration test or backend suite result.

## Acceptance mapping and remaining review

| Criterion | Result |
| --- | --- |
| AC1 | Implemented and inspected: purpose/target/status/actions identifiable across workspace layouts and long content. |
| AC2 | Both-project persistent tests cover drafts/staged files, editor persistence, covers/relations, reviewed import, moderation, role changes/fallback and ordinary denial. Actual synthetic account permissions restored. |
| AC3 | Real preview/draft/publication/reuse/conflict and source-revision regressions pass; readable summaries/raw detail and explicit edit transition inspected. |
| AC4 | Both-project interaction and final layout checks pass; five widths, landscape, enlarged text, reduced motion and keyboard/focus evidence recorded. |
| AC5 | All eight dimensions independently reviewed; concrete textarea/catalog/focus refinements implemented and rechecked. |
| AC6 | Types/format/build/full30 plus final layout2 and actual preview2 pass; served candidate matches. User accepted the final result with “不错；可以提交”. |

Review classification: the `human-required` subjective visual gate is satisfied
by the user's “不错；可以提交” response. No further credential or approval request
is needed. Physical devices, other mobile engines, assistive technology, domain
HTTPS and cross-device LAN reachability were not tested. Current seed/schema
incompatibility is unchanged. Proceed with the authorized work commit, task
archive and independent journal; exact commit references belong in mainline.
