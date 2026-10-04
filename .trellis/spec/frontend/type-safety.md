# Type Safety

## Compiler and type ownership

`frontend/tsconfig.json` enables strict TypeScript, unused-local/parameter
checks and switch fallthrough checks. It includes `src`, Vite configuration and
OpenAPI generator configuration. Browser tests have separate strict type-check
scripts in `frontend/package.json`; the application check does not cover them.

Use the generated API types from `frontend/src/api/generated` for request and
response shapes. Examples are `ChecklistOut` / `ItemSummaryOut` in
`frontend/src/features/checklists/pages.tsx`, `PositionIn` in
`frontend/src/features/entries/pages.tsx`, and `ChecklistWrite` / `ItemWrite` in
`frontend/src/features/admin/page.tsx`. Keep UI-only types with their component
or helper. Use `import type` for type-only imports.

Derive narrower types from the existing contract rather than duplicating enum
values in an independent API model:

```ts
// frontend/src/features/admin/page.tsx
type Role = ChangeRoleIn["role"];
const roleLabels: Record<Role, string> = {
  user: "普通用户",
  content_admin: "内容管理员",
  system_admin: "系统管理员",
};
```

`frontend/src/components/ui/button.tsx` combines
`React.ComponentProps<"button">` with `VariantProps<typeof buttonVariants>`;
`frontend/src/components/common.tsx` uses `ReactNode` and `MediaOut[]` for shared
component boundaries. Simple page props are inline object types.

## OpenAPI generation and response helpers

The backend's actual `app.openapi()` is the source for `frontend/openapi.json`.
`frontend/openapi-ts.config.ts` reads that file and generates the fetch client
and SDK into `src/api/generated` with `@hey-api/openapi-ts`. After an API change,
update the schema from the backend, then run from the repository root:

```sh
./hako node npm run api:generate
./hako node npm run typecheck
./hako node npm run build
```

Do not manually patch generated files. The export/generation boundary is also
documented in [Runtime and Data](../product/runtime-and-data.md).

Use the helpers in `frontend/src/api/client.ts`: `apiData<T>` unwraps typed
success data and throws on unsuccessful or missing-data results; `apiDone`
handles successful no-content operations. `postJsonText<T>` is the explicit raw
JSON-text path for checklist preview/import. Generated TypeScript declarations
provide compile-time contracts; these helpers do not runtime-validate every
successful response. The upload helper's response cast likewise assumes the
server contract.

## Narrow unknown inputs at runtime

Error state is `unknown`, as seen in admin import, profile and record pages.
`ErrorNotice` accepts `unknown` and displays `Error.message` only after an
`instanceof Error` check. `describeError` / `describeIssue` in
`frontend/src/api/client.ts` inspect object membership, strings and arrays before
reading FastAPI error details. Preserve that boundary rather than casting
arbitrary failures to an expected error shape.

Search inputs are untrusted values. `frontend/src/router.tsx` accepts
`Record<string, unknown>`, narrows `redirect` to a string, and normalizes allowed
representations of `complete` to a boolean. It registers `typeof router` with
TanStack Router so links, params and search are checked against actual routes.
The auth page separately restricts redirects to local paths.

Nullable API fields remain nullable until the UI handles them. For example,
`ProfilePage` uses `File | null` and `string | null`; `NewCheckinPage` uses
`PositionIn | null`; `ListPage` narrows nullable categories with a type predicate:

```ts
// frontend/src/features/checklists/pages.tsx
.filter((value): value is string => Boolean(value))
```

## Validation boundaries and existing casts

There is no frontend Zod/Yup validation layer. HTML input constraints provide
basic form checks. `ChecklistImport` checks UTF-8 decoding and the 2 MiB byte
limit, then sends the original source text to the server for syntax and schema
validation. Do not parse/stringify that source before submitting: it would
change the bytes and server diagnostics.

Some current paths use bounded assertions: select values are cast to their
fixed option union, `uploadFile` casts its JSON response, and the older reviewed
import in `frontend/src/features/admin/page.tsx` casts `JSON.parse` to
`ReviewedImportIn`. Those casts are not runtime validation. Browser fixtures in
`frontend/e2e/helpers.ts` and `frontend/e2e/import.spec.ts` also assert expected
API response shapes after checking status. In contrast,
`frontend/e2e-preview/access.spec.ts` reads credential JSON as `unknown` and
checks the required string fields before use.

Avoid hand-written copies of generated request types, broad `any`, assertions
that hide nullable values, and treating a cast as proof of valid input. Retain
server validation and test the real error path when changing input handling.

## Verification

Use `./hako node npm run typecheck`, `typecheck:e2e` and `typecheck:preview` for
their respective source sets; run `format:check` and `build` for frontend
changes. `frontend/e2e/import.spec.ts` covers malformed/invalid input and server
diagnostics; `frontend/e2e-preview/access.spec.ts` demonstrates runtime narrowing
at a local JSON boundary. Use [Quality Guidelines](./quality-guidelines.md) for
browser execution and isolation rules.
