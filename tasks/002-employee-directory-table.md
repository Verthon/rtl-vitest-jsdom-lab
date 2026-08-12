# Task 002 — Rename slice, response envelope, table rendering

Status: ready
Depends on: 001 (done)
Scope: `src/employees/` → `src/employee-directory/`, plus the MSW handler.
Do not touch `TESTING_PITFALLS.md` or any `DRAFT_FE_TESTING_*.md`.

**Setup-only: write no new `.spec` files in this task.** The pitfalls this repo
exists to demonstrate need pagination and filtering to be meaningful, and those
land in 003+. Any test written now gets rewritten then. Keep the existing
`api.spec.ts` passing (adapt it to the new envelope), but add nothing new.

## Goal

Turn the employees slice into a capability-named slice that renders a real,
paginated-shaped dataset in a semantic table. This is the precondition for every
later task — `getByRole('row')`, `within(row)`, and header-row scoping do not
work against a `<ul>`.

## Steps

### 1. Rename the slice

`src/employees/` → `src/employee-directory/`. Update importers:

- `src/mocks/handlers.ts` — `@/employees/mocks` → `@/employee-directory/mocks`
- `src/routing/router.tsx` — `@/employees/routes` → `@/employee-directory/routes`

Grep for any remaining `@/employees` references.

**The route path stays `/employees`.** The URL belongs to the user; the folder
name is an internal concern. Do not rename the route.

File names inside the slice keep their current names (`EmployeesPage.tsx`,
`api.ts`, `types.ts`, `mocks.ts`, `api.spec.ts`) — only the folder changes.

### 2. Response envelope

`employeesQueryOptions` currently resolves `Employee[]`. Change the API contract
to a paginated envelope:

```ts
export type Paginated<T> = {
  data: T[]
  page: number
  perPage: number
  total: number
}
```

Put `Paginated<T>` in `src/employee-directory/types.ts` for now. Do not promote
it to `src/lib/` — premature extraction to a shared folder is how VSA repos grow
a god-folder of types. It moves when a second slice needs it.

`employeesQueryOptions` stays a plain `queryOptions` object (no page argument
yet — that arrives in 003) but its `queryFn` now resolves
`Paginated<Employee>`. Update `api.spec.ts` to match the new shape.

### 3. Fixture

Replace the 3-employee fixture in `mocks.ts` with **47 employees**, static and
deterministic — a hand-written or literal array, not faker, not generated at
import time. Deterministic fixtures matter for the fixture-coupling pitfalls
this repo documents.

47 is deliberate: not divisible by 10, so the last page is partial once
pagination lands in 003.

Vary the data meaningfully — spread across departments, all four `status`
values represented, names that sort non-trivially (so alphabetical order differs
from insertion order).

Keep exporting the full array (e.g. `mockEmployees`) so later tasks and tests
can reference it.

### 4. Real MSW handler logic

`createEmployeesHandlerMocks(baseUrl)` must return a handler that **reads the
request's query params and computes the response** — a fake server that behaves
like a server, not a canned payload.

```ts
http.get(`${baseUrl}/employees`, ({ request }) => {
  const url = new URL(request.url)
  const page = Number(url.searchParams.get('page') ?? 1)
  const perPage = Number(url.searchParams.get('perPage') ?? 10)
  const start = (page - 1) * perPage
  return HttpResponse.json({
    data: mockEmployees.slice(start, start + perPage),
    page,
    perPage,
    total: mockEmployees.length,
  })
})
```

This is the shared happy-path handler. Per-test `server.use()` overrides are for
exceptions only (errors, empty results) and get proper helpers in task 004.

Why this matters: with a canned handler, a test asserting "click next → see page
2" passes because the stub was hand-written to say so — it proves the stub is
right, not the component. With a real handler, a component that forgets `page`
in its query key gets page 1 back and the test fails honestly.

The page component does not send `page`/`perPage` yet, so it receives the
defaults. That is correct for this task.

### 5. Table rendering

Add the shadcn table component via the CLI — do not hand-write it:

```bash
npx shadcn@latest add table
```

Replace the `<ul>` in `EmployeesPage.tsx` with `<Table>`, rendering
`data.data`. Columns: **Name, Role, Department, Status**.

- Use `TableHeader` / `TableHead` / `TableBody` / `TableRow` / `TableCell` so
  the DOM carries real `columnheader` / `row` / `cell` roles.
- Status renders as plain text for now. No badge component, no row actions, no
  sorting affordances — those arrive in later tasks.
- Keep the existing `isPending` and `isError` branches exactly as they are.

## Out of scope (later tasks)

Pagination controls, filter input, status filter, sortable headers, empty state,
row mutations, delete confirm, row detail. Do not anticipate them — no unused
props, no placeholder handlers, no commented-out scaffolding.

## Constraints

- No code comments (project convention).
- Preserve the lazy code-split boundary in `routes.tsx`.
- Do not restructure `lib/`, `mocks/`, `testsConfig/`, or `components/ui/`.

## Verification

```bash
npm run build          # tsc -b && vite build
npm run test:unit      # existing specs pass, adapted to the envelope
npm run lint
npm run scan:dead-code # knip — no new unused files/exports
```

Also confirm by eye: `/employees` renders 10 rows of 47, in a real `<table>`.
