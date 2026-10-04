# Administrator layout investigation

## Evidence and limitations

Planning inspection on 2026-10-05 found an existing 1,473-line administration
page and a separate whole-checklist import component. Source anchors and
current capabilities are recorded in the PRD. No product code changed, no
browser suite ran, and no actual-preview account was accessed in planning.

The historical desktop import-preview crop under ignored `frontend/test-results/`
was opened and inspected. It shows a prominent raw JSON block with many null
fields after expanding one preview item. It is evidence of that existing
preview presentation, not a current full-page or mobile baseline.

## Independently authored recommendations

- Keep the existing shell, paper/ink/accent values, local display font policy,
  operational sans-serif headings, Lucide icons and shared controls.
- Distinguish the management task navigation from checklist/item selection.
  Prefer visible title/status rows to a large wrapping cloud of selector pills.
- Keep the currently selected checklist and item visible near the editor.
  Distinguish common editable fields from optional location/reference fields.
- Present import item names and meaningful populated fields before optional
  technical detail. Keep raw JSON inspectable and maintain existing validation.
- Move moderation and account-role operations out of the editing action cluster;
  retain their existing labels, consequences, authorization and explicit submit.
- Retain in-session drafts across proposed workspace changes. Do not introduce
  autosave, new backend requests or invented counts as visual improvements.

On 2026-10-05 the user selected this reorganization direction. The accompanying
design.md defines its concrete layout and interaction boundaries; the completed
planning summary still needs review before implementation dispatch.

## Local design search

Read the project-local UI/UX Pro Max skill and verified `search.py --help`.
Ran `--design-system -f markdown` for checklist content administration,
editorial warm paper/forest green, workspace forms and progressive disclosure.
The candidate included a marketing funnel, a different accent palette and remote
fonts. Those suggestions are unsuitable for this established management page.
Use contextual grouping, readable hierarchy and accessible state feedback;
retain the project experience-design contract instead of adopting the candidate
theme or a mandatory wizard.

No raw tool output, tool templates or competing MASTER document is retained.
`third_party/index.md` records the local tool's unresolved exact notice status;
this file is an independently authored project decision summary.

## Validation boundary for the eventual implementation

Extend/reuse persistent import and editorial coverage; new workspace behavior
needs genuine draft-retention, role, keyboard and desktop/mobile checks. Review
actual screenshots against the eight-dimension contract. Actual preview tests
remain login plus non-writing JSON preview through the confirmed HTTP origin;
all import/publication/role/moderation writes belong to isolated fixture data.
