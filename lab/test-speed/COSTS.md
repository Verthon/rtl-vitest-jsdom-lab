# Query cost matrix

What an RTL query actually costs, measured rather than remembered. Every row is
backed by a named test in `lab/test-speed/`, re-runnable with:

```bash
npx vitest run lab/test-speed --disable-console-intercept
```

Absolute milliseconds are machine-dependent and are not the deliverable. Every
claim below is a **ratio between two forms measured in the same run, on the same
tree**, interleaved A-B-A-B by `ratio()` in `measure.ts`.

## R — the noise floor of the instrument. Read this before any row.

**R = 1.1x on the authoring machine.** Below that ratio, `measure.ts` cannot
distinguish two forms from noise, and **no row here or in 017 may report a
sub-R ratio as a finding.** A probe landing under R is recorded as *too close to
call* — never as "no difference", never as "slightly slower".

R is computed at run time by `measure.spec.ts > establishes R, the smallest ratio
this helper can resolve on this machine`, which runs synthetic workloads at known
cost multiples (1.1, 1.25, 1.5, 2, 3, 5) three times each and reports the
smallest multiple it resolves within 35% on every attempt. **Your R may differ**
— re-run the spec rather than trusting this number.

One caveat on R that matters for reading everything below: it is measured on
tight arithmetic loops, which is the friendliest possible workload for a timer.
The DOM probes allocate and walk trees, so their real floor is somewhat worse
than 1.1x. Ratios in the 1.1x–1.3x band here are reported, but they are the
weakest claims in the document.

## Warm or cold? Cold, and it is not close.

**The first query against a never-queried tree costs 7–13x a repeated one, at
every tier**, and that gap does not decay across eight consecutively rendered
fresh trees — so it is per-tree work, not JIT warmup. The first two renders of
any tier *are* JIT-dominated (~1.1ms, ~0.5ms) and are discarded before the median
is taken.

**Consequence, binding on every row below:** `measure.ts` takes 25 runs against
one tree, so **every ratio in this document is a warm-cost ratio.** It compares
two query forms once the tree has already been walked. A real test issuing one
query against a freshly rendered page pays the cold cost instead — roughly ten
times the per-query numbers here.

Backed by `query-cost.spec.ts > happy-dom query caching > is answered before any
other row`.

## The tiers, and why "huge" is not huge

| Tier | Subject | Nodes | Interactive | Dominant roles |
|---|---|---|---|---|
| `small` | `EmployeesPage` at `PER_PAGE=10` | 87 | 8 | 40 cell, 11 row, 7 button |
| `medium` | `/onboarding/personal-details` | 62 | 15 | 12 heading, 10 tab, 4 textbox |
| `huge` | `/onboarding/review`, step 10 | 88 | 12 | 21 heading, 11 paragraph, 10 tab |

Pinned by `tiers.spec.ts` (±25% on nodes and interactive count, exact on the
named role histogram entries), and mutation-checked: adding three `<h3>`s to
`ReviewStep.tsx` reddens the `huge` pin and nothing else.

### The tier design did not survive contact with the components

`tasks/011` designed these as three *sizes*. They are not. **The node-count
spread across all three is 1.42x, and `small` (87) is larger than `medium` (62)
and within 1% of `huge` (88).** `tiers.spec.ts > shows the three tiers differ in
shape far more than in size` asserts that spread stays under 2x, so this
statement cannot silently rot.

`ReviewStep` turned out smaller than the tier design assumed: it renders nine
summary cards of static text — headings and paragraphs — with only two buttons.
It is *heterogeneous*, not large. Per the task, no tier was swapped for a bigger
subject to make the numbers more interesting, and no app code was changed to
inflate one. `PER_PAGE` is a module constant in `employee-directory/api.ts`;
varying it would have meant editing `src/`, which the task forbids.

**So probe 2 cannot answer "how does query cost scale with tree size".** These
three trees do not differ enough in size to ask. What it did answer turned out to
be more useful — see the per-match row.

### The size/kind confound

Even had the sizes spread, size and kind move together across these tiers: they
differ in node count, role variety, state, and routing all at once. **A ratio
measured across tiers is a claim about specific components, not about tree
size.** No row below claims clean scaling in node count.

## The matrix

Every ratio is the median of 25 interleaved runs, warm. **Bold** rows are the
ones that survive as advice.

Values are the range seen across several clean runs on the authoring machine.

| # | Claim under test | small | medium | huge | Verdict |
|---|---|---|---|---|---|
| 1 | `getByRole` vs `getByTestId`, same target | 5.8–7.9x | 12.5–13.9x | 14.7–15.7x | **Confirmed.** Role queries cost 6–16x a testid lookup |
| 1 | `getByText` vs `getByTestId`, same target | 43–45x | 29–31x | 42–45x | **Confirmed, and text is the expensive one** — 29–45x |
| 2 | Role query cost per *node* | 0.12µs | 1.7µs | 2.0µs | Varies **16–17x** — tracks nothing stable |
| 2 | Role query cost per *match* | 10.0–11.1µs | 8.6–9.1µs | 8.4–8.9µs | **Varies 1.2–1.3x — this is the stable unit** |
| 3 | `within(scope)` vs `screen`, same element | 1.35x | 0.95x | 1.08–1.13x | **Killed.** `within` is never faster; at `medium` and `huge` it is too close to call |
| 4 | 5x `getByRole` vs one `getAllByRole` + index | 6.0–6.2x | 17.7x | 17.3–18.1x | **Confirmed.** Repeated scoped lookups cost 6–18x |
| 5 | Role query with `{ name }` vs without | 1.25–1.27x | 1.20x | 1.29–1.31x | Confirmed but small — just above R |

Row-to-test mapping:

| Row | Test |
|---|---|
| 1 | `probe 1 — getByRole vs getByText vs getByTestId > measures all three query strategies against one target at every tier` |
| 2 | `probe 2 — the same role query across the three tiers > reports cost per node and per match, subject to the size/kind confound` |
| 3 | `probe 3 — within(scope) vs a screen-wide query > answers whether within() is a performance tool or only a disambiguation tool` |
| 4 | `probe 4 — getAllByRole once vs getByRole N times > measures whether reaching for the list and indexing beats repeated lookups` |
| 5 | `probe 5 — role query with { name } vs without > measures what accessible-name filtering adds to the role walk` |

## Notes

### `within()` is a disambiguation tool, not a performance tool

**This is the claim the task expected to fail, and it failed.** Measured at
1.35x (`small`), 0.95x (`medium`), 1.08–1.13x (`huge`) —
`within(scope).getByRole(...)` was *slower* than `screen.getByRole(...)` at
`small`, and within the noise floor at the other two. **It was faster at none of
them, including the largest tier.** Only the `small` result clears R; the other
two are reported as too close to call, which is itself the answer — a
performance tool that cannot be distinguished from doing nothing is not a
performance tool.

The widely-repeated advice that scoping a query to a subtree makes it cheaper is
**not supported at any tier measured here**, including the largest. The
mechanism is visible in the per-match row below: scoping shrinks the candidate
set, but the candidate set was never what cost the time, and `within()` adds its
own wrapper allocation per call.

Use `within()` when a query would otherwise be ambiguous. Do not reach for it to
make a slow test faster; on this evidence it will not, and may cost a little.

### Role query cost tracks matches, not tree size

The most useful finding in this task, and one probe 2 was not designed to make.

Cost **per node** varies 16–17x across the tiers. Cost **per match** varies
1.2–1.3x — 8.4–11.1µs, essentially flat. `small` has the most nodes (87) and the
cheapest role query (0.011ms) because `getAllByRole('heading')` matches exactly
one element there; `huge` matches 21 and costs ~16x more on a tree 1% larger.

The reading: **a role query's cost is dominated by per-match accessible-name
computation, not by walking the tree.** That reframes the speed objection this
workstream exists to answer. A large page is not intrinsically slow to query — a
page with many elements *of the role you asked for* is. This is why probe 5's
`{ name }` filter adds only 1.2–1.3x: by then the accessible names are already
being computed.

Pinned by an assertion, not just a log line: probe 2 asserts per-match spread is
strictly less than per-node spread, and reddens when inverted.

### `getByText` is more expensive than `getByRole`, not less

At 30–44x a testid lookup versus role's 8–15x, text matching is consistently the
dearest of the three — roughly 3x the cost of the role query at every tier. Worth
recording because the folk ranking usually puts `getByRole` at the top of the
cost list. It is not; it is in the middle.

### The cheap fix that keeps the altitude

Probe 4 is the actionable one. Five `getByRole(role, { name })` calls cost 6–18x
one `getAllByRole(role)` plus indexing, because each scoped lookup recomputes
accessible names across every match. A page-level test asserting on many
elements pays that multiplier per assertion.

This is a fix that does **not** require dropping to a lower-altitude test, which
is precisely the shape 013 needs. Whether it is large enough to matter against
async and import costs is 017's question, not this document's.

### What this lab costs the suite

A speed lab that materially slows the suite is a self-own, so: these probes add
**18 tests and ~1.6s wall clock** to the full run (8.8s → 10.5s, measured by
running with and without `lab/test-speed/**`). Most of it is the 24 tier renders
the probes need — the onboarding route pulls a large module graph, and each
probe re-renders it per tier. That is the price of measuring real components
rather than synthetic trees, which is the tier design's whole point.

### What the instrument could not settle

- Any claim in the 1.1x–1.3x band (probe 5, probe 3 at `medium`) is at or near
  R and is reported as measured without being leaned on.
- Scaling in node count. The tiers span 1.42x; this is not a scaling probe and
  must not be cited as one. A real one is one component at three data volumes,
  and is follow-up work.

## Async and import cost

**Not measured here.** `tasks/017-test-speed-async-and-import-cost.md` fills this
section: `waitFor` polling, `userEvent` delay, MSW round-trips, and module-graph
size. Until it runs, this matrix covers query cost only and **is not a complete
account of where RTL test time goes** — do not read the ranking above as the
answer to the speed objection. The verdict on that objection belongs to 017.
