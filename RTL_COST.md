# RTL cost — the short version

What RTL, jest-dom and happy-dom actually cost, measured on this repo's real
components. Every line below traces to a named test in `lab/test-speed/`; the
full write-up with method, tiers and caveats is `lab/test-speed/COSTS.md`.

```bash
npx vitest run lab/test-speed --disable-console-intercept
```

**The instrument's noise floor is 1.1x.** Anything closer to 1.0 than that is
reported as *too close to call*, never as "about the same" and never as
"slightly faster".

## Queries — the ranking

Same target, same tree, ratio against a `getByTestId` lookup of the identical
element. Measured at three tiers (`small` = employees table, `medium` = a form
step, `huge` = the review step).

| Query | Cost vs `getByTestId` | Backed by |
|---|---|---|
| `getByTestId` | 1x (the baseline) | probe 1 |
| `getByRole(role, { name })` | **6–17x** | probe 1 |
| `getByLabelText(label)` | **25–44x** | probe 13 |
| `getByText(text)` | **31–45x** | probe 1 |

`getByLabelText` answers the open question: it is **not** a cheap alternative to
`getByRole`. Against the *same* input it costs 1.35–2.4x the equivalent
`getByRole('textbox', { name })`, landing it next to `getByText` at the
expensive end — RTL resolves labels by collecting every labelling construct in
the container before it can match one.

None of this is an argument for `getByTestId`. The absolute numbers are
microseconds; see *What is actually worth changing* at the bottom.

## Queries — the four findings worth remembering

**Cost tracks matches, not tree size.** Cost per *node* varies 17x across the
tiers; cost per *match* is flat at 8.4–11µs. A big page is not slow to query — a
page with many elements *of the role you asked for* is.

**`within()` is not a performance tool.** 1.35x *slower* at `small`, too close to
call at `medium` and `huge`. It was faster at no tier, including the largest.
Use it to disambiguate, never to speed a test up.

**Repeating a scoped query is the expensive mistake — 6–18x.**

```ts
// 6–18x                                    // the same assertions, 1x
tabs.forEach(...)                           const tabs = screen.getAllByRole('tab')
screen.getByRole('tab', { name: 'Step 1' }) tabs[0] // …
screen.getByRole('tab', { name: 'Step 2' }) tabs[1]
```

Each scoped lookup recomputes accessible names across every match. This is the
one query fix that does not require dropping to a lower-altitude test.

**Adding `{ name }` costs only 1.2–1.3x**, because by then the accessible names
are already being computed. Never drop `{ name }` for speed.

**The first query on a freshly rendered tree costs 9–17x a repeat**, and it does
not decay over eight consecutive fresh renders, so it is per-tree work rather
than JIT warmup. Every ratio above is warm cost; a real spec's first query pays
roughly ten times the per-query numbers.

## Assertions — `toBeVisible` vs `toBeInTheDocument`

`toBeVisible` costs **1.85–2.37x** `toBeInTheDocument`, and that ratio is
meaningless: the difference is **5µs per assertion**, so you would need **~2,250
swaps to save the cost of one render**. jest-dom's `toBeVisible` runs
`toBeInTheDocument`'s root-node check first and then walks every ancestor
calling `getComputedStyle` (~0.56µs per level) — a strict superset, never an
alternative.

They are also not interchangeable: a `display: none` element passes
`toBeInTheDocument` and fails `toBeVisible`. **Default to `toBeVisible`** — it is
the stronger claim and its cost is not a real constraint.

## Async — where the seconds actually are

**`waitFor(() => expect(...))` vs `await findBy…` is too close to call**
(1.03–1.06x at all three tiers). `prefer-find-by` is a readability rule, and now
we can say so.

**Every `waitFor`/`findBy` costs ~1.3ms even when the condition is already
true** — and it is not the 50ms poll interval. RTL's `asyncWrapper` awaits a
`setTimeout(0)` macrotask to drain microtasks; that one forced macrotask is the
entire floor (`waitFor` 1.27ms vs a bare `setTimeout(0)` 1.17ms, the condition
itself 0.007ms). A condition that is *not* yet true does pay the interval — vary
the interval and the floor tracks it.

**A query inside the poll callback costs 1.04–1.22x**, scaling with match count
(1 match: too close to call; 21 matches: 1.22x). Cross-checked against the
single-query cost and consistent to 0.98x, so both probes agree.

**`userEvent.setup()`'s default delay costs 2.36x** vs `delay: null`
(3.1ms vs 1.3ms per character). *Calculation, not a measurement:* this repo's 17
`user.type()` call sites type 133 characters, so ~410ms vs ~174ms — a **~236ms**
saving across the whole suite. Real, but small.

**One MSW round-trip is 0.188ms**, ~11x the cheapest measured role query, and
tier-independent (1.01x across tiers, under the floor).

## Imports — the biggest number in the lab

The first `import()` of the onboarding wizard's transitive graph costs
**2,440ms**; the immediate repeat costs 0.017ms. That is transform plus
evaluation of the whole graph, paid once per process by whichever module gets
there first.

Which is why the wizard-vs-leaf comparison **cannot** be made in-process: in an
earlier revision the *leaf* measured ~3x the wizard, purely because it was
imported first and paid for React, TanStack Query and the shadcn graph the
wizard then found warm. That ratio measures import order, not graph size.

## What is actually worth changing

In measured magnitude order, not in how good the advice sounds:

1. **Module graph / process startup** — thousands of times anything else, and
   not fixable by rewriting queries.
2. **Repeated scoped queries** (6–18x) and **`getByText`/`getByLabelText` where a
   role query would do** (2–7x over `getByRole`).
3. **`userEvent` default delay** (~236ms/suite here) and **`waitFor` count**
   (~1.3ms each, floor).
4. **Nothing else on this page.** `within()`, `findBy` vs `waitFor`, and
   `toBeInTheDocument` vs `toBeVisible` are not speed levers, and two of the
   three are commonly cited as if they were.

The full ranking, the tier caveats, and the verdict on "high-level tests are too
slow" belong to `lab/test-speed/COSTS.md`; its async section is still being
written (`tasks/017`), so async rows above cite spec output directly.
