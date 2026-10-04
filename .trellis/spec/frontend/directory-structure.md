# Frontend Directory Structure

## Application Layout

`frontend/` is a React 19 + TypeScript application built with Vite. Routes are
declared in code with TanStack Router; there is no file-based route generator.
Paths below are relative to the repository root.

```text
frontend/
├── src/
│   ├── main.tsx                 # API setup, QueryClientProvider, RouterProvider
│   ├── router.tsx               # Route tree, params/search parsing, root shell
│   ├── api/
│   │   ├── client.ts            # Transport configuration and response helpers
│   │   └── generated/           # Generated SDK, types and client internals
│   ├── components/
│   │   ├── app-shell.tsx        # Navigation, session controls, main landmark
│   │   ├── common.tsx           # Intro/loading/error/empty/photo components
│   │   └── ui/                  # Button and Card primitives
│   ├── features/
│   │   ├── admin/              # page.tsx and checklist-import.tsx
│   │   ├── auth/               # page.tsx and profile.tsx
│   │   ├── checklists/         # pages.tsx: home, list and item screens
│   │   ├── entries/            # pages.tsx and use-completion.ts
│   │   ├── history/            # page.tsx
│   │   └── sharing/            # page.tsx
│   ├── hooks/                  # use-session.ts: application-wide session query
│   ├── lib/                    # QueryClient, request keys, class/date helpers
│   └── styles/main.css         # Tailwind theme and shared field/note styles
├── e2e/                        # Isolated browser flows and helpers
├── e2e-preview/                # Actual preview login/read-only import preview
├── openapi.json                # Backend API snapshot
├── openapi-ts.config.ts        # SDK generation configuration
├── playwright.config.ts
├── playwright.preview.config.ts
└── vite.config.ts
```

## Placement and Imports

- Keep screen-specific components beside their screens. `ListCard` and
  `ItemCard` stay private to `frontend/src/features/checklists/pages.tsx`;
  record creation/editing share `frontend/src/features/entries/pages.tsx`.
  The current code does not require one component per file.
- Put substantial feature UI in its own feature file, as with
  `frontend/src/features/admin/checklist-import.tsx`, composed by
  `frontend/src/features/admin/page.tsx`.
- Put reusable presentation in `components/common.tsx`, low-level UI in
  `components/ui/`, shared hooks in `hooks/`, and feature-only hooks beside
  that feature. `useSession` and `useCompletion` illustrate the distinction.
- Use relative imports and named exports, following `router.tsx` and the
  feature pages. File names are lowercase (`page.tsx`, `pages.tsx`) or kebab
  case (`app-shell.tsx`, `use-completion.ts`); exported components are PascalCase.
- Add routes to `frontend/src/router.tsx`. Its adapters read route params and
  validated search values, then pass typed props to screens, for example:

  ```tsx
  component: () => <ListPage listId={listRoute.useParams().listId} />,
  ```

## Generated Files and Assets

Call the SDK through `frontend/src/api/generated` and use transport helpers in
`frontend/src/api/client.ts`. Do not hand-edit `api/generated/`; API changes
require the backend OpenAPI snapshot and `npm run api:generate`.

The current application uses Lucide icons, CSS backgrounds and server-provided
media URLs. There is no existing `src/assets/` or `public/` asset convention.
`frontend/vite.config.ts` serves and emits checklist documentation/schema/example
downloads from `docs/` and `backend/data/examples/`; update those authoritative
inputs instead of duplicating downloadable files in the frontend.

## Common Mistakes and Validation

Avoid adding a second route registry, moving private feature helpers into shared
modules without an actual consumer, introducing an import alias absent from
`frontend/tsconfig.json`, or editing generated SDK files as ordinary source.

For source or route moves, run `./hako node npm run typecheck`,
`./hako node npm run format:check` and `./hako node npm run build` from the root.
`frontend/e2e/catalog.spec.ts` covers public navigation and loading/error states;
`frontend/e2e/import.spec.ts` verifies authoritative download links. Use the
isolated browser setup in [validation.md](../trellis-plus/validation.md) for
affected flows. Documentation-only edits require path/link checks and
`git diff --check`, not an application test run.
