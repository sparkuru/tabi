# Frontend Quality Guidelines

## Existing checks

Use the scripts declared in `frontend/package.json`. The current toolchain has
TypeScript, Prettier, Vite and Playwright; there is no ESLint script, frontend
unit-test runner, accessibility scanner, approved pixel baseline or CI job.
Do not claim those checks ran or introduce them merely to document the project.

From the repository root, the normal Docker wrapper commands are:

```sh
./hako node npm run typecheck
./hako node npm run typecheck:e2e
./hako node npm run typecheck:preview
./hako node npm run format:check
./hako node npm run build
git diff --check
```

The application compiler does not include the browser test source sets, hence
the separate test type checks. Prettier checks `src` and the existing generator,
Vite and browser configurations/tests. For documentation-only changes, verify
source references, remove scaffolds and run `git diff --check`; application
builds do not validate documentation accuracy.

## Behavior and UI review

Preserve explicit loading, empty and failure states rather than interpreting a
failed query as empty data. `frontend/src/components/common.tsx` provides
`Loading` with `role="status"`, `ErrorNotice` with `role="alert"`, and
`EmptyState`. `HomePage` / `ListPage` in
`frontend/src/features/checklists/pages.tsx` retain loaded infinite-query items
when a later page fails and show that failure alongside them.

Use the existing semantic controls and accessible names. The shared button in
`frontend/src/components/ui/button.tsx` has a minimum 44-pixel height and visible
focus styling. `frontend/src/components/app-shell.tsx` includes a skip link and
named navigation. `ChecklistImport` uses labels, help/error associations,
`aria-invalid`, status messages and a named preview section. Pending operations
disable their controls and expose busy text.

Review the actual action and final state: completion must refresh progress and
history; edits and share revocation must preserve privacy; changing import
source must invalidate its preview. Relevant implementation examples are
`frontend/src/features/entries/use-completion.ts`,
`frontend/src/features/entries/pages.tsx`, and
`frontend/src/features/admin/checklist-import.tsx`. API type changes also require
schema/client regeneration; see [Type Safety](./type-safety.md).

## Persistent browser tests and isolation

Use `frontend/e2e/` and `frontend/playwright.config.ts` for writable regression
tests. Setup and focused execution use the existing isolated development stack:

```sh
./dev.sh
./infra/e2e-seed.sh
./hako browser npm run test:e2e -- completion.spec.ts --project=mobile
./hako browser npm run test:e2e
./dev.sh down
```

Dependency setup and runtime details live in
[Development](../trellis-plus/development.md); acceptance and human-review rules
live in [Validation](../trellis-plus/validation.md). The config requires an
explicit `TABI_E2E_BASE_URL` and `TABI_E2E_ISOLATED=1`. The marker prevents
accidental execution; it does not authorize writes to an arbitrary deployment.
`hako browser` supplies the isolated network target. Keep the default preview
and user data out of this writable suite.

Tests run in Chromium, sequentially with one worker and no retries, for desktop
1280×800 and mobile 375×812 with touch emulation. Affected flows require both
projects. Emulation does not prove physical-device or other-engine behavior.
`frontend/e2e/helpers.ts` provides per-project/spec synthetic accounts, unique
package keys, synthetic photos, semantic locators, overflow checks and minimum
button-target checks. Keep those fixtures and the real API/database paths.

Source-backed test examples:

- `frontend/e2e/import.spec.ts`: keyboard activation, file upload, preview,
  disabled import, publication, reuse/conflict and validation errors.
- `frontend/e2e/completion.spec.ts`: busy guard, real request count, completion
  progress, editing/photos, repeat records, visitor privacy, share revocation,
  deletion and guest resume.
- `frontend/e2e/catalog.spec.ts`: loading, missing/empty states, removed-item
  visibility and preservation of the original OCR draft snapshot.

Delay real requests when testing loading/busy behavior, as these tests do;
do not mock away the API behavior being accepted. Use response/state assertions
instead of arbitrary sleeps. The foreground-refetch case in
`completion.spec.ts` uses the Playwright clock for the 30-second freshness
window and dispatches actual visibility events. Failed checks require diagnosis,
not relaxed assertions, added retries or unbounded timeout increases.

## Actual preview and evidence limits

The user-facing preview has a separate non-writing suite:
`frontend/playwright.preview.config.ts` and
`frontend/e2e-preview/access.spec.ts`. Run `test:preview` only against the
confirmed HTTP(S) origin with an existing owner-only credentials file, following
[Validation](../trellis-plus/validation.md#actual-preview-synchronous-acceptance).
It checks login/admin access, JSON preview, unchanged checklist inventory,
layout and logout. It does not replace the isolated writable suite. Never set
the isolated marker merely to run writable tests against the real preview.

The isolated suite records failure trace/video/screenshots and attached browser
errors under ignored `frontend/test-results/` and `frontend/playwright-report/`.
Success screenshots support review, not pixel acceptance. The actual-preview
suite disables general trace/video/screenshots to protect credentials and uses
a masked preview-region screenshot. Do not commit reports, credentials or
private browser state.

Before handoff, record the actual commands, projects, results and unverified
limits. Type checking/building does not prove interaction, access control or
mobile behavior; screenshots alone do not prove the final action. Follow the
shared validation policy for remaining human review without adding duplicate
approval gates.
