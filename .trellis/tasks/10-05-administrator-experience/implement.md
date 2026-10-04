# Administrator workspace execution plan

## Entry gate and ownership

- [x] User authorized task creation and selected recommended reorganization.
- [x] Source-backed PRD, design and investigation prepared; scope decisions
  converged. PRD has no unresolved brainstorming alternatives.
- [x] Implement/check manifests explicitly register experience-design and each
  applicable Trellis Plus policy rather than relying on Markdown links.
- [x] Present completed planning summary and obtain its explicit approval
  (user replied “开始” on 2026-10-05).
- [x] Only then run `task.py start .trellis/tasks/10-05-administrator-experience`.

This is one cohesive deliverable. No parent/child split is needed. Main session
owns phase transitions, verification interpretation, specs, mainline, commit and
archive. Implementation/check use the designated Trellis agents after approval;
every dispatch begins with `Active task: .trellis/tasks/10-05-administrator-experience`.
Native context injection is preferred; agents must read the manifests and their
referenced bodies themselves if injection is absent. No recursive dispatch.

## Ordered work

1. Load before-development context and approved PRD/design. Recheck Git status,
   protect unrelated edits, and inspect all target files before changing them.
   Use existing Docker wrappers and fixture data. Capture current desktop/mobile
   administration renders in the isolated environment for comparison. Existing
   seed/schema failure must not be repaired or hidden inside this UI task;
   inspect whether the existing isolated fixtures are usable and record any
   environment limitation separately.
2. Rework AdminPage's presentation into the five role-appropriate workspaces,
   keeping state/mutations at their existing boundary and preserving mounted
   import/editor state. Add clear navigation, readable selection rows,
   checklist context/counts, bounded editors, grouped optional fields and
   action placement. Check collapsed-field native validation before moving on.
3. Rework ChecklistImport's presentation into source/review areas and readable
   preview items with optional raw details. Preserve all original-source,
   revision, busy, validation, conflict/reuse and callback behavior. Add the
   explicit edit-selected-checklist transition without hiding import results.
4. Style only the affected feature with existing tokens and scoped CSS. Check
   shared shell/buttons/fields and public consumers for unintended drift.
5. Adapt existing import/actual-preview locators for the approved navigation.
   Extend persistent `import.spec.ts` with meaningful admin workspace tests;
   keep that file's existing account/fixture scenario rather than silently
   assuming a new seeded scenario exists. Use real isolated API requests and
   dedicated synthetic users/records for role/moderation writes.
6. Run focused checks, then the standard frontend and desktop/mobile regression
   gates below. Review screenshots in all eight dimensions, fix concrete
   shortcomings and rerun affected checks after each substantive refinement.
7. Build/update the actual preview candidate through the existing lifecycle,
   compare served resources with the candidate, and run the separate non-writing
   preview suite if authorized administrator credentials are available. Preserve
   user data; do not elevate the previous ordinary test account or run isolated
   writable tests against preview.
8. Trellis check agent reviews the full approved scope and evidence, self-fixes
   appropriate issues and reports remaining limitations. Main session verifies
   results, records AC mapping and eight-dimension findings in verification.md,
   and captures stable shared conventions in specs if warranted.
9. Present the actual preview and remaining visual judgement for user review.
   Commit/archive only under the applicable explicit authorization and policy;
   do not mark complete while required acceptance is missing.

## Persistent behavioral coverage

| Coverage | Expected evidence | AC |
| --- | --- | --- |
| Navigation and permissions | Default content view, workspace buttons, current selection, system-only tools absent for content admin, ordinary-user denial | AC1, AC2 |
| Draft preservation | Edit checklist/item/source and staged file; switch areas and back; values/results remain, hidden controls are not focusable, no unintended request | AC2 |
| Content editors | Create/save/select a synthetic list and item, expand reference/location/link groups, save valid data, collapsed invalid fields recover correctly | AC1, AC2, AC4 |
| Covers and relations | Existing upload/selection actions remain reachable; validate persisted synthetic cover and same-list relation | AC2 |
| Import contract | Keyboard preview, readable content/raw details, source revision invalidates preview, disabled/busy behavior, draft privacy, explicit edit/publish, reuse/conflict and downloads | AC2, AC3 |
| Governance | Explicit hide action invalidates a synthetic share; role save persists for a disposable synthetic account; audit and pagination controls remain operable | AC2 |
| Responsive and accessibility | Desktop/mobile operation, five widths, landscape, long text, 200% text, focus, targets, reduced motion, visible feedback and no overflow | AC4, AC5 |
| Actual preview | Confirmed-origin admin login, workspace navigation, non-writing preview, unchanged inventory, logout and served-version match | AC6 |

Delay real responses for loading/busy cases rather than replacing the behavior
with mock successes. Use existing state/final-response assertions and semantic
locators. Tests may be split into focused cases within the existing scenario.
Review current coverage before adding redundant test infrastructure.

## Commands and checks

From repository root, when the isolated runtime/fixtures are ready:

```sh
./hako node npm run typecheck
./hako node npm run typecheck:e2e
./hako node npm run typecheck:preview
./hako node npm run format:check
./hako node npm run build
./hako browser npm run test:e2e -- import.spec.ts
./hako browser npm run test:e2e
git diff --check
python3 .trellis/scripts/task.py validate .trellis/tasks/10-05-administrator-experience
```

Use `./dev.sh` and existing isolated seed/setup commands only after inspecting
their readiness and known seed limitation. Do not broaden to backend/database
checks unless the approved change actually crosses that boundary.

Actual preview is separate: follow validation.md and the existing locked
Playwright image to run `npm run test:preview` with
`TABI_PREVIEW_BASE_URL` and an owner-only `TABI_PREVIEW_CREDENTIALS_FILE`.
Credentials and authenticated browser state never enter task artifacts or logs.
Record commands, exact environment and actual results; missing prerequisites
are a limitation, never a passed check.

## Visual review and finish evidence

Capture and actually inspect controlled empty/populated/long-content renders
for content editing, import ready/conflict, moderation, users and audit on
desktop/mobile. Review all eight experience-design dimensions and relevant
adjacent public pages. No approved pixel baseline exists; screenshots are
diagnostic evidence. Test each changed interaction on both browser projects.

verification.md records AC1–AC6, commands/results, screenshot paths/findings,
refinements, actual-preview version/login evidence and unverified device or
credential boundaries. The final candidate must not be presented as deployed
until preview version comparison is complete. All changes are reversible source
changes; preserve unrelated changes and all user data during any rollback.

## Execution outcome (2026-10-05)

- [x] Source implementation and independent Trellis check completed.
- [x] Existing administrative mutation contracts, fields, draft and permission
  boundaries preserved; relevant persistent coverage extended.
- [x] Type/format/build gates, complete isolated desktop/mobile 30/30 and
  final CSS-focused layout 2/2 passed.
- [x] Final controlled screenshots inspected across all eight dimensions;
  textarea height, phone catalog bounds and focus padding refined.
- [x] Actual preview built/started, non-writing desktop/mobile 2/2 passed,
  index/JS/CSS/font hashes match final isolated candidate.
- [x] Dedicated new test account's temporary role restored and verified on both
  actual-HTTP projects; original accounts untouched.
- [x] Acceptance/evidence/specs/mainline updated; contexts each validate18.
- [x] User accepted final visual result with “不错；可以提交”.
- [x] Work commit and normal task archive/journal authorized by that response.

Detailed results and limitations are in `verification.md`. Proceed with the
authorized Phase 3.4 work commit, then normal task archive and journal.
