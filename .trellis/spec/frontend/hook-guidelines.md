# Frontend Hook Guidelines

## Existing Custom Hooks

There are two custom hooks. Hook functions use `use` + PascalCase and kebab-case
files; shared logic lives in `frontend/src/hooks/`, feature logic stays beside
the feature.

| Hook | Source | Contract and consumers |
| --- | --- | --- |
| `useSession()` | `frontend/src/hooks/use-session.ts` | Returns a TanStack Query result keyed by `["session"]`; used by `components/app-shell.tsx`, checklist, record, history and admin pages. HTTP 401 becomes `null`; other errors still throw. Retries are disabled for this query. |
| `useCompletion(itemId)` | `frontend/src/features/entries/use-completion.ts` | Returns mutation state plus `complete()`; checklist `ItemCard` and `ItemPage` share login redirection, request guarding, request keys and cache invalidation. |

Do not create a hook for each API call merely to mirror the SDK. Most page-local
queries and mutations currently remain inside their feature component.

## Query Patterns

Use TanStack Query with the existing SDK and `apiData` response adapter. Include
the changing ID/filter/page inputs in the key. For example, the list detail
query in `frontend/src/features/checklists/pages.tsx` is:

```tsx
const list = useQuery({
  queryKey: ["list", listId],
  queryFn: () =>
    apiData(listDetailApiListsListIdGet({ path: { list_id: listId } })),
});
```

Other source examples:

- `ListPage` uses `useInfiniteQuery` with `["items", listId, query, category,
  sort]`, an initial offset of `0`, and next offsets derived from the response's
  `offset`, `limit` and `total`. `HomePage` uses the same paging shape for lists.
- `frontend/src/features/history/page.tsx` uses `["history", category, offset]`
  and `enabled: Boolean(session.data)` for authenticated history. It resets
  offset when the category changes and corrects an out-of-range page after data
  shrinks. Do not copy public-query behavior onto an authenticated query.
- `frontend/src/lib/query-client.ts` owns the single QueryClient, with a
  30-second stale time, one query retry and window-focus refetch. `main.tsx`
  provides that same client; mutations invalidate it rather than allocating
  another client.

`apiData` in `frontend/src/api/client.ts` turns unsuccessful responses or missing
data into errors. The session hook deliberately handles HTTP 401 before using
that adapter. Do not turn every session request failure into a logged-out result.

## Mutations, Refs and Effects

`useCompletion` holds a request key and an immediate in-flight guard in refs.
`complete()` sends guests to `/auth` with `/items/<id>?complete=1` as the return
path; it guards duplicate active requests, awaits `mutateAsync`, and lets the
mutation retain its error for rendering. The key survives a failed retry and is
rotated only after success. Success awaits invalidation of `lists`, `list`,
`items`, `item` and `history`; do not refresh only the current item and leave its
list progress stale.

`frontend/src/features/entries/pages.tsx` keeps record creation as a local
`useMutation`; it similarly retains a request key and a map of staged file
uploads for retry, then invalidates progress/history and navigates after success.
It also pairs `URL.createObjectURL` in an effect with `URL.revokeObjectURL` cleanup
when the selected photos change. Preserve cleanup when modifying previews.

`ItemPage` in `frontend/src/features/checklists/pages.tsx` uses an `autoCompleted`
ref to consume the post-login completion flag once, removes that search flag with
replace navigation, and invokes the shared completion hook. `frontend/src/router.tsx`
keys `ItemPage` by `itemId` so this one-shot state resets for another item. Hooks
run before loading/error returns; async actions run from handlers or effects,
not during rendering. The root renders under `StrictMode`.

## Common Mistakes and Validation

Avoid omitted key inputs, conditional hook calls, recreating a QueryClient in a
component, effects used as a parallel fetching cache, regenerating an idempotency
key on a failed retry, removing the immediate request guard, or deleting effect
cleanup. The completion catch is intentional: the mutation exposes the failure;
new hooks must not silently discard errors without another visible error path.

For hook behavior changes run `./hako node npm run typecheck`,
`./hako node npm run format:check` and the affected isolated browser cases.
`frontend/e2e/completion.spec.ts` verifies one completion request while busy,
guest login resumption, and completion again after deletion and focus refetch.
Its clock advances past 30 seconds before the real visibility event triggers
refetch; preserve that freshness contract instead of adding long sleeps.
`frontend/e2e/catalog.spec.ts` covers query loading/error states. Setup and
desktop/mobile execution are in [validation.md](../trellis-plus/validation.md).
There is no dedicated hook unit-test suite; these browser tests cover observable
behavior and do not prove every hook-internal retry branch.
