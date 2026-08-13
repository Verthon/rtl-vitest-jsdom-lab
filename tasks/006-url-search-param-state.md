# 006 — Filter and page live in the URL

Read `AGENTS.md` and `CONVENTIONS.md` first. Do only this task.

**Depends on 005.** Do not start until `tasks/005-debounced-filter.md` is
executed and its tests pass. 006 moves the state 005 built; if 005 has not run,
there is nothing here to move.

Move `page` and `q` out of `useState` and into the URL query string via
`useSearchParams`. The page becomes deep-linkable and back/forward navigable.

Same **red-green loop** as 005: write the test, run it, confirm it fails *for
the stated reason*, then implement. A scenario that passes before you write the
code is a broken test — fix the test.

Not setup-only.

## Why this task exists

This migration is repo content, not just a refactor. `useState` → URL is where
naively-written tests break, and the breakage is the point:

- A test that renders the page and clicks through pagination passes under
  `useState` and keeps passing here — it never proves the URL changed.
- A component reading `searchParams.get('page')` gets `string | null`, so a
  parsing seam appears that did not exist before, along with `NaN` in a query
  key.
- `searchParams` is a **stable, mutable reference** (react-router documents this
  explicitly). Mutating it without calling `setSearchParams` changes values
  between renders while the URL does not follow.
- `setSearchParams` has **no `setState`-style queueing**. Two calls in one tick
  do not build on each other — the second overwrites the first. Filter-changes-
  reset-page is exactly two params updated together, so this is a live bug here,
  not a hypothetical.

Preserve these seams. Do not smooth them away.

## Decisions — settled. Do not substitute your own.

- **`useSearchParams` from `react-router`.** Not `nuqs`, not a custom store, not
  a context. nuqs was considered and rejected for this task: its typed parsers
  and defaults remove precisely the `string | null` parsing and update-batching
  problems that 006 exists to demonstrate. It may return later as a contrasting
  task.
- **Param names: `page` and `q`.** Same `q` as 005, so the query key and request
  shape do not change.
- **The input keeps its local `useState`; the URL write is debounced in the
  input's `onChange`.** Not an effect watching a debounced value. `onChange` sets
  `rawQuery` immediately *and* schedules a debounced `setSearchParams`. Do not
  bind the input's `value` directly to `searchParams` — that is either a
  navigation per keystroke or a field lagging 300ms behind the keyboard, and 005
  already ruled the latter a bug.

  The write happens only from a real user event. That means **no write on mount**
  and therefore no first-render ref guard, and no write triggered by the URL
  changing underneath the component. If you find yourself adding a
  `useEffect` that calls `setSearchParams`, you have taken the wrong path —
  re-read this bullet.

- **`useDebouncedValue` is replaced, not kept.** Delete
  `src/employee-directory/useDebouncedValue.ts` and add
  `src/employee-directory/useDebouncedCallback.ts`:

  ```ts
  useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, delayMs: number): (...args: A) => void
  ```

  Returns a stable function; each call cancels the pending timer and reschedules.
  **Cancel the pending timer on unmount** — a timer firing after teardown calls
  `setSearchParams` on an unmounted component, which in tests surfaces as a
  cross-test navigation and is miserable to trace.

  **The stable function must call the latest `fn`, not the one captured at
  mount.** Keep `fn` in a ref that every render updates, and have the timer read
  that ref when it fires. This is not a style preference — it is load-bearing
  here. `setSearchParams` is memoized on `[navigate, searchParams]`
  (`react-router/dist/development/lib/dom/lib.js:760-764`), so the identity you
  capture at mount permanently closes over the *mount-time* params. A debounced
  write built on it computes its "current" params from the URL as it was on
  first render, silently discarding anything written since.

  **This has no gate in 006.** Both params are traced end-to-end and neither
  scenario below distinguishes the stale version — step 7's assertion is "no
  `page` key", and a stale base that never had `page` satisfies it for the wrong
  reason. Same status as push-vs-replace: a stated decision resting on review,
  not on a red test. Implement it correctly; a later task with a third param
  will make it observable.

  005's value-debounce has no caller once the write moves into `onChange`, and
  an unused export fails `scan:dead-code`. The shape genuinely changed: URL state
  needs a debounced *action*, not a debounced *value*. Delete it rather than
  keeping both.

  Still no spec file for the hook — same reasoning as 005, it is below both
  seams and is covered through the page.
- **Reading is parsed and clamped; the URL is never rewritten to correct
  itself.** A parse step turns raw params into `{ page: number, q: string |
  undefined }`. `?page=abc` reads as page 1. `?page=99` stays 99 and renders the
  empty state. No `setSearchParams` call to normalize a bad URL — that is a
  navigation triggered by rendering, and it fights the back button.
- **Both params are written in a single `setSearchParams` call.** Resetting page
  while setting the filter is one update, built with the callback form, applied
  once. Two sequential calls in the same tick lose the first.
- **Clean URLs.** Page 1 means no `page` key, not `page=1`. Empty filter means no
  `q` key. `/employees` and `/employees?page=1` must behave identically, and the
  default state must not accumulate keys.
- **Pagination still resets to page 1 when the filter changes.** Behavior
  carried over from 005; only the storage changes.
- **`placeholderData: keepPreviousData` stays.** So does the empty `q` →
  `undefined` rule from 005 — the query key and request must stay byte-identical
  to 005 for the unfiltered case.
- **Filter and page changes push history; they do not replace.** Do not pass
  `{ replace: true }`. Debouncing is what keeps this from spamming history.

  **This one has no test.** Back/forward navigation was deliberately left out of
  006 (see *Out of scope*), so an implementation using `replace: true` passes
  every scenario below. It is a stated decision resting on review, not on a gate
  — do not read its green suite as confirmation. Flagged for the handoff.

## Steps

Steps 1–3 are groundwork with no behavioral gate of their own — they are
verified by the scenarios in steps 4–7, which is why those come after. Every
step numbered "Scenario" is a full red-green cycle: write it, run it, watch it
fail for the stated reason, then implement.

### 1. Parse step

Add a parse function in the slice that turns `URLSearchParams` into the typed
shape the component wants:

```ts
{ page: number, q: string | undefined }
```

Rules: `page` missing, non-numeric, non-integer, or `< 1` → `1`. `q` missing or
empty string → `undefined`.

Not exported for testing on its own — `CONVENTIONS.md` allows two seams and this
is below both. It is covered through the page seam by steps 5 and 6.

Do not clamp `page` to the last page. The upper bound depends on the current
result count, which depends on the filter, which is not known at parse time.
`?page=99` reaching the empty state is intended behavior (step 6).

### 2. Swap the debounce hook

Delete `useDebouncedValue.ts`. Add `useDebouncedCallback.ts` per the signature in
Decisions, including the unmount cancel.

### 3. Component reads from the URL, writes on change

`EmployeesPage` replaces `const [page, setPage] = useState(1)` with the parsed
params from step 1. The raw filter input keeps its own `useState`, initialized
from the URL's `q` so a deep link shows its filter text in the field.

Shape of the write path:

```tsx
const commitQuery = useDebouncedCallback((next: string) => {
  setSearchParams((current) => {
    // build one params object: set-or-delete q, drop page
    return current
  })
}, 300)

<Input
  value={rawQuery}
  onChange={(event) => {
    setRawQuery(event.target.value)
    commitQuery(event.target.value)
  }}
/>
```

Pagination clicks call `setSearchParams` directly — no debounce, a click is
already a discrete intent.

Both params go in **one** `setSearchParams` call. The callback form receives the
current params; mutate that copy and return it. Mutating it is safe and
deliberate — react-router hands the callback `new URLSearchParams(searchParams)`,
a fresh copy, not the stable instance the *Why this task exists* section warns
about (`lib/dom/lib.js:761`). Do not "fix" this by cloning again.

Do not call `setSearchParams` twice in a row — react-router does not queue them.
The setter is memoized on `[navigate, searchParams]`, so both calls in one tick
close over the same `searchParams`, the second builds on a copy that predates the
first, and one write is silently lost.

Removing a key is `params.delete(key)`, not setting it to `''`. Page 1 and an
empty filter mean the key is absent.

### 4. Scenario — pagination writes to the URL

Red first. In `EmployeesPage.spec.tsx`:

```
it('puts the current page in the URL')
```

The existing pagination tests from 003 assert on rows and the range readout, and
they will keep passing through this migration without ever proving the URL
changed. That is the false-pass this scenario closes.

Read the location through a probe component rendered as a sibling — not by
reaching into router internals:

```tsx
function LocationProbe() {
  const { search } = useLocation()
  return <output data-testid="search">{search}</output>
}
```

Render `<><EmployeesPage /><LocationProbe /></>` through `TestAppProviders`.

Click to page 3, assert rows updated *and* the probe reads `?page=3`. Then click
back to page 1 and assert the `page` key is gone entirely — not `?page=1`.

### 5. Scenario — a deep link renders that page

```
it('renders the page named in the URL on first load')
```

`TestAppProviders` already forwards `routerProps`, and that forwarding is
already covered by `TestAppProviders.spec.tsx` — use it:

```tsx
render(<EmployeesPage />, {
  wrapper: ({ children }) => (
    <TestAppProviders routerProps={{ initialEntries: ['/employees?page=3'] }}>
      {children}
    </TestAppProviders>
  ),
})
```

Assert the third page's rows and `Showing 21–30 of 47`, with no interaction at
all. Under `useState` this test is impossible; that is why it is here.

Add a second `it` alongside it — not more assertions in the same one, since the
two fail for unrelated reasons:

```
it('renders the filter named in the URL on first load')
```

`?q=Grace%20Hopper` renders the filtered result on load **and** the filter field
shows `Grace Hopper`. A deep link with an empty-looking field is the bug this
catches.

### 6. Scenario — a malformed or out-of-range page

```
it('falls back to the first page for a non-numeric page param')
it('shows the empty state for a page past the end')
```

`?page=abc` → first page rows, `Showing 1–10 of 47`, previous-page button
disabled. Without the parse step, `Number('abc')` is `NaN`, which lands in the
query key and the request.

`?page=99` → empty state, no table. This is the first time the empty branch is
reachable from user input rather than only from a stubbed response, which is why
it is worth its own scenario. Assert the URL still reads `?page=99` — the app
must not have rewritten it.

### 7. Scenario — changing the filter resets page in one update

```
it('drops the page param when the filter changes')
```

The one that catches the batching bug. Start at page 3 (deep link is fine and
avoids a slow click-through), type a filter, advance past the 300ms debounce.

Assert **both** in the same test, because they fail separately:
- the probe shows `q` set and **no** `page` key,
- the table shows the filtered first page.

Two sequential `setSearchParams` calls make this red: the second call's copy of
the params does not include the first call's change, so one of the two writes is
silently lost. Build one params object and set it once.

**Fake timers: use the helper, not the raw pattern.**

```ts
import { setupFakeTimerUser } from '@/testsConfig/fakeTimers'

const user = setupFakeTimerUser()
await user.type(filterField, 'grace hopper')
await act(async () => { await vi.advanceTimersByTimeAsync(300) })
```

Do **not** hand-roll `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`
here, and ignore the snippet in 005 step 4 — that is the version that hangs.
Under `vi.useFakeTimers()`, every `userEvent` call awaits a faked
`setTimeout(resolve, 0)` inside RTL's `asyncWrapper` that nothing advances, so
the test dies at 5000ms with no stack trace into your test body. This cost most
of a session to diagnose once already. `setupFakeTimerUser()` carries the
workaround and the upstream links; read its JSDoc before touching fake timers.

Cleanup is global — `testsConfig/setup.ts` restores real timers after every
test. Do not add an `afterEach` for it.

Enable fake timers *after* the initial render has settled. Waiting for the first
page under fake timers reintroduces a hang in RTL's first `findBy*` poll.

### 8. Existing tests

003's and 005's page tests should survive unchanged — same rendered output, same
interactions. If one needs editing, stop and explain why before changing it: an
edit here usually means the observable behavior moved, which is out of scope.

`TestAppProviders.spec.tsx` and `api.spec.ts` should not need changes at all.

### 9. Mutation-check every scenario

Break the code, confirm the named test reddens, revert. A mutation that reddens
nothing means the test is wrong.

| Mutation | Must redden |
|---|---|
| Page click updates local state, never the URL | puts the current page in the URL |
| Page 1 written as `page=1` instead of removing the key | puts the current page in the URL |
| Initial params ignored; always start at page 1 | renders the page named in the URL |
| Filter field not initialized from `q` | deep link with `?q=` |
| Parse step drops the non-numeric guard | non-numeric page param |
| Parse step clamps page to the last page | page past the end |
| App rewrites a bad URL to a valid one | page past the end (URL assertion) |
| Filter change sets `q` and `page` in two separate calls | drops the page param when the filter changes |
| Filter change stops resetting page | drops the page param when the filter changes |
| `useDebouncedCallback` delay → 0 | *(see below)* |
| Empty filter writes `q=` instead of deleting the key | drops the page param when the filter changes — extend it: type the filter, advance, then clear the field, advance again, and assert the probe reads `''` with no `q` key |

The debounce-delay mutation has no scenario of its own here — 006 moves an
already-debounced behavior rather than introducing it, and 005 owns the
"does not refetch until typing stops" test. If 005's version of that test
survives this migration, it is your gate; check that it still reddens when the
delay goes to 0. If the migration invalidated it, port it rather than dropping
it, and say so in your report.

## Out of scope

- `nuqs` or any typed-search-param library. Rejected above, with reasons.
- **Back/forward navigation tests.** Driving history at the page seam needs a
  test-only `useNavigate()(-1)` control, and that scaffolding was judged not
  worth it here. Consequence: push-vs-replace is unenforced (see Decisions).
  Implement it correctly anyway; a later task can add the coverage.
- Status filter, sorting, row detail, mutations — later roadmap items.
- Changing `PER_PAGE`, the envelope, or the MSW handler. 005 already taught the
  handler `q`; it needs nothing new here.
- Real `BrowserRouter` in tests. `MemoryRouter` via `TestAppProviders` is the
  seam.
- Touching `src/components/ui/`.

## Done

All four commands pass:

```bash
npm run build && npx vitest run src && npm run lint && npm run scan:dead-code
```

**Note the `src` scope — that is deliberate, do not widen it to
`npm run test:unit`.** The `lab/` directory is a separate diagnostics workstream
included by the `vite.config.ts` glob; specs there are edited interactively and
are expected to fail or time out. A red `lab/` spec is not your regression and
is never yours to fix. Gate on `src` only.

`scan:dead-code` has a known dirty baseline (see the knip item in HANDOFF's
*Open* list). Do not fix it here, and do not let it hide a new unused export of
yours — diff the report against the baseline.
