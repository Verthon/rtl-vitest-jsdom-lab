# Task 003 — Server-driven pagination

Status: ready
Depends on: 002 (done — slice renamed, envelope in place, real MSW handler)
Scope: `src/employee-directory/`. Do not touch `TESTING_PITFALLS.md` or any
`DRAFT_FE_TESTING_*.md`.

**Setup-only: write no new `.spec` files.** Keep `api.spec.ts` passing, adapted
to the new query-options signature. Tests arrive once the filter lands in 005 —
the pitfalls worth demonstrating need pagination *and* filtering interacting.

## Goal

Wire the page param end-to-end: component state → query key → request → MSW
handler → rendered rows. The handler already reads `?page`/`?perPage`; nothing
sends them yet.

## Deliberate design decision — read before implementing

**Page state lives in `useState`, not the URL.** This is intentional and is not
an oversight to be improved on. Moving pagination and filter state into search
params is task 006, and the churn that refactor causes is itself the subject of
a documented pitfall. Do not anticipate it: no `useSearchParams`, no router
coupling, no "prepare for URL state" abstraction.

## Steps

### 1. `employeesQueryOptions` becomes a function

Currently a static object with `queryKey: ['employees']`. Change to:

```ts
export function employeesQueryOptions(page: number) {
  return queryOptions({
    queryKey: ['employees', page] as const,
    queryFn: () => apiGet<Paginated<Employee>>('employees', { page, perPage: PER_PAGE }),
  })
}
```

`PER_PAGE` is a module constant in the slice, value `10`. Not configurable, not
a prop — page size selection is out of scope.

`apiGet`'s second argument is already `SearchParams` (`Record<string, string |
number | boolean | undefined>`), so `{ page, perPage }` passes through to ky's
`searchParams` unchanged. Verify the resulting URL is
`/employees?page=2&perPage=10`.

**The `page` in the query key is load-bearing.** Without it every page shares
one cache entry and paging silently returns stale rows.

Update `api.spec.ts` for the new signature.

### 2. Page state in the component

`useState<number>(1)` in `EmployeesPage`. Pass to `employeesQueryOptions(page)`.

### 3. `placeholderData` to keep previous page visible

Add `placeholderData: keepPreviousData` (imported from `@tanstack/react-query`)
to the query options. Without it the table unmounts to the spinner on every page
change, which is a worse UX and — more importantly here — erases the in-flight
window where stale rows are still on screen.

That window is the point. It is what makes a naive "click next, assert a row is
present" test pass against page 1's data. Preserve it.

Use `isPlaceholderData` from the query result to dim or disable the pagination
controls while fetching. Do not swap to the spinner.

### 4. Pagination controls

Add the shadcn pagination component via the CLI — do not hand-write it:

```bash
npx shadcn@latest add pagination
```

Render below the table:

- Previous / Next, each disabled at the boundary (`page === 1`, and
  `page * perPage >= total`).
- Numbered page links. With 47 rows at 10/page that is 5 pages — small enough to
  render all of them. No ellipsis truncation logic.
- Current page marked with `aria-current="page"` — the shadcn component does
  this via `isActive`; confirm it reaches the DOM.
- A count line: `Showing 1–10 of 47`. Compute from `page`, `perPage`, `total`,
  clamping the upper bound on the last page (should read `41–47`, not `41–50`).

Disabled state must be real — `aria-disabled` plus a no-op handler, or a
`<button disabled>`. A link that looks disabled but still navigates is a bug the
later tests should be able to catch.

### 5. Empty state

Use the shadcn `empty` component already present in `src/components/ui/`.

Render when `data.data.length === 0`. Message: "No employees found."

Only one empty case exists today (a page beyond the range). The
filter-returns-nothing case is a *different* message and arrives with the filter
in 005 — do not add it now.

### 6. Out-of-range guard

If `page` exceeds the last page, the handler returns an empty `data` array.
Decide and implement one behavior, do not do both:

- Clamp `page` to the last page when `total` is known, or
- Render the empty state and leave Previous enabled so the user can escape.

Prefer the second — it is simpler, and clamping introduces a state-sync effect
that is its own source of bugs.

## Out of scope

Filter input, status filter, sortable headers, URL state, row actions,
mutations, delete, row detail, page-size selection. No unused props, no
commented-out scaffolding.

## Constraints

- No code comments (project convention).
- Keep the existing `isPending` / `isError` branches.
- Preserve the lazy code-split boundary in `routes.tsx`.
- Do not modify the MSW handler — it already reads both params.

## Verification

```bash
npm run build
npm run test:unit
npm run lint
npm run scan:dead-code
```

Do not run the dev server (it is blocked) and do not verify by eye.

This task is setup-only, so the boundary cases below are **not** asserted yet —
they are what task 005 will cover once the filter exists. Reason through them
while implementing rather than testing them now:

- Page 1: 10 rows, "Showing 1–10 of 47", Previous disabled.
- Page 5: 7 rows, "Showing 41–47 of 47", Next disabled.
- Page change keeps the old rows mounted instead of flashing the spinner.
- The request carries `?page=N&perPage=10`.
