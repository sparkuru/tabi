# State Management

## State ownership

The frontend uses React state and TanStack Query; there is no separate global
state store. `frontend/src/main.tsx` installs the shared `queryClient` and
router providers. Keep state at the existing boundary:

| State | Current owner and examples |
| --- | --- |
| Server data and session | Query cache: `hooks/use-session.ts`, `features/checklists/pages.tsx`, `features/history/page.tsx` under `frontend/src/` |
| Form drafts, filters, pagination, messages | Component `useState`: `features/auth/page.tsx`, `features/admin/checklist-import.tsx`, `features/history/page.tsx` |
| Retry keys, staged uploads, in-flight guards | `useRef`: `features/entries/use-completion.ts`, `features/entries/pages.tsx`, `features/admin/checklist-import.tsx` |
| Navigation parameters and resumable action | TanStack Router params/search in `frontend/src/router.tsx`; auth redirect and item `complete` intent |
| Derived display data | Compute from query results: flattened pages, progress and categories in `features/checklists/pages.tsx` |

Administrative editors deliberately copy selected server objects into local
`ChecklistWrite` / `ItemWrite` drafts in `frontend/src/features/admin/page.tsx`.
`ProfilePage` instead keeps a nullable name override and displays
`name ?? session.data.display_name`. Avoid adding a second persistent copy of
server data merely to render it.

## Query keys and refresh

`frontend/src/lib/query-client.ts` sets query freshness to 30 seconds, one
retry, and window-focus refetch. `useSession` uses `["session"]`, maps HTTP 401
to `null`, and disables retries. Other failures go through `apiData` and remain
errors rather than becoming an anonymous session.

Include every request-changing value in the key. `ListPage` uses
`["items", listId, query, category, sort]`; `HistoryPage` uses
`["history", category, offset]` and enables its request only for a known session.
Infinite queries start at offset zero, derive the next offset from
`offset + limit < total`, and flatten `data.pages` for display.

```tsx
// frontend/src/features/history/page.tsx
const history = useQuery({
  queryKey: ["history", category, offset],
  queryFn: () => apiData(historyApiMeCheckinsGet({
    query: { category: category || undefined, limit: 20, offset },
  })),
  enabled: Boolean(session.data),
});
```

After mutations, invalidate the affected key families. Completion and new
records refresh `lists`, `list`, `items`, `item`, and `history`; admin changes
also refresh their admin keys. `ProfilePage` refreshes `session`. Login in
`frontend/src/features/auth/page.tsx` puts the returned user in `["session"]`
before navigation; logout in `frontend/src/components/app-shell.tsx` sets it
to `null` and invalidates queries. The current logout path invalidates the cache;
it does not clear all cached data. Do not describe it as a cache purge.

## Async operation state

Use pending/busy state for visible feedback and refs where a synchronous guard
must survive renders. `useCompletion` keeps an `active` ref to block duplicate
calls and a request-key ref for safe retries. It rotates the key only after
success, then awaits invalidation. `NewCheckinPage` retains a `Map<File, string>`
of completed staged uploads so a retry need not upload the same files again.

`ChecklistImport` tracks source revisions, clears preview/error/message when
the source changes, and accepts a preview response only for the current
revision. Its `busy` union distinguishes file reading, preview, import and
selection. Preserve these transitions when extending the flow.

The guest completion intent lives in the redirect URL. `ItemPage` consumes it
once, removes the search flag with replace navigation, and uses a ref to avoid
repeating it. `frontend/src/router.tsx` keys that component by item ID so the
per-item guard resets on another item.

## Common mistakes and verification

- Omitting filters or IDs from a query key causes unrelated requests to share
  cached data. Reset pagination when its filter changes, as `HistoryPage` does.
- Updating only the visible item after completion leaves list progress and
  history stale. Reuse the existing invalidation families.
- Generating a retry key for every click defeats the current retry contract;
  keep it until the operation succeeds.
- Treating an edited import source as already previewed can import unreviewed
  content. Clear the preview and preserve the revision check.
- Long sleeps do not explain freshness behavior. The guest-resume test in
  `frontend/e2e/completion.spec.ts` advances the Playwright clock past 30 seconds
  and dispatches visibility changes to exercise the real refetch path.

For state changes, run type checking and the affected browser scenarios using
the isolated runtime in [Quality Guidelines](./quality-guidelines.md).
`frontend/e2e/import.spec.ts` covers preview/reuse/conflict and disabled controls;
`frontend/e2e/completion.spec.ts` covers progress, retry behavior, guest resume,
history and deletion; `frontend/e2e/catalog.spec.ts` covers loading and empty
states. These are behavioral examples, not evidence that a new change passed.
