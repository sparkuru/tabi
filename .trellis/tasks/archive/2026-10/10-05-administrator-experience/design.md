# Administrator workspace design

## Status and decision

Approved design following the user's 2026-10-05 choice to reorganize the
existing administration page and subsequent “开始” approval of the complete
planning summary. Task started on 2026-10-05. PRD R1–R6 and AC1–AC6 are the
acceptance source.

## Boundaries

- Keep the existing `/admin` route, AppShell and administrator authorization.
  Default workspace is content editing. Do not create a second application,
  route registry, theme, backend API or persistent draft store.
- Primary source ownership: `frontend/src/features/admin/page.tsx`,
  `checklist-import.tsx`, and scoped rules in `frontend/src/styles/main.css`.
  Feature-local presentation components may be extracted only where they make
  the rewritten page clearer; retain state and mutation ownership in AdminPage.
- Reuse generated SDK/request types, apiData/apiDone/postJsonText, QueryClient
  keys, upload handlers and all existing mutation/invalidation semantics.
  Preserve UTF-8/byte-limit checks, original JSON source bytes, revision checks,
  duplicate-operation guards, conflict behavior and draft-only import.
- Browser changes belong to existing `frontend/e2e/import.spec.ts`, the affected
  admin flow in `frontend/e2e/catalog.spec.ts`, and
  `frontend/e2e-preview/access.spec.ts`. Reuse existing fixtures and helpers.
  Adjacent public pages only receive regression checks for shared CSS drift.

## Composition and navigation

Use the established paper canvas, quiet card surfaces, forest ink, accent
markers and shared 44px buttons. Keep one compact operational PageIntro h1
(`内容管理`), with the current role and a short purpose line. Dynamic content
uses the system sans font. No new display-font glyphs or external assets.

Five work areas:

| Workspace | Existing tools | Access |
| --- | --- | --- |
| 内容编辑 | Checklist selection/editing, items, covers, relations, publication | Content/system administrator |
| 导入 | Whole-checklist preview/import and reviewed-material import | Content/system administrator |
| 内容治理 | Hide a public record with a reason | Content/system administrator |
| 账号角色 | User inventory and explicit role edits | System administrator |
| 操作审计 | Existing paginated audit history | System administrator |

On large screens, place a narrow workspace rail beside a flexible content area.
On phones/tablets, place a compact wrapping switcher above content; no sideways
page scrolling, fixed overlay or second global navigation. Each selector is a
native button in a named navigation landmark, with `aria-pressed`,
`aria-controls`, visible selection and normal Tab/Enter/Space behavior. Do not
claim tab semantics without implementing the complete corresponding pattern.
Hidden sections leave both the accessibility tree and focus order.

The current workspace has an h2 and relevant feedback close to its actions.
Keep critical async status/error feedback visible if the user switches areas.
Role changes must not leave a system-only view visible to a downgraded session;
fallback to the content workspace and honor the existing session boundary.

## Content editing

- Replace the title-pill clouds with readable selection rows containing title
  and textual status, a clear selected marker, and explicit new-list/new-item
  buttons. Retain pagination, loaded pages and next-page error feedback.
- Use a bounded checklist-selection area and a wider editing area on desktop;
  stack them on phones. Keep the current checklist title/status/count summary
  visible near its editing tools. Avoid equal-width competing giant forms.
- Organize checklist details and item management as distinct labelled sections
  of the editing workspace. Selection rows and editor labels make the current
  checklist/item explicit; public-page links remain available at their scope.
- Checklist title/summary/category/order and save remain easy to locate. Place
  cover tools and publication controls in separate labelled groups. Actual
  draft/published/unpublished counts come from the existing selected-list API.
- Item name/summary/description/category/order/tags stay in the common-fields
  group. Put recommendation fields, location/coordinates, reference/source/
  verification/missing fields, and external links in labelled expandable groups.
  Their values remain accessible, editable and included in the same save.
- Keep fieldsets, dependent-field help, optional/null behavior, image/file
  state and relation selectors. A collapsed required invalid field must open
  before native validation focuses it; do not disable hidden inputs to bypass
  validation. Prefer opening groups containing populated data when selecting
  an existing item, so reference/location values are discoverable.
- Put save next to its form; separate publish/unpublish from save and unrelated
  operations. Do not invent autosave, confirmation flows or bulk actions.

## Import workspace

Whole-checklist import is the default import section. Organize its instructions
and template/reference downloads, file/paste input and preview into a clear
sequence without forcing a wizard. Use a bounded source panel and a readable
preview panel side by side when space permits; stack them on smaller screens.
Template and schema links remain discoverable and unchanged.

Preview retains the checklist title, real item count/key and ready/existing/
conflict feedback. Render ordered item cards/rows with name and meaningful
nonempty content (summary/description/category/location/reference where
available). Offer explicitly labelled raw JSON details as secondary inspection.
Do not fill absent fields or reinterpret unverified OCR as current fact.
Keep preview and import separate controls; changing source invalidates preview.

After import/reuse/selection, retain the result and source in the import
workspace, and offer an explicit `编辑当前清单` action to open the selected
checklist in content editing. This keeps the successful result visible and
makes the next step clear. Publication stays in content editing.

Reviewed-material import is a separate labelled optional section. Display the
current target checklist or the need to select one, retaining its existing
review fields, validation, draft behavior and disabled-without-target submit.

## Draft and asynchronous state

AdminPage continues to own selections, drafts, uploads, pagination and role
drafts. Switching workspaces changes presentation only. Keep each workspace
mounted with native hidden behavior so ChecklistImport's local source, preview,
revision ref, error/result and active request survive switching. Do not key or
conditionally remount it by the workspace, selected checklist or query data.

Selection/new/import-selection continue the existing explicit reset semantics.
Background query refresh must not overwrite unsaved drafts. Hidden inputs
cannot accidentally submit; actions have explicit button types. Preserve busy
feedback and guards when returning to an active operation; no duplicate import
or publish is triggered by navigation.

## States, accessibility and motion

Keep Loading/status, ErrorNotice/alert, explicit empty results, disabled busy
actions and actual success messages. Render empty checklist/item/user/audit
states honestly. Retain loaded data when later-page requests fail. Match help
text and labels to their controls; long Chinese text, IDs and emails wrap.

Each standalone control has at least a 44px target and visible focus. Focus
must not be trapped in a hidden workspace or expandable section. Use native
details/summary or equivalent complete accessible disclosure mechanics. Normal
text contrast is at least 4.5:1 and large text 3:1 on actual backgrounds, with
textual statuses rather than color alone.

Use existing modest control transitions and reduced-motion behavior. No
perpetual decorative animation, scroll interception or large management hero.
The layout and typographic rhythm supply the page's identity.

## Compatibility, rollout and risks

No data/schema migration or API regeneration is expected. Existing `/admin`
links remain valid; workspace selection is intentionally in-session UI state,
not a new public deep-link contract. Import tests need explicit workspace
navigation while preserving their status, persistence, conflict and permission
assertions. Do not make hidden controls pass by weakening visibility checks.

The dominant regression risks are lost drafts through unmounting, undiscoverable
optional data, invalid collapsed inputs, feedback in the wrong area, and shared
CSS affecting public pages. Tests and render inspection specifically cover them.

Actual preview acceptance requires an authorized admin credential for the
confirmed HTTP origin. The previous task's synthetic account was restored to
ordinary-user role; do not infer admin credentials or change that account.
After implementation started, the user explicitly replied “自行创建，自行测试”
to the credential request. Create a dedicated synthetic preview account, give
only that new account temporary content_admin for non-writing checks, then
restore user role. Credentials remain owner-only temporary data. Current OCR
seed/schema mismatch remains out of scope.

Rollout uses the existing preview build/start workflow after isolated checks,
preserving database/media volumes. Rollback restores only this task's source
changes and rebuilds the web candidate; no data rollback is needed. Physical
devices, other browser engines and assistive technologies remain unverified
unless separately tested. Final aesthetic judgement remains a user review.
