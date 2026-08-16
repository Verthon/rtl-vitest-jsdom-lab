# 011 — Where RTL test time actually goes

Read `AGENTS.md`, `CONVENTIONS.md`, and the *skill pipeline* section of
`HANDOFF.md` first. This is a **lab task**: it builds a measurement instrument,
not a skill. No skill file is written or edited here.

**Depends on 012.** The `medium` and `huge` tiers are the onboarding slice that
task ships. Do not start 011 by building synthetic stand-ins for them — the whole
reason the tiers are real components is that synthetic ones measure the wrong
thing.

## Why this exists

A skill is coming that argues against testing leaf components in isolation when
the page-level test is the one that covers the user journey. The standing
objection to that skill — the one people actually make in review — is:

> High-level tests are slow. They time out on CI. That is why we test the leaf.

That objection is partly true, and a skill that answers it with "write
higher-level tests anyway" loses the argument. To win it the skill has to say
*which* part of a high-level test costs the time, and hand back a fix that keeps
the altitude. Right now nobody in this repo — me included — knows the real
ranking of those costs. The candidate causes are all folklore:

- `getByRole` computing accessibility roles over a large tree.
- Role queries **inside** a `waitFor` poll loop, i.e. paying that cost N times.
- `waitFor`'s polling interval and timeout defaults dominating wall clock.
- Module-graph size at import: the page pulls in the world, the leaf pulls in
  one file.
- MSW handler round-trips resolving on real macrotasks.
- `userEvent`'s default `delay` between keystrokes.
- `within()` scoping — widely claimed to be a performance tool.

**The `within()` claim is the one I most expect to be false**, and it is stated
as fact in the conversation that spawned this task. If it is false, the skill
must not repeat it; if it is true, the skill gets a concrete recommendation. The
lab decides, not the essay.

This task produces the numbers. A later task writes the skill against them.

## Scope — decided, not a menu

**Measure, do not prescribe.** The deliverable is a matrix of measured costs and
a `COSTS.md` that reads like `lab/assertion-precision/MATRIX.md`: every row
backed by a test that can be re-run. No skill authoring, no edits to
`.agents/skills/**`, no edits to `TESTING_PITFALLS.md`.

**Do not change app code to make a number look better.** If `EmployeesPage` is
slow to import, that is a finding, not a refactor invitation.

**Relative cost, not absolute milliseconds.** Absolute numbers are
machine-dependent and will rot. Every claim must be expressed as a ratio between
two forms measured in the same run, on the same tree — the same discipline
`assertion-precision.spec.ts` uses by running both forms against one value. A
row asserting `"role query is ~40x a testid query"` is durable; a row asserting
`"role query takes 12ms"` is noise.

**Assertions must be loose enough to survive a slow CI box and tight enough to
falsify the claim.** A ratio assertion with a generous floor
(`expect(ratio).toBeGreaterThan(5)` for a claimed 40x) is the shape. Any test
that would go red on a loaded machine is a broken test, and any test that would
stay green if the claim were false is worse — it is `TEST_THAT_CANNOT_FAIL`
inside the lab that exists to detect it.

## Layout

```
lab/test-speed/
  measure.ts            timing helper — the failureOf() of this workstream
  tiers.ts              renders each tier's real subject; reports nodes + roles
  tiers.spec.ts         pins the tiers against drift
  query-cost.spec.ts    query strategy costs
  async-cost.spec.ts    waitFor / findBy / userEvent costs
  import-cost.spec.ts   module graph cost
  COSTS.md              the matrix
```

`.spec.ts` here is correct and intended — unlike `lab/eval/`, these files *are*
meant to run. They are in the vitest include glob already (`lab/**/*.spec.ts`).
Note the glob is `.ts`, not `.tsx`: if a probe needs JSX, either write the tree
with `React.createElement` or extend the glob deliberately and say so in the
handoff. Do not silently rename the glob.

`tsconfig.lab.json` includes all of `lab` and `npm run build` runs `tsc -b`, so
everything here must typecheck.

## The three tiers

**Every probe in this task runs at all three tiers.** Not just the scaling probe.
If probe 1 runs on a small tree and probe 8 on a large one, their ratios are not
comparable and the ranking table in `## For the skill` is measuring nothing.
Report every ratio per tier.

**The tiers are real components from `src/`, not synthetic trees.** This is
design B, chosen deliberately over a single component family rendered at three
sizes. A synthetic table of N identical rows is one repeated role pattern with no
state; it would measure tree size and nothing else, while real page-test
slowness comes from role variety, state, and routing. 012 ships the subject.

| Tier | Subject | Why |
|---|---|---|
| `small` | `EmployeesPage` at `PER_PAGE` | this repo's existing page — 4 text cells a row, one input, a few pagination links |
| `medium` | `/onboarding` 3-step subset route (012) | a real multi-step form, modest role variety |
| `huge` | `/onboarding` full 10-step wizard, measured on **step 10** (012) | the review step renders a summary of all nine prior steps: genuinely large *and* heterogeneous at once |

### The confound, stated up front

Because size and kind move together across these tiers, **a ratio measured across
them is a claim about specific components, not about tree size.** If a role query
is 30x slower at `huge` than at `small`, the honest reading is "role queries are
slower on the onboarding review step than on the employees table" — with more
nodes, more distinct roles, more state, and routing all changing at once.

`COSTS.md` must say this in the scaling row rather than implying clean scaling,
and probe 2 must not be written up as "role query cost is super-linear in nodes"
on this evidence. Do **not** try to fix the confound by making the tiers more
similar — that would discard the realism the tier design exists to buy. If a
clean size-only scaling number is wanted later, it is a separate probe against
one component at three data volumes, and a follow-up task.

`huge` is the realistic worst case a team plausibly ships, not "big enough to
make role queries hurt". **If role queries turn out to be fine even at `huge`,
that is the headline finding** — do not reach for a bigger subject until the
query looks slow.

### Pinning them

Tiers are characterised by node count **and** interactive-element density, both
recorded in `COSTS.md`. Node count alone is not enough here: two trees of equal
size and different role variety will not measure the same, and variety is
precisely what separates these tiers.

`tiers.spec.ts` renders each tier's subject, reports its actual node count and
role histogram, and asserts both land within a band (±25% on nodes is ample).
This is the same drift detection 009 applies to fixture line numbers — a tier
whose subject silently changed shape invalidates every row in `COSTS.md`, and
this spec makes that failure loud. Mutation-check it: change a step's markup,
confirm the spec reddens, revert.

012 is required to keep render deterministic for exactly this reason. If a tier
cannot be pinned to a stable node count, stop and fix that before measuring
anything.

## The measurement helper

`measure.ts` is where this task earns "mechanical". Timing code is the easiest
place in the repo to produce a confident wrong number, so it carries the
discipline:

- Take `{ warmup, runs }`, discard warmup iterations, return **median**, not
  mean. One GC pause in a mean makes a 2x difference vanish or appear.
- Use `performance.now()`.
- Return the raw sample array alongside the median so a spec can assert on
  spread if it needs to.
- Provide a `ratio(a, b)` that measures both forms **interleaved** — A, B, A, B —
  rather than all-A-then-all-B. Sequential batching lets JIT warmup and heap
  growth land entirely on one side and is the single most common way this kind
  of benchmark lies.
- Never use fake timers here. `src/testsConfig/fakeTimers.ts` and
  `DEBUG_005_fake_timers.md` document that fake timers hang RTL's `asyncWrapper`;
  they would also destroy the thing being measured.

## What to measure

Each item below is a claim to confirm or kill. Write the probe so that **either
outcome is publishable** — a killed claim is the most valuable output this task
can produce, because it stops the skill from shipping folklore.

### Query cost — `query-cost.spec.ts`

`tiers.ts` renders each tier's real subject through `TestAppProviders`, per
`CONVENTIONS.md`. All five probes run at all three tiers. Targets must exist in
every tier — pick a role/text/testid target present in all three, or the ratio is
not comparable across them.

Note this makes the probes `.tsx`-adjacent: the vitest glob is `lab/**/*.spec.ts`.
Extend it to `.spec.{ts,tsx}` deliberately and record the change in the handoff,
or keep the JSX confined to `tiers.ts` behind a plain-`.ts` API. Either is fine;
doing it silently is not.

1. **`getByRole` vs `getByText` vs `getByTestId`** on the same target. The claim
   under test is that role queries are the expensive ones.
2. **Scaling across the tiers.** The same role query at `small` → `medium` →
   `huge`, reported as cost per node. Flat cost-per-node means growth tracks size;
   rising cost-per-node means something beyond size is being paid for. **Write
   this row up subject to the confound above** — the tiers differ in kind as well
   as size, so this probe cannot attribute the growth to node count alone. It
   answers "does querying a real large page hurt", which is the question the
   skill needs, and not "how does role query cost scale with N", which it is not
   equipped to answer.
3. **`within(row).getByRole(...)` vs `screen.getByRole(...)`** for the same
   element. **This is the claim I expect to fail.** Report the measured ratio at
   each tier whichever way it lands, and state plainly in `COSTS.md` whether
   `within` is a performance tool or purely a disambiguation tool. If it only
   pays at `huge`, say that — a fix that does nothing at realistic sizes is not
   advice worth shipping.
4. **`getAllByRole` once vs `getByRole` N times.** Whether reaching for the list
   and indexing beats repeated scoped lookups.
5. **Role query with `{ name }` vs without.** Name filtering computes accessible
   names; whether that is a meaningful add-on to the role walk.

Whether happy-dom caches any of this between queries is itself worth knowing —
if a repeated identical query is dramatically cheaper the second time, the
per-query cost model is wrong and the matrix must say so.

### Async cost — `async-cost.spec.ts`

This is where I expect the real CI time to be, and where the folklore is
thinnest.

6. **`waitFor(() => expect(getByRole(...)))` vs `await findByRole(...)`** for the
   same condition. Both poll; the question is whether the difference is
   meaningful or whether `prefer-find-by` is purely a readability rule. Note
   `MATRIX.md` already pins `prefer-find-by` as lint-enforced, so this is
   measuring *why* the rule exists, not discovering the rule.
7. **The polling floor.** Resolve a condition that is already true versus one
   that becomes true after a real tick. Establish what a single `waitFor` costs
   at minimum given default `interval`/`timeout`, and therefore what a spec with
   ten of them costs before any component work happens.
8. **Cost inside the loop.** A `waitFor` whose callback runs a role query,
   versus the same wait on a cheap predicate, at each tier. This is the compound
   case — query cost multiplied by poll count — and if it is as bad as I suspect
   it is the headline row of the whole matrix. It is also the probe where the
   tiers matter most: a query too cheap to notice once may still dominate when
   paid on every poll, so a flat result at `small` says nothing about `huge`.
9. **`userEvent.setup()` default delay.** Type an N-character string with default
   options versus `delay: null`. Multiply by a realistic number of typing tests
   to get the per-suite figure. If this is large it reframes the whole "slow
   integration tests" complaint.
10. **MSW round-trip.** One handler resolution through the real MSW stack, as a
    floor on any test that fetches. Use the existing
    `createEmployeesHandlerMocks` seam per `CONVENTIONS.md` — do not stub
    `fetch`.

### Import cost — `import-cost.spec.ts`

11. **Module graph.** Cost of importing the onboarding wizard and its transitive
    graph versus importing a single step component from the same slice. 012 makes
    this probe worth running: a ten-step wizard is the first thing in this repo
    with a graph big enough for the "the page pulls in the world" claim to be
    testable at all. Vite transform caching
    makes this the hardest honest measurement in the task: a second import in the
    same process is nearly free. If you cannot measure it soundly in-process,
    **say so in `COSTS.md` and measure it out-of-process** by timing two
    single-file vitest runs, or declare it unmeasured. A fabricated number here
    is worse than a gap.

## Steps

1. **Write `measure.ts` and `buildTree.ts` first, and prove the helper works
   before trusting it.** Gate: a self-test in one of the specs asserting that
   `ratio()` on two forms with a *known* cost difference (e.g. a loop of 1 vs a
   loop of 1000) reports a ratio in the expected direction and rough magnitude.
   A timing helper that has never been shown to detect a difference is not
   evidence — same standard `HANDOFF.md` sets for drift detectors.

2. **Write the three spec files.** Each probe asserts its claim as a ratio with a
   generous but non-vacuous bound, and each carries the measured value where a
   reader can see it — this repo's precedent is that a lab spec is documentation,
   not just a gate.

3. **Write `COSTS.md`.** Same shape as `MATRIX.md`: a table, every row traceable
   to a test, plus a `## Score` section stating the ranking — what actually
   dominates a slow page-level spec, in order. Then a `## Notes` section for
   anything measured that contradicts common belief. **`within` goes in Notes
   whichever way it lands.**

4. **Answer the question the skill needs answered.** Close `COSTS.md` with a
   short section: *given these numbers, is "high-level tests are too slow" a real
   constraint or a misattribution?* If the answer is "real under conditions X, Y",
   name X and Y — that is exactly the material the future skill needs, and an
   honest "partly real" beats a verdict picked to suit the skill.

5. **Record the handoff to the skill — as findings, not as recommendations.**
   Close `COSTS.md` with a `## For the skill` section. The next task writes a
   skill about test altitude, and this section is the only thing it is allowed to
   cite. Fill this table from the measurements:

   | Cost | Measured ratio | Dominates a real suite? | Fix that keeps the altitude |
   |---|---|---|---|

   One row per probe that produced a usable number. The last column is the
   load-bearing one: a cost only belongs in the skill if there is a fix that
   makes the *high-level* test faster. A cost whose only fix is "test the leaf
   instead" is evidence **for** the objection and must be recorded as such —
   that is a finding, not a failure.

   Two hard constraints on this section, both of which exist to stop the skill
   from laundering folklore through a lab:

   - **Only measured rows.** A candidate cause from the list at the top of this
     task that came back too close to call gets a row saying so, with an empty
     ratio. It does not get a row saying "likely significant".
   - **Rank by measured magnitude, not by how good the advice sounds.** If the
     boring cause dominates and the interesting one is noise, the boring one goes
     first.

   Do **not** write the skill's recommendations here. This section says what is
   true; the skill task decides what to tell people.

6. **Verify.** This is a lab task; `lab/` is the deliverable, so gate on the full
   run.

   ```bash
   npm run build && npx vitest run && npx oxlint && npm run scan:dead-code
   ```

   Baselines to hold: oxlint at its 8-warning baseline plus nothing new, knip
   unchanged at 1 file / 13 exports / 1 type. Vitest grows; report the new count
   and the new wall-clock for the full run — a speed lab that materially slows
   the suite is a self-own, so if these probes add real seconds, say how many and
   justify them.

7. **Update `HANDOFF.md`**: what was measured, what was killed, and what the
   ranking is. Add a row to the evidence table for every claim this task
   settled — including the ones it settled *against* the coming skill.

## Gates

- Every row in `COSTS.md` is backed by a named test in `lab/test-speed/`.
- Every probe reports at all three tiers, or states why a tier does not apply to
  it. A ratio measured at one tier and presented as the cost is a defect.
- `tiers.spec.ts` pins each tier's node count *and* role histogram within their
  bands, and is mutation-checked.
- `COSTS.md` states the size/kind confound explicitly, and no row claims clean
  scaling in node count on this evidence.
- No tier was swapped for a bigger subject to make a result look more
  interesting. If the tier subjects changed during the task, `COSTS.md` says so
  and says why.
- `measure.ts` has a self-test proving it detects a known difference.
- Every ratio assertion is mutation-checked per `HANDOFF.md`: invert the claim,
  confirm the spec reddens, revert. An assertion that stays green with the claim
  reversed is not measuring anything.
- No timing assertion is expressed in absolute milliseconds.
- The `within()` claim is answered explicitly, in writing, in `COSTS.md`.
- Every row in `## For the skill` traces to a probe that produced a number. A
  row with an empty ratio says "too close to call" and nothing stronger. If the
  section contains a cost the specs did not measure, this task is not done.
- At least one candidate cause from the list at the top of this task is recorded
  as killed or too-close-to-call. If all seven came back significant, that is
  more likely a broken `measure.ts` than a real result — re-check the helper's
  self-test before believing it.
- No file under `.agents/skills/` changed.
