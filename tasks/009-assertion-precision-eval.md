# 009 — Eval for the `assertion-precision` skill

Read `AGENTS.md`, `CONVENTIONS.md`, and the *skill pipeline* section of
`HANDOFF.md` first. This task builds the measurement instrument for
`.agents/skills/assertion-precision/SKILL.md`. It does not edit the skill.

## Why this exists

The skill was written and executed by the same agent, scored once, by hand, in a
session that is now gone. Nothing that produced "7 of 8 degradations caught" is
re-runnable. Two consequences:

1. There is no way to tell whether a future edit to the skill improved or
   regressed it.
2. The packaging question in `HANDOFF.md` — split the skill into sub-skills
   behind a router, or leave it whole — cannot be settled. The handoff records an
   argument against splitting and says explicitly that the eval is the only thing
   that can falsify it. **That is why this task comes before any packaging work.**

## Scope — decided, not a menu

**Review only.** Cases are spec files that already exist; the eval scores the
findings an agent produces when it reviews them under the skill. The skill's
frontmatter also claims the authoring path; a generation eval is deliberately
out of scope here and is a candidate for a later task, not a stretch goal for
this one.

**Mechanically pinned inputs, JSON-declared expectations.** Fixtures are real
files. A vitest spec asserts they are what they claim to be. The grading of an
agent's findings against `evals.json` is still a human/agent read — building an
API-invoking scorer is out of scope.

**Do not edit** `.agents/skills/assertion-precision/SKILL.md`, `.oxlintrc.json`,
or `skills-lock.json`. If the eval reveals a skill defect, that is a finding for
the handoff, not an edit. The whole point is to measure the skill as it stands;
editing it mid-task destroys the baseline.

## Layout

```
lab/eval/assertion-precision/
  evals.json                  the case declarations
  cases/*.fixture.ts          the spec files under review
  eval-fixtures.spec.ts       pins the fixtures
```

**`.fixture.ts`, never `.spec.ts`.** `vite.config.ts` includes
`lab/**/*.spec.ts`, so a fixture named `.spec.ts` would be collected and *run* by
the suite it is supposed to be an inert input to. `eval-fixtures.spec.ts` is the
one real spec in the directory; it reads the fixtures as text.

The fixtures must typecheck — `tsconfig.lab.json` includes all of `lab`, and
`npm run build` runs `tsc -b`. They already have `DOM` lib and jest-dom types
available. They are not required to *pass* if executed, because they are never
executed; they are required to compile.

## Case design

Each case is one fixture file holding a small, plausible spec — the kind that
survives code review, per `AGENTS.md`. Not a list of bare `expect()` lines: the
skill's Move 1 asks *where a value came from*, which is unanswerable without
surrounding code. Model them on `src/employee-directory/EmployeesPage.spec.tsx`.

Each case in `evals.json` declares:

- `id`, `file` — the fixture path.
- `defects` — array of `{ line, move, summary }`. `move` is `1`–`5` matching the
  skill's headings, or `null` for a defect that should be caught by no specific
  move. Line numbers are why the fixtures must not churn casually.
- `must_not_flag` — array of `{ line, why }`. Lines that are correct and whose
  flagging is a false positive.
- `expected_moves` — the distinct `move` values in `defects`. This is the field
  that answers the packaging question, so it is derived, not hand-written; the
  spec checks it.

### Required cases

Minimum eight. These are named because each measures something specific:

1. **The step-6 miss.** A `toStrictEqual([null, 'Grace Hopper'])` decomposed into
   a length check plus per-index probes. This is the degradation the skill
   originally missed; it is now covered by "the ladder runs downhill too" in Move
   2. If the eval does not include the known miss it is not measuring the fix.
2. **Manufactured boolean** — `.has()` / `.includes()` / a comparison inside
   `expect()`, in a form oxlint does *not* already reject. Check against
   `lab/assertions/lint-coverage.spec.ts` before writing it; the ones oxlint
   catches belong to the overlap case, not here.
3. **DOM property reads** — `checked`, `value`, `getAttribute`, `classList.contains`.
   Move 4 only. This case is load-bearing for the packaging question: Move 4 is
   the one clean seam in the skill, and a case that invokes it alone is evidence
   for a split.
4. **Multi-assertion `waitFor`** plus a `toBeInTheDocument` where visibility was
   meant.
5. **Shapes that pass on broken data** — `toBeDefined()` on a number,
   `toBeFalsy()` where null is the contract, one field of a record, `toEqual`
   over `toStrictEqual`.
6. **A clean spec. Zero defects, zero findings.** `must_not_flag` covers every
   assertion in it; `defects` is empty. Include the two forms
   `lint-coverage.spec.ts` pins as correct: `queryBy…not.toBeInTheDocument()`
   and `toBeVisible()`. A skill that reports anything here is over-firing, which
   the handoff names as the likelier context win than a split.
7. **The overlap case.** Defects oxlint already rejects and the skill's exclusion
   list names. `defects` is empty and `must_not_flag` explains why each line is
   lint's job. Re-reporting a lint finding is a failure.
8. **A multi-move case** — one fixture where a single assertion trips two moves
   (Move 1 *and* Move 3 is the natural pair). The handoff calls the "one mistake →
   one leaf" assumption the load-bearing one in the split argument. This case is
   what tests it.

## Steps

1. **Read the ground truth before writing any case.** `lint-coverage.spec.ts` is
   the authority on what oxlint catches — `MATRIX.md` is a snapshot and may be
   stale. Every defect you seed must land on the uncaught side of that boundary,
   except in case 7 where the whole point is the caught side. *No behavioral gate
   of its own.*

2. **Write the fixtures.** *No behavioral gate of its own* beyond `tsc -b`
   passing.

3. **Write `evals.json`.** Shape follows
   `.agents/skills/shadcn/evals/evals.json` where it fits — `id`, a top-level
   `skill_name`, an array of cases — and diverges where it must, because that
   file is a generation eval with prose expectations and this is a review eval
   with line-anchored ones. Do not contort the fields to match it.

4. **Write `eval-fixtures.spec.ts`.** This is where the task earns "mechanical".
   It must assert, for every case in `evals.json`:

   - The fixture file exists and every `defects[].line` and `must_not_flag[].line`
     is within it and is non-blank. This is what stops silent line drift.
   - Running `lintTestRules()` over each `defects[]` line reports **no** rule —
     a seeded defect that oxlint already catches is not measuring the skill. Pass
     the RTL import for DOM forms; `lintTestRules.ts` documents that rules needing
     whole-file context under-report on a bare snippet.
   - The inverse for case 7: every `must_not_flag` line there **does** trip a
     rule.
   - `expected_moves` equals the distinct non-null `defects[].move`, sorted.
   - Every `move` is in `1..5` or null.

   Note the reason this spec is worth writing rather than trusting the JSON: it
   makes the fixtures fail loudly when the oxlint boundary moves, exactly as
   `lint-coverage.spec.ts` does for the skill itself.

5. **Run the eval once, by hand, and record the baseline.** Review each fixture
   against the skill as an agent would — the skill loaded, nothing else about the
   case known — and write the result to
   `lab/eval/assertion-precision/BASELINE.md`: per case, which declared defects
   were found, which were missed, and every false positive. This is the number a
   future skill edit gets compared against, so record what you actually got, not
   what the skill should have got. A miss here is a finding, not a failure of the
   task.

6. **Answer the packaging question in `BASELINE.md`.** Count, across cases, how
   many invoked exactly one move versus several. State whether that supports the
   split or the handoff's argument against it. If the evidence is thin, say the
   eval is too small to settle it and say what would settle it — an honest
   "insufficient" beats a manufactured verdict.

7. **Verify and hand off.** Gate on the full run, not `npx vitest run src` — this
   is a lab task and `lab/` *is* the deliverable.

   ```bash
   npm run build && npx vitest run && npx oxlint && npm run scan:dead-code
   ```

   Baselines to hold: oxlint at its 8-warning baseline (plus nothing new), knip
   unchanged at 1 file / 13 exports / 1 type. Vitest grows by the new spec's
   tests; report the new count. Then update `HANDOFF.md`: the eval exists, what
   it measured, and what the packaging call is now.

## Gates

- `eval-fixtures.spec.ts` passes and its assertions are mutation-checked per
  `HANDOFF.md`: change a declared line number in `evals.json`, confirm the spec
  reddens, revert. A drift-detector that has never been shown to detect drift is
  not evidence.
- Every declared defect is on the uncaught side of the oxlint boundary, proven by
  the spec rather than by reading `MATRIX.md`.
- `BASELINE.md` records a real run with real misses.
- The skill file is byte-identical to what it was at `e0e4297`.
