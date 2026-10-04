# Frontend Component Guidelines

## Functions and Props

Use named function components. Feature pages take explicit typed props from
`frontend/src/router.tsx`, rather than reading untyped location strings.
Examples are `ListPage({ listId })` and `ItemPage({ itemId,
completeOnArrival = false })` in `frontend/src/features/checklists/pages.tsx`,
and `NewCheckinPage({ itemId })` in `frontend/src/features/entries/pages.tsx`.

Small component prop objects are usually inline. `frontend/src/components/common.tsx`
uses `ReactNode` for composition and generated `MediaOut[]` for `PhotoGallery`.
Primitive wrappers inherit native attributes:

```tsx
type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };
```

This is the existing `frontend/src/components/ui/button.tsx` contract. `Card`
in `frontend/src/components/ui/card.tsx` similarly accepts native `div` props,
merges `className`, and forwards attributes such as `role="alert"`.

Keep hooks above conditional returns, as in the list, record and history pages.
Local rendering helpers such as `ListCard` and `ItemCard` remain unexported
inside their feature file until reuse requires another location.

## Composition and Styling

- Reuse `Button`, `Card`, `PageIntro`, `Loading`, `ErrorNotice`, `EmptyState` and
  `PhotoGallery`. `AppShell` accepts children around the routed `Outlet`.
- Use `Button asChild` with a single Router `Link` for button-styled navigation,
  as in `frontend/src/components/app-shell.tsx` and the record login prompt:

  ```tsx
  <Button asChild size="small">
    <Link to="/auth" search={{ redirect: "/" }}>登录</Link>
  </Button>
  ```

  Keep actions as buttons and navigation as links; do not nest a button inside
  a link. Non-submit action buttons in forms explicitly use `type="button"`.
- Styling is Tailwind CSS v4 utility classes plus shared CSS in
  `frontend/src/styles/main.css`. Use the existing `field`, `field-label`,
  `prose-note`, and theme colors where applicable. `Button` uses CVA variants;
  `cn` in `frontend/src/lib/utils.ts` combines classes with `tailwind-merge`.
  There is no CSS Module or styled-components convention.
- Follow the existing responsive composition: `AppShell` wraps navigation on
  small screens; checklist grids expand at `md`/`lg`; record forms keep a
  bounded width. Dynamic progress widths use inline styles in checklist cards.
- Render user notes as text with `prose-note`; record/history/shared pages do
  not inject user HTML. Preserve conditional optional metadata rather than
  showing empty location or details sections.

## Loading, Errors and Accessibility

`frontend/src/features/checklists/pages.tsx` branches between loading, error,
content and empty results. For infinite queries it retains loaded cards when a
later page fails, shows the error beside them and disables the load-more action
while fetching. `frontend/src/features/auth/page.tsx` and record pages display
mutation errors and a disabled pending submit button while retaining inputs.

Preserve these concrete semantics:

- `Loading` has `role="status"`; `ErrorNotice` has `role="alert"`.
- `AppShell` has a skip link, named navigation, a main landmark, and accessible
  names for icon-only controls. Decorative Lucide icons use `aria-hidden`.
- Inputs have wrapping labels or `htmlFor`/`id` pairs; hidden label text names
  checklist filters. Photos have alt text and links have accessible names.
- `Button` and navigation controls use `min-h-11` or `size-11` (44px under the
  default spacing scale), visible keyboard focus and disabled states. Shared
  CSS disables animation/transitions for reduced motion.

These are current code patterns, not proof of a complete accessibility audit.
The auth tabs currently expose roles/selection through native buttons; do not
claim a complete arrow-key tab-widget implementation from those roles alone.

## Common Mistakes and Validation

Avoid replacing semantic controls with clickable containers, dropping forwarded
attributes from primitives, hiding a mutation error, removing labels/focus
styles, using array positions as IDs for record cards, or treating `isPending`
as sufficient for every loading state (`isFetchingNextPage` controls pagination).

For component changes run `./hako node npm run typecheck`,
`./hako node npm run format:check` and `./hako node npm run build`.
`frontend/e2e/catalog.spec.ts` checks accessible loading/error/empty states;
`frontend/e2e/import.spec.ts` checks keyboard submission and validation;
`frontend/e2e/completion.spec.ts` checks disabled completion, photos and responsive
flows. Run affected browser cases on desktop and mobile using
[validation.md](../trellis-plus/validation.md). There are no component unit tests
or approved screenshot baselines in the current frontend.
