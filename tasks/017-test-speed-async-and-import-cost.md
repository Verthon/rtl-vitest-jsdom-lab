# 017 — What async and imports cost, and the verdict

Read `AGENTS.md`, `CONVENTIONS.md`, and the *skill pipeline* section of
`HANDOFF.md` first. This is a **lab task**: it extends a measurement instrument,
not a skill. No skill file is written or edited here.

**Depends on 011.** This is the second half of the original 011. It reuses
`lab/test-speed/measure.ts` and `tiers.ts` as 011 shipped them, and appends to
`COSTS.md`. Do not start until 011's gate is green, and do not rebuild the
helper — if `measure.ts` needs a change to serve a probe here, change it and
re-run 011's `measure.spec.ts`, including the noise floor.

**Why this is the second half.** 011's probes are all the same shape: two forms,
one tree, one ratio. The probes here are not. Two of them (7, 11) are asking for
a floor rather than a comparison, and one (11) may not be measurable in-process
at all. That is the whole reason for the split: those outcomes should not be
resolved under time pressure against a helper whose resolution nobody has
measured yet. 011 measured it — use the number.

## The noise floor is binding here

011 established the **noise floor**, the smallest ratio `measure.ts` can
distinguish from noise on the authoring machine, and recorded it in
`COSTS.md`'s header.

**No probe in this task may report a ratio below the noise floor as a
finding.** A probe landing under it is recorded as "too close to call" with an
empty ratio — never as "no difference", never as "slightly slower". Probe 6 in
particular is likely to land there, and reporting "findBy is 1.1x faster" from an instrument that
cannot resolve 1.1x would be exactly the folklore-laundering this workstream
exists to prevent.

If the floor is large enough that several probes here are unresolvable, that
is a finding about the instrument and it goes in `COSTS.md`. Do not tighten the
tolerance to make results appear.

## Scope — decided, not a menu

Same rules as 011, restated because they bind here too:

**Measure, do not prescribe.** No skill authoring, no edits to
`.agents/skills/**`, no edits to `TESTING_PITFALLS.md`.

**Do not change app code to make a number look better.**

**Relative cost, not absolute milliseconds** — with one stated exception below,
for probe 7, which is a floor and cannot be a ratio.

**Every probe runs at all three tiers**, or states why a tier does not apply.
Probes 9 and 10 are plausibly tier-independent (`userEvent` delay is a constant;
one MSW round-trip is one round-trip); if you conclude a probe is
tier-independent, prove it by running it at two tiers and showing the ratio is
under the noise floor, rather than asserting it.

## Layout

```
lab/test-speed/
  async-cost.spec.ts    waitFor / findBy / userEvent / MSW costs
  import-cost.spec.ts   module graph cost
  COSTS.md              appended to — 011 owns the header and the query section
```

Use the JSX/glob decision 011 recorded in `HANDOFF.md`. Do not re-litigate it,
and do not change the glob a second time.

## Async cost — `async-cost.spec.ts`

This is where I expect the real CI time to be, and where the folklore is
thinnest.

6. **`waitFor(() => expect(getByRole(...)))` vs `await findByRole(...)`** for the
   same condition. Both poll; the question is whether the difference is
   meaningful or whether `prefer-find-by` is purely a readability rule. Note
   `MATRIX.md` already pins `prefer-find-by` as lint-enforced, so this is
   measuring *why* the rule exists, not discovering the rule. Expect this to land
   under the noise floor; that is a publishable answer and it makes the lint rule a readability
   rule, which is worth stating.

7. **The polling floor.** Resolve a condition that is already true versus one
   that becomes true after a real tick. Establish what a single `waitFor` costs
   at minimum given default `interval`/`timeout`, and therefore what a spec with
   ten of them costs before any component work happens.

   **This probe breaks the no-absolute-milliseconds rule, deliberately.** A floor
   is not a comparison between two forms; "a `waitFor` on an already-true
   condition costs at least one poll interval" is a claim about a documented
   constant (RTL's default `interval`, 50ms), not about this machine. Assert it
   against RTL's configured interval read from `configure`/`getConfig` rather
   than a hard-coded 50 — then the assertion survives a config change and states
   its own basis. Express the per-suite figure as a multiple of the interval
   ("ten `waitFor`s ≈ 10 intervals ≈ 0.5s at the default"), not as a measured
   millisecond total.

   If you cannot make this assertion non-vacuous — i.e. if it would pass whatever
   the interval were — say so and record the floor as narrative in `COSTS.md`
   without a spec backing it, flagged as unbacked. An unbacked honest row beats a
   green test that proves nothing.

8. **Cost inside the loop.** A `waitFor` whose callback runs a role query,
   versus the same wait on a cheap predicate, at each tier. This is the compound
   case — query cost multiplied by poll count — and if it is as bad as I suspect
   it is the headline row of the whole matrix. It is also the probe where the
   tiers matter most: a query too cheap to notice once may still dominate when
   paid on every poll, so a flat result at `small` says nothing about `huge`.

   Cross-check this against 011's probe 2 rather than measuring it in isolation:
   if the per-poll query cost here is not roughly 011's single-query cost times
   the poll count, one of the two probes is wrong. State the comparison in
   `COSTS.md` either way — a consistency check that passes is evidence the
   instrument is sound.

9. **`userEvent.setup()` default delay.** Type an N-character string with default
   options versus `delay: null`. Multiply by a realistic number of typing tests
   to get the per-suite figure. If this is large it reframes the whole "slow
   integration tests" complaint.

   The per-suite extrapolation is a calculation, not a measurement. Label it as
   such, state the character count and test count it assumes, and derive those
   from this repo's actual specs (`grep` the `user.type` call sites) rather than
   picking round numbers.

10. **MSW round-trip.** One handler resolution through the real MSW stack, as a
    floor on any test that fetches. Use the existing
    `createEmployeesHandlerMocks` seam per `CONVENTIONS.md` — do not stub
    `fetch`.

    Like probe 7 this is a floor, not a ratio. Report it as a multiple of
    something on the same machine — e.g. against 011's cheapest measured query —
    so the number survives a move to a different box.

## Import cost — `import-cost.spec.ts`

11. **Module graph.** Cost of importing the onboarding wizard and its transitive
    graph versus importing a single step component from the same slice. A
    ten-step wizard is the first thing in this repo with a graph big enough for
    the "the page pulls in the world" claim to be testable at all.

    **This is the probe most likely to be unmeasurable, and the task's
    instruction is to let it be.** Vite transform caching makes a second import
    in the same process nearly free, and `import()` of an already-loaded module
    is a map lookup. There are three honest outcomes, in order of preference:

    a. **In-process, sound.** You find a way to measure a genuinely cold import
       and can say why it is cold. Explain the mechanism in `COSTS.md` — a
       reader must be able to check your reasoning, because "I measured a cold
       import" is exactly the claim a warm cache fakes convincingly.

    b. **Out-of-process.** Time two single-file vitest runs, one importing the
       wizard and one importing a leaf, and subtract a baseline run that imports
       nothing. This measures process startup plus transform plus import, so the
       baseline subtraction is load-bearing and the residual is noisy — report
       the spread, not just the median, and if the residual is smaller than the
       run-to-run variance, that is outcome (c). This does not live in a spec;
       it is a script plus a recorded result, and `COSTS.md` says so.

    c. **Declare it unmeasured.** Write the row with an empty ratio and a
       sentence on what defeated the measurement.

    **A fabricated number here is worse than a gap.** Outcome (c) is a
    successful completion of this probe, not a failure of the task.

## The verdict — `COSTS.md`

Both halves exist now, so this task closes the matrix.

1. **`## Score`** — the ranking. What actually dominates a slow page-level spec,
   in order, across all eleven probes from both tasks. Rank by measured
   magnitude, not by how good the advice sounds. If the boring cause dominates
   and the interesting one is noise, the boring one goes first.

2. **`## Notes`** — anything measured that contradicts common belief, across both
   halves. 011 already put `within` here; add this task's surprises.

3. **The question the skill needs answered.** *Given these numbers, is
   "high-level tests are too slow" a real constraint or a misattribution?* If the
   answer is "real under conditions X, Y", name X and Y — that is exactly the
   material the future skill needs, and an honest "partly real" beats a verdict
   picked to suit the skill.

4. **`## For the skill`** — the handoff. The next task writes a skill about test
   altitude, and this section is the only thing it is allowed to cite. Fill this
   table from the measurements, **both halves**:

   | Cost | Measured ratio | Dominates a real suite? | Fix that keeps the altitude |
   |---|---|---|---|

   One row per probe that produced a usable number. The last column is the
   load-bearing one: a cost only belongs in the skill if there is a fix that
   makes the *high-level* test faster. A cost whose only fix is "test the leaf
   instead" is evidence **for** the objection and must be recorded as such —
   that is a finding, not a failure.

   Two hard constraints, both of which exist to stop the skill from laundering
   folklore through a lab:

   - **Only measured rows.** A candidate cause that came back too close to call
     gets a row saying so, with an empty ratio. It does not get a row saying
     "likely significant".
   - **Rank by measured magnitude, not by how good the advice sounds.**

   Do **not** write the skill's recommendations here. This section says what is
   true; the skill task decides what to tell people.

**`tasks/013` reads this section.** HANDOFF's *011 / 012 — the speed objection*
notes that if the objection turns out substantially correct, 013's argument
changes shape. That is a live outcome, not a formality — if the verdict here
undercuts the coming skill, write it that way and say so in `HANDOFF.md`.

## Steps

1. **Re-run 011's gates first** and confirm `measure.spec.ts` still passes and
   the noise floor is still what `COSTS.md` says. If it has drifted on your
   machine, record the new value next to 011's rather than overwriting it — a
   second data point on the instrument's portability is worth having.

2. **Write `async-cost.spec.ts`** (probes 6–10). Do probe 8 after probe 6 and 7,
   since it composes them, and cross-check it against 011's probe 2.

3. **Attempt probe 11**, and take the first honest outcome of (a)/(b)/(c) you
   reach. Do not spend the task on it — it is one row.

4. **Close `COSTS.md`** with `## Score`, `## Notes`, the verdict, and
   `## For the skill`.

5. **Verify.**

   ```bash
   npm run build && npx vitest run && npx oxlint && npm run scan:dead-code
   ```

   Hold the baselines 011 recorded. Report the new vitest count and the new
   full-run wall clock. **Async probes are the ones that can genuinely slow the
   suite** — a polling-floor probe that waits out real intervals costs real
   seconds. If this task adds more than a couple of seconds, say how many,
   justify them, and consider whether the probe can assert the same thing with
   fewer runs.

6. **Update `HANDOFF.md`**: the ranking, the verdict, what was killed, and
   explicitly whether 013's argument survives. Add a row to the evidence table
   for every claim this task settled.

## Gates

- No probe reports a ratio below the noise floor as anything other than "too
  close to call".
- Every row in `COSTS.md` is backed by a named test in `lab/test-speed/`, or is
  explicitly flagged as unbacked narrative (probe 7's floor and probe 11's
  out-of-process variant are the only rows permitted to be unbacked, and each
  must say why).
- Every probe reports at all three tiers, or proves tier-independence by showing
  a cross-tier ratio under the noise floor.
- Probe 7 asserts against RTL's configured interval, not a hard-coded 50ms, or
  is recorded as unbacked.
- Probe 8 is cross-checked against 011's probe 2, and `COSTS.md` states whether
  the two are consistent.
- Probe 9's per-suite figure is labelled a calculation and states the
  character/test counts it assumes, derived from this repo's real specs.
- Probe 11 lands on exactly one of (a) in-process with a stated mechanism,
  (b) out-of-process with reported spread, or (c) declared unmeasured. No number
  appears without one of those three provenances.
- Every ratio assertion is mutation-checked per `HANDOFF.md`: invert the claim,
  confirm the spec reddens, revert.
- No timing assertion is expressed in absolute milliseconds except probe 7's
  floor, which is expressed as a multiple of RTL's configured interval.
- Every row in `## For the skill` traces to a probe that produced a number. A
  row with an empty ratio says "too close to call" and nothing stronger. If the
  section contains a cost the specs did not measure, this task is not done.
- At least one candidate cause across the two tasks is recorded as killed or
  too-close-to-call. If all eleven came back significant, that is more likely a
  broken `measure.ts` than a real result.
- `COSTS.md` answers the speed-objection question in writing, and `HANDOFF.md`
  says whether 013's argument survives it.
- No file under `.agents/skills/` changed. `measure.ts` and `tiers.ts` changed
  only if 011's self-test was re-run and still passes.
