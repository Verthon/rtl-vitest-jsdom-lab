# 008 — Assess and author the assertion-precision skill

Read `AGENTS.md`, `CONVENTIONS.md`, and `lab/assertions/MATRIX.md` first. Do only
this task.

**For Opus.** This is a design-and-authoring task, not an implementation task —
it produces a skill, no app code. It is independent of 005, 006 and 007 and
touches none of the files they touch.

`AGENTS.md` admits a mistake to this repo only if it is both genuinely common
*and* not mechanically detectable. Until now that second half was asserted.
`lab/assertions/` measures it: `lint-coverage.spec.ts` lints eighteen coarse
assertion forms with this repo's own `.oxlintrc.json` and pins which rules fire,
and `assertion-precision.spec.ts` runs each form against a defective value and
pins what the failure message actually carries.

Nine of the eighteen are oxlint's. The skill's scope is the other nine, and the
job here is to keep that line sharp — a skill that re-teaches
`prefer-to-have-length` costs an agent's attention on every review and buys
nothing the CI already fails on.

## Decisions — settled. Do not substitute your own.

- **One skill: assertion precision.** Not the whole `TESTING_PITFALLS.md` list,
  not a general testing skill. The other pitfalls get their own tasks.
- **It lives at `.agents/skills/assertion-precision/SKILL.md`**, with the same
  frontmatter shape as the vendored skills (`name`, `description`, where the
  description states the trigger). **Do not add it to `skills-lock.json`** —
  that file tracks skills vendored from GitHub by source and hash; a
  locally-authored skill has neither.
- **Measured, not remembered.** `MATRIX.md` is a snapshot, not an authority.
  Re-run the lab before scoping, and treat the specs as ground truth if they
  disagree with the doc.
- **Probe before you write.** Every item you intend to put in the skill goes
  through `lintTestRules()` first. If oxlint flags it, it is out of scope — it
  moves to the exclusion list and nowhere else.
- **The lint-caught forms appear exactly once**, in a one-line exclusion list at
  the end of the skill ("oxlint already rejects these — do not report them"),
  with no explanation of why each is bad. Naming them is what stops an agent
  re-reporting them; explaining them is duplication.
- **No config edits.** Do not touch `.oxlintrc.json`, do not enable rules, do
  not add plugins. If your assessment concludes a rule would serve better than
  skill text, that is a *finding to report at the end*, not an edit to make.
- **No unverified claims about failure output.** If the skill wants to say what
  a matcher prints, there must be a passing test in
  `lab/assertions/assertion-precision.spec.ts` that says the same thing. New
  claim → add the probe first, watch it fail, then make it pass. `toHaveLength`
  is the cautionary case: the draft doc claimed it prints the array, and it
  does not.
- **Length budget: 120 lines.** The vendored skills run 38–277. A skill that
  restates matcher documentation has failed regardless of length.

## Steps

### 1. Re-measure the boundary

```bash
npm run test:unit
```

If `lint-coverage.spec.ts` is red, oxlint's coverage moved — the config changed,
or a rule's default category did. The red test tells you which form moved which
way. Rescope to the new split before continuing; do not patch the spec to match
the doc.

Record the current caught / uncaught split. That split is the skill's scope
statement and its exclusion list, and it is the one thing in the skill that
cannot be written from judgment.

### 2. Probe every candidate before it earns a line

For each item you are considering putting in the skill, write the coarse form as
a snippet and run it through `lintTestRules()`. Two outcomes, both terminal:

- **A rule fires** → the item is not skill material. Add it to the exclusion
  list, add the snippet to the `oxlint already rejects these` block in
  `lint-coverage.spec.ts` so the boundary stays pinned, and move on.
- **Nothing fires** → the item is a candidate. Add the snippet to the
  `oxlint has nothing to say about these` block, so that if a future oxlint
  release starts catching it, the spec reddens and the skill shrinks.

The spec is the gate. An item that never went through it does not go in the
skill.

### 3. Widen the probes to where the skill will actually be used

`lab/assertions/` currently covers plain values only — arrays, objects, Maps,
spies, promises. The skill will be applied to RTL specs, where the same
reduction happens against the DOM:

- a `checked` / `disabled` / `value` property compared by hand instead of
  `toBeChecked()`, `toBeDisabled()`, `toHaveValue()`
- `expect(queryByRole(...)).toBeTruthy()` instead of `toBeInTheDocument()`
- `toBeInTheDocument()` where `toBeVisible()` was meant
- `container.querySelector` results asserted on at all
- `expect(screen.getByRole('row')).toBeDefined()`, which cannot fail — `getBy`
  already threw if it was missing

**Measure these, do not assume them.** `eslint-plugin-testing-library` and the
jest-dom matchers are both active here, and some of the list above is already
covered. Add a DOM section to `lint-coverage.spec.ts` and find out. Any row you
cannot probe does not go in the skill.

Note the honest limit of the harness: `lintTestRules()` lints a snippet in
isolation, so rules needing whole-file context may under-report. Where that
matters, say so in the finding rather than trusting the empty result.

### 4. Compress what survives into moves, not a list

A nine-item checklist is not applicable under review pressure. Group the
survivors into a small number of moves an agent can hold at once. A starting
shape, to accept or replace with reasons:

- **The reduction test** — did the boolean in this assertion come from the data,
  or did the test manufacture it? (`DRAFT_FE_TESTING_ASSERTION_PRECISION.md`
  already argues this; the skill states it in one line and moves on.)
- **The ladder** — count → which one. `toHaveLength` says the count is wrong;
  only asserting the projected rows names the missing one.
- **The false-pass shapes** — assertions that pass on a broken value:
  `toBeDefined` on `NaN`, `toBeFalsy` where `null` was the contract, one field
  of a record, `expect` reachable only through a `catch`.
- **The verification move** — break it once, read the message, restore.

Each move needs a worked before/after pair. Lift them from
`assertion-precision.spec.ts` and cite the test name, so every example in the
skill is a green test somebody can run.

### 5. Write the skill

Frontmatter, trigger, the moves, the worked pairs, then the exclusion list.
Nothing else. No preamble about why testing matters, no matcher reference table
— `MATRIX.md` is that table, and the skill links to it rather than copying it.

### 6. Falsify it

Two runs, both required:

1. **Seeded.** Take a copy of a real spec (`src/employee-directory/*.spec.tsx`),
   degrade two or three assertions into forms from your uncaught set, apply the
   skill, and check it finds them. Work on a copy outside the repo tree; do not
   commit a degraded spec.
2. **Overlap.** Apply the skill to the repo's specs as they are, then run
   `npm run lint`. Every finding that names something oxlint already reported is
   a duplication bug in the skill. Tighten the wording and repeat until the
   overlap is empty.

Report both runs, including what the skill missed in run 1. A skill that found
everything on the first pass usually means the seeds were too obvious.

### 7. Fix what the lab falsified

`DRAFT_FE_TESTING_ASSERTION_PRECISION.md:40` claims `toHaveLength` prints the
array. It prints a preview truncated after the first entry, and its `actual` is
the length. Correct that line and note the three-rung ladder. Leave the `copy`
and `copy 2` duplicates of the draft alone — they are a separate cleanup.

Then update the `ASSERTION_PRECISION` entry in `TESTING_PITFALLS.md` to point at
the skill and at `MATRIX.md`. One sentence; the entry stays one to two
sentences.

## Early exit

If step 2 leaves fewer than four items that oxlint cannot see, **stop and
report**. The conclusion "this pitfall is mostly the linter's, and the residue
is one line in an existing skill" is a valid and useful outcome. Do not pad the
skill to justify the file.

## Out of scope

- Any other pitfall from `TESTING_PITFALLS.md`. One skill per task.
- New oxlint rules, config changes, or writing a custom lint plugin — even if
  the assessment shows a rule would be the better tool. Report it.
- Changing app code or existing specs under `src/`.
- Registering the skill in `skills-lock.json`, or restructuring `.agents/`.
- Reworking `lab/assertions/` beyond adding probes. `failureOf()` and
  `lintTestRules()` are fine as they are.

## Done

```bash
npm run build && npm run test:unit && npm run lint && npm run scan:dead-code
```

All four pass, plus:

- Every claim in the skill about what a failure prints traces to a named passing
  test in `lab/assertions/`.
- Every item in the skill went through `lintTestRules()` and came back silent.
- The exclusion list matches the measured caught set exactly — no extras, no
  omissions.
- The overlap run in step 6 produced zero findings that oxlint also reports.

`scan:dead-code` has a known dirty baseline (HANDOFF open item 3: `dialog.tsx`
plus vendored exports). This task should not lengthen it.
