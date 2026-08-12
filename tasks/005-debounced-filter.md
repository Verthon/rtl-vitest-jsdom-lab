# 005 — Debounced name filter (server-side)

Read `AGENTS.md` and `CONVENTIONS.md` first. Do only this task.

Add a text input that filters employees by name. The filter is a **server
param**: it goes into the query key and the request, and changing it resets
pagination to page 1. Input is debounced at **300ms**.

This task is a **red-green loop**. Every scenario below is written as a test
first, run, and confirmed failing *for the stated reason*, before the code that
satisfies it exists. A test that passes the first time you run it is a defect in
the test — fix the test, not the code.

Not setup-only. The acceptance tests here are the gate.

## Decisions — settled. Do not substitute your own.

- **Server-side, not client-side.** The filter is a request param, not a
  `.filter()` over the current page. Filtering the 10 rows already fetched is a
  different feature and is not this one.
- **300ms debounce.** Not 250, not 500. Tests advance timers against this
  number; it is part of the contract.
- **`useDebouncedValue` hook**, new file `src/employee-directory/useDebouncedValue.ts`.
  Signature: `useDebouncedValue<T>(value: T, delayMs: number): T`. Generic, no
  employee knowledge.
- **No spec file for the hook.** `CONVENTIONS.md` names two seams and nothing
  below them. A `renderHook` test for `useDebouncedValue` tests `setTimeout`, not
  the feature. It is covered through the page seam or not at all.
- **`page` stays `useState`.** The URL migration is 006. Do not reach for
  `useSearchParams` here.
- **The input is controlled by the raw value, the query uses the debounced
  one.** Typing must update the field immediately — a field that lags 300ms
  behind the keyboard is a bug, and a test that only ever asserts on rows will
  not catch it.
- **An empty filter sends no `q` param at all.** Pass `undefined`, not `''`.
  `apiGet` forwards `searchParams` to ky. Verified against the installed ky:

  ```
  { page: 1, perPage: 10, q: undefined }  →  /employees?page=1&perPage=10
  { page: 1, perPage: 10, q: '' }         →  /employees?page=1&perPage=10&q=
  ```

  The unfiltered request must stay identical to what 003 sends. It also keeps
  the query key stable: `['employees', 1, undefined]` on first render rather
  than a key that changes the moment the user types and clears the field.
- **Param name is `q`.** Query key is `['employees', page, q] as const` with `q`
  as `string | undefined`.
- **Match is case-insensitive substring on `name` only.** Not role, not
  department. Implemented in the MSW handler.

## Steps

Steps 1 and 2 are groundwork with no behavioral gate — they are verified by the
scenarios that follow, which is why the scenarios come after and not before.

### 1. Handler learns `q`

In `src/employee-directory/mocks.ts`, `createEmployeesHandlerMocks` reads `q`
from the request, filters `mockEmployees` by case-insensitive substring on
`name`, and *then* paginates the filtered list. `total` is the filtered count.

Order matters: filter, then slice. Slicing first and filtering the slice is
wrong and step 6 catches it.

### 2. Query options learn `q`

`employeesQueryOptions(page: number, q?: string)`. Key `['employees', page, q]`.
`queryFn` passes `q` through to `apiGet` alongside `page` and `perPage`.

Update the existing `api.spec.ts` call site if the signature change breaks it.
Keep `placeholderData: keepPreviousData`.

### 3. Scenario — the field accepts typing

Red first. In `EmployeesPage.spec.tsx`:

```
it('shows what the user typed in the filter field')
```

Render, type `Ada` into the filter field, assert the field's value is `Ada`.
Query it by role — `getByRole('textbox', { name: ... })`. Give the input a real
accessible name via a `<label>`; a bare `placeholder` is not a label.

This test uses **real timers**. It asserts nothing about rows, so the debounce
never needs to elapse.

Run it. It fails because there is no field. Then add the input to
`EmployeesPage.tsx` — `useState` for the raw value, controlled, labelled — and
make it pass.

### 4. Scenario — filtering narrows the table

This is the fake-timer scenario. Read this whole step before writing code.

```
it('filters the table by name after the debounce elapses')
```

`userEvent` v14 waits on real timers internally. Under `vi.useFakeTimers()` it
hangs forever unless you hand it the advance function:

```ts
vi.useFakeTimers()
const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
```

and restore with `vi.useRealTimers()` in `afterEach`. Without `advanceTimers`
this test does not fail — it times out, which is a different and much more
annoying signal.

The scenario: render, wait for the first page, type a string matching exactly
one fixture employee, advance timers by 300, then assert the table holds exactly
one row and that it is the right person.

Verified fixture counts, case-insensitive substring on `name`:

| Query | Matches |
|---|---|
| `Grace Hopper` | 1 |
| `Ada` | 2 (Ada Lovelace, Ada Yonath) |
| `an` | 13 → 2 pages |
| `Zzz` | 0 |

Use `Grace Hopper` here. Note `Ada` matches two, not one — `Ada Yonath` is at
the end of the fixture. Do not assume a name is unique without checking.

Advancing timers must be wrapped in `act` so React flushes the state update:

```ts
await act(async () => { await vi.advanceTimersByTimeAsync(300) })
```

Use the `Async` variant. `advanceTimersByTime` alone fires the timer but does
not let the resulting fetch settle.

Run it red before implementing. Then wire `useDebouncedValue(rawQuery, 300)`
into the query options and make it pass.

### 5. Scenario — the debounce actually debounces

```
it('does not refetch until typing stops')
```

The point of this test is that step 4 passes just as well with **no debounce at
all** — a filter that fires on every keystroke still shows one row after 300ms.
Without this scenario, `useDebouncedValue` is unfalsifiable.

Assert on requests, not rows. Count them with an MSW life-cycle listener
registered inside the test:

```ts
const requests: string[] = []
const onRequest = ({ request }: { request: Request }) => {
  requests.push(new URL(request.url).searchParams.get('q') ?? '')
}
server.events.on('request:start', onRequest)
```

Remove the listener in the same test (`server.events.removeListener`) — MSW
life-cycle listeners are not cleared by `resetHandlers`, so a leaked one keeps
counting into later tests.

Type several characters with the clock advanced well under 300ms between them,
then advance past 300 once. Exactly one filtered request should have been sent,
carrying the full typed string — not one per keystroke, and not a prefix.

### 6. Scenario — filtering resets pagination

```
it('returns to the first page when the filter changes')
```

Go to page 3 first, then type `an` — 13 matches, so the filtered result is still
two pages and the reset is observable rather than incidental. After the
debounce, assert the range readout reads `Showing 1–10 of 13` and that the
previous-page button is disabled.

Without the reset, the component asks for page 3 of a short filtered result and
renders an empty table. That is also what step 1's filter-then-slice ordering
protects against.

Implement the reset as part of the same state update that sets the query — do
not add an effect that watches the debounced value and calls `setPage`. An
effect here double-renders and will fight 006.

### 7. Scenario — a filter matching nothing

```
it('shows the empty state when no employee matches')
```

Type `Zzz` — 0 matches. After the debounce, assert the "No employees found."
message and that no table is rendered.

This is the first honest exercise of the empty branch — see HANDOFF open item 1.
It stays.

### 8. Mutation-check every scenario

Not optional, and not a formality. For each row, break the code as described,
confirm the named test goes red, then revert. If a mutation does not redden its
test, the test is wrong.

| Mutation | Must redden |
|---|---|
| `q` dropped from the query key | filters the table |
| `q` dropped from the `apiGet` params | filters the table |
| Debounce delay → 0 | does not refetch until typing stops |
| Input bound to debounced value instead of raw | shows what the user typed |
| Page reset removed | returns to the first page |
| Handler slices before filtering | returns to the first page |
| Handler match made case-sensitive | filters the table (type mixed case) |
| Empty `q` sent as `''` instead of `undefined` | *(no test — verify by hand that the unfiltered request URL is unchanged)* |

The last row is deliberate: it is the one decision above with no behavioral
gate. If you can find an assertion that catches it without coupling a test to
the URL string, add it. Otherwise leave it and say so.

## Out of scope

- URL search params for filter or page — 006.
- Status/department filters, sorting, clear-filter button, result-count
  messaging beyond the existing range readout.
- Fixing the flaky real-timer delay test (HANDOFF open item 2). Leave it alone;
  it is a separate decision.
- Touching `src/components/ui/`.

## Done

All four commands pass:

```bash
npm run build && npm run test:unit && npm run lint && npm run scan:dead-code
```

`scan:dead-code` currently reports pre-existing unused vendored exports
(HANDOFF open item 3). Do not fix those here, and do not let them mask a *new*
unused export you introduced — compare against the baseline before and after.
