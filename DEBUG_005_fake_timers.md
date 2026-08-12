# Debug log — 005 fake timers vs `userEvent.type`

Session record of getting `vi.useFakeTimers()` + `userEvent` v14 + React 19 +
`@testing-library/react` to cooperate for the step 4 scenario (`filters the
table by name after the debounce elapses`). Kept for the record — not a
skill, not a fix to ship elsewhere. If this becomes a recurring pitfall,
distill it into `TESTING_PITFALLS.md` separately.

## Symptom

Task-prescribed pattern, straight from `tasks/005-debounced-filter.md`:

```ts
vi.useFakeTimers()
const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

renderPage()
await findRowByName(mockEmployees[0].name)   // <-- hangs here
const filterField = screen.getByRole('textbox', { name: /name/i })
await user.type(filterField, 'Grace Hopper')

await act(async () => {
  await vi.advanceTimersByTimeAsync(300)
})
```

`npx vitest run ... -t "filters the table by name"` → **times out at 5000ms**,
no assertion failure, no stack trace pointing at a line in the test body. Just
gone.

This is exactly the "annoying signal" the task warns about: *"Without
`advanceTimers` this test does not fail — it times out, which is a different
and much more annoying signal."* Except `advanceTimers` was already wired
correctly and it still hung.

## Step 1 — bisect: is it the first `await`, or something after typing?

Added `console.log` after every line:

```ts
vi.useFakeTimers()
console.log('fake timers on')
const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
const filterField = screen.getByRole('textbox', { name: /name/i })
console.log('found field')
await user.type(filterField, 'Grace Hopper')
console.log('typed')
```

Output before the 5s timeout:

```
rendered
found first row
fake timers on
found field
```

So `findRowByName` (the *first* `await`, before any fake-timer interaction
even starts) was fine on real timers. The hang was **inside `user.type()`**,
after fake timers were enabled. Ruled out: `findByRole`'s own `waitFor`
being incompatible with fake timers — it wasn't even under fake timers yet
at that point.

## Step 2 — narrow further: is `renderPage()` + first `findRowByName` safe
under fake timers too, or does moving `vi.useFakeTimers()` earlier break it?

Reordered to enable fake timers *before* the initial render/wait, to match
the literal task snippet:

```ts
vi.useFakeTimers()
const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
renderPage()
await findRowByName(mockEmployees[0].name)   // now under fake timers from the start
```

This **also hung**, immediately, at the first `findRowByName` — worse than
before. Confirms RTL's `findByRole`/`waitFor` polling genuinely needs either
real time to pass or something actively advancing the fake clock; nothing
was doing either between `renderPage()` and the first assertion.

Fix at this layer: wait for the initial page **on real timers**, only flip to
fake timers right before the debounce-relevant interaction:

```ts
renderPage()
await findRowByName(mockEmployees[0].name)   // real timers, fine

vi.useFakeTimers()
const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
const filterField = screen.getByRole('textbox', { name: /name/i })
await user.type(filterField, 'Grace Hopper')  // still hangs, see step 3
```

This fixed the *first* hang but not the real one — `user.type` itself still
hung.

## Step 3 — isolate `user.type` vs `fireEvent.change`

Swapped the interaction to rule out whether the problem was "any typing
under fake timers" or specific to `userEvent`'s internals:

```ts
fireEvent.change(filterField, { target: { value: 'Grace Hopper' } })
```

This **worked instantly** (62ms) and produced a clean, correctly-reasoned
red failure — 10 rows instead of 1, because the filter wasn't wired up yet:

```
AssertionError: expected [ <tr …>, …(9) ] to have a length of 1 but got 10
```

This was the useful checkpoint: proof the React/query/MSW plumbing was fine
under fake timers. The hang was specifically `userEvent.type()`'s internal
machinery, not fake timers in general, not `act`, not MSW.

## Step 4 — read `user-event` v14 source for what `type()` awaits internally

`node_modules/@testing-library/user-event/dist/cjs/utils/misc/wait.js`:

```js
function wait(config) {
    const delay = config.delay;
    if (typeof delay !== 'number') {
        return;                          // <-- skip everything if delay isn't a number
    }
    return Promise.all([
        new Promise((resolve)=>globalThis.setTimeout(()=>resolve(), delay)),
        config.advanceTimers(delay)
    ]);
}
```

Default `delay: 0` (from `setup.js`). Hypothesis: passing `delay: null`
should skip this path for every keystroke (`typeof null !== 'number'` is
`true`), removing the dependency on `advanceTimers` entirely for this call
site.

```ts
const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime })
```

**Still hung.** So `wait()` wasn't the (only) culprit either. Also tried
wrapping `advanceTimers` in the async variant in case the sync
`vi.advanceTimersByTime` return value (a number, not a promise) confused an
`await` somewhere:

```ts
const user = userEvent.setup({ delay: null, advanceTimers: (ms) => vi.advanceTimersByTimeAsync(ms) })
```

Still hung, same place. Both dead ends.

## Step 5 — is this a React 19 scheduler / `MessageChannel` problem?

Known class of bug: React's scheduler falls back to `setTimeout` when
`MessageChannel` isn't available, and if `vi.useFakeTimers()` fakes
`setTimeout` globally, React's own flushing can deadlock. Checked whether
`happy-dom` (this project's test environment, not `jsdom` despite the repo
name) provides `MessageChannel`:

```js
const { Window } = require('happy-dom')
const w = new Window()
console.log('MessageChannel' in w, typeof w.MessageChannel)
// false undefined
```

Looked damning — but this tested a **bare `happy-dom` `Window` instance**,
not vitest's actual test globals. Re-checked inside a real test:

```ts
console.log('MessageChannel' in globalThis, typeof globalThis.MessageChannel)
// true function
```

`MessageChannel` **is** present in the real environment (it's Node's own
global, exposed through vitest's happy-dom setup). Dead end — the standalone
`happy-dom` probe was misleading because it wasn't the environment the test
actually runs in.

## Step 6 — read `user-event`'s `wrapAsync`, find the real gate

Every `user-event` interaction goes through `wrapAsync`:

```js
// setup/wrapAsync.js
function wrapAsync(implementation) {
    return dom.getConfig().asyncWrapper(implementation)
}
```

`@testing-library/react` overrides `asyncWrapper` globally at import time
(`dist/pure.js`):

```js
(0, _dom.configure)({
  asyncWrapper: async cb => {
    const previousActEnvironment = getIsReactActEnvironment()
    setReactActEnvironment(false)
    try {
      const result = await cb()
      // Drain microtask queue.
      // Otherwise we'll restore the previous act() environment, before we
      // resolve the `waitFor` call.
      await new Promise(resolve => {
        setTimeout(() => { resolve() }, 0)
        if (jestFakeTimersAreEnabled()) {
          jest.advanceTimersByTime(0)
        }
      })
      return result
    }
    ...
```

And:

```js
function jestFakeTimersAreEnabled() {
  if (typeof jest !== 'undefined' && jest !== null) {
    return (
      setTimeout._isMockFunction === true ||
      Object.prototype.hasOwnProperty.call(setTimeout, 'clock')
    )
  }
  return false
}
```

**Found it.** Every `user.type()` call is wrapped in this `asyncWrapper`,
which does its own internal `setTimeout(resolve, 0)` to drain the microtask
queue — and only pumps that timer forward if `jestFakeTimersAreEnabled()`
returns `true`. That function gates on `typeof jest !== 'undefined'` —
**Jest-specific detection that vitest doesn't satisfy.** Vitest never
defines a global `jest`. So under vitest's fake timers, this internal
`setTimeout(resolve, 0)` is scheduled on the faked clock and nothing ever
advances it — `asyncWrapper` awaits a promise that can never resolve on its
own. Every call to `user.type()` (and `user.click()`, etc.) hangs forever
under `vi.useFakeTimers()`, independent of `delay`, `advanceTimers`, or
anything test-code-level. It's a Jest/RTL coupling gap that vitest projects
have to work around manually.

## Fix

Stub a minimal `jest` global for the duration of the fake-timer test, scoped
and cleaned up:

```ts
function setupFakeTimerUser() {
  vi.useFakeTimers()
  Object.assign(globalThis, { jest: { advanceTimersByTime: vi.advanceTimersByTime } })
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
}
```

```ts
afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(globalThis, 'jest')
})
```

With this in place, the original task-prescribed pattern (no `delay: null`
needed, no async-wrapped `advanceTimers` needed — those were both dead ends,
not part of the fix) works:

```ts
renderPage()
await findRowByName(mockEmployees[0].name)   // real timers

const user = setupFakeTimerUser()
const filterField = screen.getByRole('textbox', { name: /name/i })
await user.type(filterField, 'grace hopper')

await act(async () => {
  await vi.advanceTimersByTimeAsync(300)
})

await findRowByName('Grace Hopper')
expect(dataRows()).toHaveLength(1)
```

One more wrinkle surfaced here: after `advanceTimersByTimeAsync(300)`
resolves, `dataRows()` still showed 10 rows immediately — the response had
resolved (confirmed via an MSW `request:start` listener logging the correct
`q=Grace+Hopper` request) but the DOM hadn't re-rendered yet. Needed one more
real assertion-driven wait (`await findRowByName('Grace Hopper')`, an RTL
`findBy*` — which now self-pumps correctly thanks to the `jest` shim) between
the timer advance and the row-count assertion. `act(advanceTimersByTimeAsync)`
flushes the timer callback and the resulting state update, but not
necessarily the full re-render in time for a synchronous assertion right
after — `findRowByName` closes that last gap.

## What didn't work (kept so it isn't retried)

| Attempt | Result |
|---|---|
| `userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime })` | Still hangs — `wait()` was never the blocking call |
| `advanceTimers: (ms) => vi.advanceTimersByTimeAsync(ms)` (async variant) | Still hangs, same spot |
| `vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })` | Wrong axis — our own debounce also needs `setTimeout` faked, so narrowing the fake set doesn't decouple anything |
| Polyfilling/checking `MessageChannel` | Red herring — it was already present in the real vitest environment; the standalone `happy-dom` `Window()` probe that suggested otherwise wasn't representative |
| Enabling fake timers before the initial page load/`findRowByName` | Reintroduces the *first* hang (RTL's initial `waitFor` polling has nothing advancing the clock yet) |

## Root cause, one sentence

`@testing-library/react`'s `asyncWrapper` (which every `userEvent` call goes
through) only self-advances fake timers when it detects Jest's global `jest`
object; Vitest never defines one, so under `vi.useFakeTimers()` every
`userEvent` interaction hangs unless the test manually stubs a
`globalThis.jest.advanceTimersByTime`.

## Mutation checks run during/after this (for the record)

All confirmed to redden the intended test, then reverted:

| Mutation | Reddened |
|---|---|
| Debounce delay `300` → `0` | `does not refetch until typing stops` |
| `q` dropped from query key | `filters the table by name...` |
| `q` dropped from `apiGet` params | `filters the table by name...` |
| Input bound to `debouncedQuery` instead of `rawQuery` | `shows what the user typed...` |
| Page reset removed from `onChange` | `returns to the first page...` |
| Handler slices before filtering | `returns to the first page...` (via corrupted `total`, not the intended mechanism — see note below) |
| Handler match made case-sensitive (`employee.name.includes(q)`) | `filters the table by name...` (after changing that test's input to `'grace hopper'`, a mixed-case variant of the exact-case fixture value, so the mutation is caught directly rather than incidentally) |

Note on the slice-before-filter mutation: it happened to also break
`total` for the *unfiltered* case (`sliced.length` instead of
`mockEmployees.length`), so it reddened `returns to the first page` for a
side-effect reason as much as the intended one. Didn't chase a more
surgical mutation for it — the task's own step 1 already names this as the
thing step 6's test protects against, and the revert-and-confirm-green step
covered the intended shape correctly either way.
