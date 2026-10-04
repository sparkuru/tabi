# Experience Design Contract

## Authority and scope

User-approved standing constraint, promoted into project specifications on
2026-10-05:

> 以 Awwwards、 Webby Awards、 FWA 获奖级网站为品质标准，完成后从排版、留白、视觉层级、色彩、动效、微交互、响应式和 原创性上自检并持续优化，直到没有明显可提升之处。

Apply this to every subsequent user-facing UI design, implementation and review,
including public discovery, authentication, records, sharing and administration.
Inspect actual renders, fix visible shortcomings, and repeat the affected
review until no obvious improvement remains across these eight dimensions.
Passing type checks or browser tests alone does not satisfy the visual review.
The named awards express the quality ambition; this spec does not claim an
award, an official scoring formula or permission to copy another website.

The approved project adaptation is **an everyday exploration journal**: warm
paper, forest ink, editorial composition and original journal/map/compass art.
Carry this identity across the application. A new feature inherits it; creating
a separate theme or replacing the product's mental model requires an explicit
design decision and a coordinated spec/component update.

This is the authoritative visual and UX adaptation. Domain behavior remains
defined by [Product Requirements](../product/requirements.md), state ownership
by [State Management](./state-management.md), component mechanics by
[Component Guidelines](./component-guidelines.md), and execution/acceptance by
[Validation](../trellis-plus/validation.md). Task documents hold dated evidence,
not a competing long-term design system.

## Shared mental model and language

Use one model for todo, learning, food and outings:

**Discover a checklist → choose an item → mark it complete or add a record →
review personal history → optionally share that record.**

The journal is the visual metaphor. It does not introduce a travel-only domain,
geographic prerequisite, reward system or extra onboarding step. Users can
understand and complete an ordinary task without a destination, photo or note.

| Concept / UI language | Meaning to preserve in layouts and feedback |
| --- | --- |
| Checklist / 清单 | A published collection of items; title, category and description explain its theme. Navigation remains “清单”, even on an expressive editorial home. |
| Item / 条目 | One thing within one checklist. Explain what it is and what the user can do; show location/reference sections only when present. |
| Mark complete / 标记完成 | The shortest completion action. Content is optional; reuse an existing valid record according to the product contract. Do not force the full record form. |
| Add record / 添加记录 | An intentional additional occurrence with optional note/photos/location. It can be repeated and remains distinct from marking complete. |
| Progress / 进度 | Distinct completed items divided by items in that checklist; multiple records for one item increase its record count, not its completed-item count. |
| My records / 我的记录 | The author's history, including repeat occurrences; each record can be viewed and edited through its own route. |
| Visibility / 仅自己、公开分享 | Each record defaults to private. Sharing is an explicit choice for that record, and revocation must remove public access. Never imply that all history is public. |
| Administration / 管理 | Maintain content and review imports. Preview, draft import and publication are separate actions/states; publishing is never implied by a preview. |

Use short concrete Chinese action labels, consistent across cards, forms,
empty states and navigation. Editorial phrases such as “下一站” belong to
discovery copy; they do not replace the operational names above. Explain the
user consequence rather than exposing implementation details. Show real API
titles, counts, categories and progress; an unavailable request is an error,
not an invented count or an empty collection.

Keep a visible way back to the parent checklist/item/history and preserve guest
login redirects and resumable intent. Public author identity is nickname/avatar;
email and private location must not leak into shared views.

## Visual vocabulary and source of truth

Use the existing React Web, Tailwind v4 and shared CSS implementation. Theme
values and selectors live in
[main.css](../../../frontend/src/styles/main.css); reuse them instead of
introducing page-specific near-duplicate palettes or a second styling system.
These are current implementation values, not a claim that every measurement
has a named token.

| Role | Existing token / value | Usage |
| --- | --- | --- |
| Paper | `--color-paper: #f5f2e9` | Application canvas and quiet surfaces. |
| Ink | `--color-ink: #263e35` | Main text, editorial emphasis and discovery CTA. |
| Accent | `--color-accent: #a7432b` | Small labels, selected markers and limited display emphasis. |
| Secondary text | `--color-stone-500: #706b62` | Readable secondary copy on paper; do not restore the lighter default. |
| Primary controls | `--color-teal-800: #2d4c3e`, `--color-teal-900: #213b30` | Filled buttons and their hover state. |
| Progress / focus | `--color-teal-700: #426454` | Progress fill and visible keyboard focus. |
| Quiet panels | `--color-teal-50: #edf1e8`, `.progress-panel: #e9edde` | Supporting information and progress grouping. |
| Card / field surface | `#fffdf7` in shared Card/`.field` | Forms and content panels. |

Maintain readable contrast on the actual rendered background: normal readable
text at least 4.5:1, large text at least 3:1. Check hover/selected/error states as
well as default colors. Status must also have text/semantics; decoration and
color alone cannot communicate completion, privacy or failure.

### Typography

- Static editorial headlines and branding use the local `Tabi Journal` serif
  subset. Dynamic titles, user content, form controls and operational headings
  use the system sans stack (`--font-sans`). Monospace folio labels are accents.
- The subset contains only the approved static glyphs. When changing display
  copy, regenerate the font subset and verify its exact retained notices in
  [Third-party Inventory](../../../third_party/index.md). Do not route arbitrary
  user text through this limited subset or add remote fonts casually.
- Preserve one page h1, section h2 and collection-card h3 hierarchy. Use
  `PageIntro`/`.page-title` for operational pages; `.hero-title` for discovery.
  Current page titles use `clamp(2rem, 4vw, 3.25rem)`; the hero has its own
  responsive display scale in shared CSS.
- Text sizes use rem; long Chinese titles and long unbroken identifiers/emails
  must wrap without shrinking the avatar, clipping controls or causing overflow.
  Body/help copy stays comfortably readable at 200% root text size.

### Composition, space and density

- Reuse `AppShell`, `.shell-width`, navigation, footer and main landmark.
  Current shell caps at 1280px, uses fluid desktop padding and 22px phone gutters.
- Discovery has an asymmetric headline/art pair on desktop, stacked content
  on phones, one primary discovery CTA and native navigation to the collection.
  The process strip supports understanding; it does not become a mandatory wizard.
- Collections have cover → category/title/optional summary → counts/progress.
  Grid is one column below 640px, two from 640–1023px, three from 1024px. Keep
  metadata aligned when summaries are absent; do not reserve an empty paragraph.
- Operational pages use bounded forms, thin section rules and clear groups.
  Record/gallery/admin layouts may be denser than the home but retain the same
  colors, typography, controls and feedback. Do not add a large decorative hero
  to every management or record screen.
- Reuse the modest shared Card/Button/field radii and borders. Quiet depth comes
  from paper surfaces, spacing and restrained hover feedback. Optional metadata
  disappears when absent; it does not leave empty location or detail panels.

### Original artwork and content

Reuse [JourneyArt / CollectionArt](../../../frontend/src/components/journey-art.tsx)
for imaginary city-map, notebook/ticket and compass motifs and their muted cover
variants. Decorative SVG is `aria-hidden`; it is never an actual geographic map
or evidence of a real destination. Real supplied cover photos and personal media
keep their meaning and appropriate alt text. Do not replace real data with
invented places, statistics or experiences to fill an attractive layout.

New assets should extend this identity and be original or have recorded exact
source/license notices. Native SVG/CSS and existing Lucide are the default for
simple artwork/icons; any extra asset or dependency needs an actual use case.

## Interaction and state contract

Reuse `Button`, `Card`, `PageIntro`, `Loading`, `ErrorNotice`, `EmptyState` and
`PhotoGallery`; component signatures and focus details remain in
[Component Guidelines](./component-guidelines.md). For example, navigation uses
one link via the existing primitive, while mutation remains a native button:

```tsx
<Button asChild size="small">
  <Link to="/auth" search={{ redirect: "/" }}>登录</Link>
</Button>
<Button type="submit" disabled={mutation.isPending}>
  {mutation.isPending ? "请稍候…" : "保存记录"}
</Button>
```

| State / operation | Required user-visible behavior |
| --- | --- |
| Loading | `role="status"`, meaningful loading text; do not present an empty/error result before the request resolves. |
| Empty | Explicit empty message with a relevant next step where one exists; no fake example data. |
| Error / retry | Visible `role="alert"`; preserve draft inputs and loaded content when appropriate; retry stays available. |
| Pending / disabled | Visible pending feedback and disabled control; preserve the existing duplicate-request and retry-key guards. |
| Success | Confirm the actual persisted result and refresh affected progress/history/session views. |
| Permission / private content | Explicit login/permission state; an unavailable or revoked share remains unavailable without exposing private content. |

All standalone controls/navigation have at least a 44px touch target; decorative
arrows within whole clickable cards are not independent controls. Keep native
buttons, links, labels and tab semantics. Keyboard focus must be visible on the
main landmark, tab controls and visible upload wrapper; hover-only feedback is
insufficient. Use `.field-search` for icon clearance because unlayered `.field`
padding wins over Tailwind padding utilities.

Motion supports orientation and feedback. Reuse short CSS entrance and existing
180–400ms control/card/progress transitions; current entrance is 600ms with a
120ms stagger. Card/art hover movement applies only on hover-capable devices. Respect
`prefers-reduced-motion` for entrances, transitions and hover transforms; keep
the content and final state visible. Use native scrolling, with no scroll
interception, perpetual decorative loop or motion needed to understand progress.
An actual loading indicator may animate while work is pending.

## Eight-dimension review and refinement loop

For each UI task, read this document before design, register it explicitly in
both implement/check context, and record affected pages/states in the task plan.
Extend existing components and review adjacent affected pages to avoid drift.

| Dimension | Inspect in the actual rendered candidate |
| --- | --- |
| Typography / 排版 | Hierarchy, real font loading, line breaks, dynamic/long text, accessible labels and 200% text. |
| Whitespace / 留白 | Alignment and section rhythm; phone gutters; form density; empty-summary/optional-data gaps. |
| Visual hierarchy / 视觉层级 | Clear purpose and primary action; h1/h2/h3; discover/detail/record relationships; meaningful status placement. |
| Color / 色彩 | Shared palette, real background contrast, selected/hover/error/disabled states, non-color status cues. |
| Motion / 动效 | Purpose, duration, hover capability, reduced motion, visible final state and unchanged native scrolling. |
| Microinteractions / 微交互 | Touch targets, focus/tab/skip behavior, label/help associations, pending/error/retry/success and preserved drafts. |
| Responsive / 响应式 | 320/375/768/1024/1440px, landscape, 200% text, long names/emails, real images, navigation and overflow. |
| Originality / 原创性 | Coherent journal identity and project-specific composition/art, real content and recorded asset provenance. |

Review → identify a concrete shortcoming → refine the shared component/token
or affected page → rerun affected checks → inspect the new render. Continue
until all eight dimensions have been reviewed and no obvious improvable defect
remains in the affected scope. Do not impose an arbitrary number of rounds or
use a green build as the stopping rule. Preserve previously verified behavior
and scope; a change in the product model belongs to a separate explicit decision.

Task verification records each dimension's findings, fixes, final artifacts and
remaining evidence limits. Screenshots must actually be viewed. Use controlled
empty/populated/long-text cases and distinguish fixtures from actual content.
No approved screenshot baseline exists: do not auto-accept pixel snapshots or
describe diagnostic screenshots as a jury verdict.

Run relevant type/format/build and persistent desktop/mobile browser checks per
[Quality Guidelines](./quality-guidelines.md) and the shared validation profile.
Existing coverage is in `frontend/e2e/editorial.spec.ts` (responsive/motion/
keyboard/search/logout), `completion.spec.ts` (completion/records/media/privacy),
`catalog.spec.ts` (catalog states) and `import.spec.ts` (administration).
Verify the confirmed actual preview where required by the validation policy;
do not run writable isolated tests against user data. Report physical-device,
other-engine or assistive-technology gaps accurately rather than claiming they
were tested. Spec-only edits check links/context/source accuracy and diff,
without rebuilding or re-testing an unchanged application.

## Applying and evolving the contract

Good: a new learning view reuses the journal shell, names items and records
consistently, has a clear completion action, and is reviewed in all eight
dimensions with real states. Base: an empty collection uses the same quiet
layout and an honest empty state. Bad: a page creates a neon dashboard theme,
relabels records as rewards, forces a photo/location, or ships after reviewing
only its desktop hero.

When evolving the design, update shared source and this specification together,
check consumers across page families, and retain the eight-dimension review.
Do not fossilize screenshot-specific fixture titles, temporary credentials,
preview IPs, test totals or one task's “passed” status into this contract.
