# Administrator 管理页面视觉与布局改进

## Goal

Improve the appearance and usability of the existing `/admin` management page,
while retaining the application's exploration-journal identity and management
capabilities. The user reported that the administrator page looks poor and
explicitly requested a Trellis task on 2026-10-05.

## Background and confirmed facts

- `frontend/src/features/admin/page.tsx:300` renders the content-management
  introduction followed immediately by the whole-checklist JSON import panel.
- `frontend/src/features/admin/page.tsx:347` places checklist and item selection
  and editing in equal-width desktop columns. Checklist selection is a wrapping
  group of pills (`:358`); the item editor exposes many fields (`:645`).
- Reviewed-material import and moderation follow the editors (`:1225`), with
  account roles and audit history at the end for system administrators (`:1294`).
  These tools currently share one long page without task-level navigation.
- `frontend/src/features/admin/checklist-import.tsx:129` shows template/schema/
  example links, upload and pasted JSON together. Preview items expand to raw
  JSON (`:291`), rather than a human-readable content summary.
- Current content/admin and system/admin capabilities are distinct. JSON
  preview, draft import and publication are separate operations. Existing APIs
  provide statuses and real item counts; visual polish must preserve them.
- `.trellis/spec/frontend/experience-design.md` already establishes warm paper,
  forest ink, shared components, operational Chinese labels, and an eight-
  dimension review. This task inherits that identity and quality ambition.
- Existing import browser coverage is in `frontend/e2e/import.spec.ts`; actual
  preview acceptance uses `frontend/e2e-preview/`. An existing cropped import
  screenshot was inspected as historical evidence only; the current full-page
  appearance still needs a fresh baseline during implementation.

## Requirements

- R1: Reorganize `/admin` into content editing, imports, content moderation,
  account roles and audit workspaces. The last two remain system-admin-only.
  Improve alignment, spacing, typography, selection states and action emphasis
  using the shared journal palette and components. Every active work area must
  make its purpose and current target clear.
- R2: Preserve checklist/item editing, covers, relations, publication and
  unpublication, whole-checklist import, reviewed-material import, moderation,
  account-role editing and audit access according to existing permissions.
- R3: Preserve source drafts and editor state during within-page workspace
  switching. Changing the selected checklist/item retains its current
  explicit selection semantics. A layout change must not publish content,
  overwrite data, reset an account, or weaken authorization.
- R4: Make import results easier to review: clear preview/draft/publication
  distinctions, real status/counts, readable item summaries, and available raw
  detail. Keep existing validation limits, reuse/conflict behavior and controls.
- R5: Support desktop and phone management with accessible labels, visible
  focus, at least 44px control targets, clear loading/empty/error/pending/success/
  permission states, reduced motion and long-title/identifier wrapping.
- R6: Review actual renders against all eight dimensions in experience-design,
  and refine visible shortcomings before declaring the visual work complete.

## Confirmed scope and decisions

On 2026-10-05 the user replied “按照推荐的来”, selecting workspace reorganization
over presentation-only polishing. Preserve the established identity; use clear
desktop navigation and an adapted compact phone layout; group common editor
fields separately from optional reference/location details. Existing tools
remain available but move to their relevant work areas. This is one cohesive
administration redesign, not independently delivered child features.

## Acceptance criteria

- AC1 (R1): The selected management area and checklist/item are identifiable;
  titles, statuses and primary actions have consistent hierarchy without an
  oversized decorative hero or invented statistics.
- AC2 (R2, R3): Existing management workflows remain available to their original
  roles. Workspace switching retains in-session unsaved drafts;
  ordinary users cannot access administrative operations.
- AC3 (R4): Preview presents readable content and distinguishes ready, existing
  and conflict states. Import remains a draft operation; publication stays an
  explicit separate action. Existing reuse/conflict regression scenarios pass.
- AC4 (R5): Affected controls work on desktop and mobile with keyboard focus,
  touch-sized targets, feedback and no page overflow. Review 320/375/768/1024/
  1440px, landscape, 200% text, reduced motion and long content.
- AC5 (R6): Verification records inspected screenshots, concrete findings and
  refinements for typography, whitespace, hierarchy, color, motion,
  microinteractions, responsiveness and originality.
- AC6 (R2–R6): Relevant type, formatting, production-build and persistent
  desktop/mobile browser checks pass. Actual preview version/login/non-writing
  import acceptance is verified per the project validation policy, with any
  missing credentials or remaining visual judgement accurately recorded.

## Out of scope

New management features, analytics, backend/schema/API changes, a new brand or
design system, autosave, dependency upgrades, OCR seed repairs, data migration,
changing existing preview user accounts for testing, and writable regression
tests against preview user data. Commit/archive permission is separate from
task creation.
