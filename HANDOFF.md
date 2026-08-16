# Handoff — 2026-08-16 (session 6)

Read `AGENTS.md` (why the repo exists) and `CONVENTIONS.md` (how to work in it)
first. This file is where we resume.

## Session 6 — 011 executed. The query half of the cost model is measured.

`lab/test-speed/` now exists: `measure.ts`, `tiers.tsx`, `measure.spec.ts`,
`tiers.spec.ts`, `query-cost.spec.ts`, `COSTS.md`. 18 tests, all mutation-checked.
**017 is unblocked and is the next task.**

### The decided glob — 017 inherits this, do not re-decide it

**JSX is confined to `tiers.tsx`; the specs stay plain `.ts`; the vitest include
glob is unchanged** (`lab/**/*.spec.ts`). `tiers.tsx` is not a spec, so the glob
never needs to match it — Vite transforms it as an ordinary import. This was the
cheapest of the task's three options and cost no config edit.

**`tsconfig.lab.json` was edited, deliberately and flagged.** Rendering real
components needs what the lab config did not have: `jsx: "react-jsx"`, the
`@/*` path mapping, and `vitest/globals` + `vite/client` in `types`. Without
these `npm run build` fails. This is the second time a lab task has had to widen
that file (008 added `DOM` and jest-dom); it is now close to `tsconfig.app.json`.

### R — the noise floor

**R = 1.1x on this machine**, computed at run time by `measure.spec.ts`. The
helper resolved every synthetic multiple tested (1.1, 1.25, 1.5, 2, 3, 5) within
35% on three consecutive attempts. `COSTS.md` states R above its first row and
notes the caveat that R is measured on tight arithmetic loops, so the real floor
for DOM probes is somewhat worse — ratios in the 1.1–1.3x band are the weakest
claims in the document.

### What was measured, and what was killed

| Claim | Result |
|---|---|
| `within()` is a performance tool | **KILLED.** 1.35x / 0.95x / 1.08–1.13x — slower at `small`, inside the noise floor at `medium` and `huge`. Faster at no tier, including the largest |
| Role queries are the expensive query | **Half killed.** They cost 6–16x a testid lookup, but `getByText` costs 29–45x — text is the dear one, not role |
| Role query cost scales with tree size | **Unanswerable on these tiers, and reframed.** Cost per *node* varies 16–17x; cost per *match* varies 1.2–1.3x. Query cost tracks how many elements match the role, not tree size |
| Repeated scoped lookups are cheap | **KILLED.** 5x `getByRole` costs 6–18x one `getAllByRole` + indexing |
| `{ name }` filtering is a meaningful add-on | Confirmed but small: 1.20–1.31x, barely above R |
| happy-dom caches between identical queries | **Effectively yes, and it matters.** First query on a never-queried tree costs 7–13x a repeat, stable across 8 consecutive fresh trees. **Every ratio in `COSTS.md` is therefore warm cost** |

**The tier design did not survive the components.** 011 designed three sizes;
they are three *shapes at one size* — 87 / 62 / 88 nodes, a 1.42x spread, with
`small` larger than `medium`. `ReviewStep` renders nine cards of static text and
two buttons: heterogeneous, not large. Per the task, no tier was swapped for a
bigger subject and no `src/` code was changed to inflate one (`PER_PAGE` is a
module constant; varying it would have meant editing `src/`). `tiers.spec.ts`
asserts the spread stays under 2x so this cannot silently rot.

**The most useful finding was not one 011 asked for**: per-match cost is flat at
8.4–11.1µs while per-node cost varies 16x. A large page is not intrinsically slow
to query; a page with many elements *of the role you asked for* is. That reframes
the speed objection 013 has to answer, and probe 4 hands back a fix
(`getAllByRole` once, then index) that **keeps the altitude** — which is exactly
the shape 013 needs.

### Verification — measured on a clean tree this session

| Gate | Result | Was (session 5) |
|---|---|---|
| `npm run build` | passes | passes |
| `npx vitest run` (full) | **159 passed / 13 files**, ~10.5s | 141 / 10, ~9.0s |
| `npx oxlint` | **6 warnings — baseline held, nothing new** | 6 |
| `npm run scan:dead-code` | **1 file / 40 exports / 2 types — unchanged** | 1 / 40 / 2 |

The lab adds 18 tests and ~1.6s wall clock (8.8s → 10.5s without/with), almost
all of it the 24 tier renders the probes need. Recorded in `COSTS.md` because a
speed lab that slows the suite without saying so is a self-own.

`lab/test-speed/` contributes **zero** oxlint findings. Three rules had to be
worked around rather than suppressed wholesale: `no-node-access` and
`no-container` (node counting and parent-scoping moved behind helpers in
`tiers.tsx`), `render-result-naming-convention` (locals renamed `view`/`utils`),
and `no-test-id-queries` — the one genuine suppression, scoped to probe 1's
describe block with a stated reason, because measuring a testid query requires
issuing one. **No `data-testid` was added to any file under `src/`**; the lab
tags a lab-owned copy of the tree at run time, and `tiers.spec.ts` asserts every
tier's own markup is testid-free.

### Mutation checks run this session

All six ratio assertions plus the tier pins, each reddening exactly its own test:

| Mutation | Reddened |
|---|---|
| 3 `<h3>`s added to `ReviewStep.tsx` | `pins the huge tier's node count and role histogram` |
| `toBeGreaterThan(R)` → `toBeLessThan(R)` (probes 1, 4, 5) | those three probes, plus the caching test |
| probe 2 per-match spread bound inverted | `reports cost per node and per match` |
| probe 3 floor 0.5 → 1.5 | `answers whether within() is a performance tool` |

One caught defect worth recording: the first attempt at the probe-3 mutation used
a non-global `perl` substitution and hit an *identical* assertion 140 lines
earlier, so probe 3 stayed green and I nearly recorded it as unfalsifiable. **A
mutation check that reddens the wrong test is not a pass** — verify which test
went red, not just that something did.

### Two tests I wrote and deleted rather than ship

Both were `TEST_THAT_CANNOT_FAIL` in the lab that exists to detect it:

1. A "negative half of the noise floor" test asserting `measure.ts` *could not*
   resolve 1.02x. It failed immediately — the helper measured 1.02x exactly. The
   test asserted the instrument must be bad, which is not a claim I had evidence
   for.
2. A caching probe comparing 2 role queries against 1 role query + 1
   `getAllByRole`. Different workloads, so its ratio meant nothing; oxlint's
   `expect-expect` caught that it had no assertion at all, which was the tell.

## Session 5 — the onboarding slice landed; 011 split

Between session 4's close and this session, **014, 015, 012 and 016 were all
executed and committed**, in a single commit `0b959eb` (`feat: add onboarding
feature`, 41 files, +3765). Session 4's handoff was written before any of that
and listed all of it as unexecuted; it had gone stale the same way session 3's
did. This session did no implementation — it reconciled the document against the
tree, split `011`, and re-measured every gate.

**Everything session 4 called "ready, unexecuted" now exists:**

- `src/employee-onboarding/` — 10 steps, `wizard.ts`, `routes.tsx`, `api.ts`,
  `mocks.ts`, `types.ts`, `defaultDraft.ts`, `ReviewStep.tsx` summarising all
  nine prior steps. That is 012's deliverable and 011's `huge` tier.
- `src/employee-onboarding/useUrlStepper.ts` + `useUrlStepper.spec.tsx` — 014's
  URL-synced stepper, with `StepperProgress.tsx` on the `Stepper.*` primitives.
- `src/testsConfig/TestAppProviders.tsx` — extended with the `routes` prop
  (+46/-10). 014's routing seam; 015 made its two modes exclusive.
- `OnboardingPage.spec.tsx` — 016's four assertion fixes are in it: `expectPath()`
  anchors all eleven path assertions, the contact-removal test types distinct
  values and asserts the survivor's identity, and the tri-state parent checkbox
  asserts `aria-checked` rather than `toBeChecked()` / `data-indeterminate`.

**`tasks/012`, `014`, `015`, `016` were not deleted after execution**, contrary
to the convention below. They are still on disk. Delete them when you next touch
the tasks folder — git holds them, and 016's findings are recorded here.

## Resume here

**The whole `014` → `015` → `012` → `016` chain is done, verified, committed.**
The open front is still test altitude, now: **`011` → `017` → `013`**.

**`011` was split this session.** It was one task with eleven probes across three
tiers, and its two halves are not the same kind of work. The first is mechanical
— every probe is a ratio between two forms on one tree. The second contains the
probes that may be *unmeasurable* (`waitFor`'s polling floor is not a ratio;
module-graph cost is defeated by Vite's transform cache), and those outcomes
should not be resolved under pressure against a helper whose resolution nobody
has measured. `tasks/011-test-speed-cost-model.md` is deleted; git holds it.

Three things changed in the split beyond the cut, each closing a hole in the
original:

1. **The noise floor is now a deliverable.** The old self-test proved `ratio()`
   detects a loop-of-1 vs loop-of-1000 difference. Every probe worth worrying
   about lives at 1.2x–3x, which that self-test says nothing about. 011 now
   measures **R**, the smallest ratio the helper can resolve, states it in
   `COSTS.md`'s header, and both tasks are barred from reporting anything under
   R as a finding. This is what stops `within()` being written up as "slightly
   faster" by an instrument that cannot see 1.1x.
2. **Probe 7 gets an explicit exemption from the no-absolute-milliseconds rule.**
   A polling floor is not a ratio between two forms, so the original rule
   contradicted its own probe. It now asserts against RTL's *configured*
   interval read at run time, not a hard-coded 50ms.
3. **Probe 11 gets three named outcomes** — in-process with a stated mechanism,
   out-of-process with reported spread, or declared unmeasured — and "unmeasured"
   is explicitly a successful completion, not a failure.

Two smaller calls made in the split, both worth overriding if you disagree:
`data-testid` is lint-forbidden in `src/`, and probe 1 needs one to measure
against, so the lab owns its own rather than one being added to a real
component; and the happy-dom caching question moved from a trailing aside to a
gate, because if a repeated identical query is materially cheaper then
`measure.ts`'s `runs` are timing cache hits and every query row is warm-cost.

| Task | State |
|---|---|
| `tasks/011-test-speed-instrument-and-query-cost.md` | **Executed, session 6. Delete this file.** Output: `lab/test-speed/` + `COSTS.md`. R = 1.1x; `within()` killed |
| `tasks/017-test-speed-async-and-import-cost.md` | **Ready, unexecuted. Run next — 011 has closed.** Lab: async probes 6–10, import probe 11, then `## Score` / the verdict / `## For the skill`. Appends to the existing `COSTS.md`, which ends in a stub `## Async and import cost` heading |
| `tasks/013-test-altitude-skill.md` | **NOT ready — one open decision.** Framing: coverage vs. mocking vs. naming. See *Session 3* below. Also reads 017's `## For the skill` |
| `tasks/005-debounced-filter.md` | Executed, reviewed, accepted. Kept only because 006 step 8 refers to it |
| `tasks/012`, `014`, `015`, `016` | **Executed and committed. Delete these files.** |

Completed task files get deleted — git holds the history, and whatever outlives
the task belongs here or in the skill itself. 008, 009, 010 went this way; 012 /
014 / 015 / 016 have not yet.

## Verification state — re-measured this session

Measured on `0b959eb`, clean tree. **Superseded by session 6's table at the top
of this file** — the test counts moved when `lab/test-speed/` landed. The oxlint
and knip baselines below are still current.

| Gate | Result | Was (session 4) |
|---|---|---|
| `npm run build` | passes | passes |
| `npx vitest run src` | **51 passed / 7 files** | 28 / 5 |
| `npx vitest run` (full) | **141 passed / 10 files**, ~9.0s wall | 118 / 8 |
| `npx oxlint` | **6 warnings** | 14 |
| `npm run scan:dead-code` | **1 file / 40 exports / 2 types** | 1 / 13 / 1 |

```bash
npm run build && npx vitest run && npx oxlint && npm run scan:dead-code
```

**The knip baseline moved hard, 13 → 40 unused exports, and 016 did not flag
it.** The cause is shadcn: `0b959eb` added nine UI components
(`calendar`, `checkbox`, `combobox`, `field`, `input-group`, `popover`, `select`,
`separator`, `textarea`), each exporting its full surface while the onboarding
slice uses a fraction. `CONVENTIONS.md` says adding a shadcn component before the
task that uses it is dead code — that rule was followed at the *component* level
(all nine are used) but the unused *exports* inside them were not triaged.

Four of the 40 are not shadcn and are worth a look: `mockEquipment`,
`mockAccessGroups`, `mockAccessPermissions`, `mockManagers` in
`employee-onboarding/mocks.ts` are exported and unreferenced. Per
`CONVENTIONS.md` fixtures are exported so tests can reference them — but no test
does. Either a spec should be using them or the export is decoration.

**The oxlint baseline improved, 14 → 6.** Session 4's six
`no-test-id-queries` warnings are gone (the `LocationProbe` rewrite landed).
The remaining six are five `jsx-a11y` warnings in untouched shadcn files
(`field.tsx`, `input-group.tsx` ×4) and one real finding:
`OnboardingPage.spec.tsx:161` `vitest(no-conditional-in-test)`. That last one is
in a spec 016 just audited for assertion precision and is worth reading — a
conditional in a test is `TEST_THAT_CANNOT_FAIL` adjacent.

> **Gate note.** App tasks gate on `npx vitest run src`, because `lab/` shares
> the vitest include glob and is edited interactively — a red `lab/` spec is not
> evidence an app task broke something. Skill/lab tasks gate on the full run,
> because `lab/` *is* their deliverable. 011 and 017 are lab tasks: full run.

**The tree is clean and single-workstream.** Session 4's interleaved-revert
hazard is fully gone — everything is committed and `git status` is empty.

## Session 4 — reconciliation, not new design

Opened by resuming from session 2/3's handoff. Two things had gone stale since
session 3 wrote it, both resolved that session:

1. **The mutation warning at the old top of this file was already false.**
   `EmployeesPage.tsx` was clean, correctly guarded, committed — 006 and its
   negative-page-param follow-up (`tasks/010`, since deleted) had landed and
   been committed between sessions, outside this document.
2. **The parallel skill-rework workstream finished and shipped.**
   `.agents/skills/assertion-precision/` is no longer one file — it is
   `SKILL.md` plus three sub-files (`cannot-fail.md`,
   `does-not-name-the-defect.md`, `wrong-subject.md`), committed at `57c2184`
   and `12c77cb`. `component-mocks` also shipped as a second skill. This
   answers the split-vs-whole packaging question the *Open* section below
   deferred to the eval — it was decided elsewhere, by splitting.

**`tasks/009-assertion-precision-eval.md` is deleted, on the user's call, not
executed.** Its two hard gates — "the skill file is byte-identical to
`e0e4297`" and "does not edit the skill" — cannot hold against a skill that is
now four files, and its stated reason for existing (settle the packaging
question) is moot now that packaging is already decided. Rewriting it for the
new shape was offered and declined; the user said the shipped skill split
covers what 009 was for.

Draft cleanup (12 duplicate `* copy*.md` files, plus the `ASSERTION_PRECISION`
and `COMPONENT_MOCKS` base drafts now that both have shipped skills) was
committed separately, per *Method*'s workstream-separation rule.

`tasks/014` was written that session, split out of `012`, because
`@stepperize/react` owns step state internally by default and that collides with
the requirement that the URL be the source of truth for the current step (the
`006`/003 lesson — internal state can silently drift from the URL while tests
stay green). The library's URL-controlled mode
(`useStepper({ step, onStepChange })`) is first-class, so the fix was real
rather than a workaround. **That task has since executed**; see the top of this
file.

## 006 — what was checked, and what was not

Sonnet executed it; I verified part of it. **Recording the boundary honestly
because a partial check read as a full one is worse than no check.**

**Implementation review — passes.** Read `EmployeesPage.tsx` against the
Decisions section: single `setSearchParams` per update, callback form over a
fresh `URLSearchParams` copy, `delete` rather than empty-string for absent keys,
no normalizing `useEffect`, no `{ replace: true }`, parse step clamps nothing.
`useDebouncedCallback` holds `fn` in a ref updated every render and reads it at
fire time — the stale-closure requirement 006 called load-bearing but could not
gate. All as specified.

**Mutation checks that ran and passed** (each reddened exactly the named test,
nothing else):

| Mutation | Reddened |
|---|---|
| Page 1 written as `page=1` instead of deleting the key | `puts the current page in the URL` |
| Empty filter writes `q=` instead of deleting the key | `drops the page param when the filter changes` |
| Filter change stops resetting page | `drops the page param when the filter changes` |
| Filter field not initialized from `q` | `renders the filter named in the URL on first load` |

**Mutation checks still owed** — from 006 step 9, not yet run:

- Parse step drops the non-numeric guard → must redden *non-numeric page param*.
  (This is the mutation currently sitting in the file. It was applied; the run
  never happened.)
- Parse step clamps page to the last page → must redden *page past the end*.
- App rewrites a bad URL to a valid one → must redden *page past the end*'s URL
  assertion.
- Initial params ignored, always page 1 → must redden *renders the page named in
  the URL*.
- `useDebouncedCallback` delay → 0 → must redden 005's *does not refetch until
  typing stops*, which 006 step 9 names as the gate for the debounce itself.

**One assertion I suspected and cleared.** `toHaveTextContent('')` appears twice
(spec lines 129 and 296) as the "no keys in the URL" assertion, and I flagged it
as vacuous on the theory that jest-dom substring-matches, so `''` matches
anything. **That is wrong for this version.** jest-dom 7.0.1 throws on an empty
expected string — *"Checking with empty string will always match, use
.toBeEmptyDOMElement() instead"* — so the assertion is not vacuous; it is a
strict empty-content check that cannot silently pass. Probed directly, not
reasoned about. Recorded because it is a plausible-looking false finding that a
future reviewer will likely re-derive.

## What happened in session 1 — 008 executed

All seven steps. The measured boundary, not the prose, drove every scoping call.

**Step 3 (the DOM boundary) is now pinned in the spec, not just described.**
`lint-coverage.spec.ts` grew from 9 tests to 41: 9 caught DOM forms, 12 uncaught,
and 2 *correct* forms pinned as non-findings so the skill cannot flag them
(`queryBy…not.toBeInTheDocument()` and `toBeVisible()`). The previous session's
table was confirmed by re-probing, with one row it had left open now closed:
`toBeVisible` / `toBeInTheDocument`-where-visible-was-meant is uncaught, so it is
skill material.

**Step 6's falsification did its job — the skill missed one seed.** Seeded run:
7 of 8 degradations caught. The miss was splitting one
`toStrictEqual([null, 'Grace Hopper'])` into a length check plus per-index
probes. Every fragment tripped a Move-3 row, so the skill flagged the *pieces*
while missing the actual defect: a collection assertion decomposed into weaker
per-element ones. Fixed by adding "the ladder runs downhill too" to Move 2, with
that exact example. Overlap run: **zero** findings duplicating oxlint.

**Two of my own claims were falsified by the lab before they reached the skill.**
This is the probe-first rule paying for itself, and both are the `toHaveLength`
failure mode recurring:

1. I wrote that `toHaveTextContent` prints the markup. It does not — it prints
   the same flattened string a manual `textContent` read gives. Its real gain is
   substring/regex matching and whitespace normalization, not better output.
2. I wrote that several assertions in one `waitFor` hide which one failed. RTL
   rethrows the last error, so it *does* name it. The real cost is burning the
   full timeout and re-running already-true assertions every tick.

Both corrections are in the skill and pinned by probes.

**`no-wait-for-multiple-assertions` is enabled as `error` and does not fire.**
Confirmed against the awaited multi-assertion form, while
`no-wait-for-side-effects` fires on the same shape. An oxlint implementation
gap, not a config error. It is pinned in `lint-coverage.spec.ts`, so an oxlint
release that closes it reddens the spec and the skill shrinks by one item.

**Config caveat — `tsconfig.lab.json` was edited.** Added `"DOM"` to `lib` and
`@testing-library/jest-dom` to `types`. The lab was plain-value-only until this
session; the new DOM probes do not typecheck without it and `npm run build`
fails. 008 froze `.oxlintrc.json`, not the tsconfigs, and this was the minimum
to make the deliverable compile — but it is a config change and is flagged
deliberately rather than buried.

Two smaller notes: the task's stated knip baseline of "11 exports" was already
stale before this session — it is 13, and unchanged by this work. And
`lab/assertion-precision/_scratch-probe.spec.ts` was left alone as instructed, with its
two `no-conditional-in-test` warnings.

## The skill — what it is now

`.agents/skills/assertion-precision/SKILL.md`, 120 lines, exactly at the budget
008 set. Five moves, each worked pair citing a named passing test:

1. **Where did the boolean come from** — data, or manufactured by the test?
2. **The ladder: count → identity**, and the downhill case from the seeded run.
3. **Shapes that pass on a broken value** — a table of 9.
4. **Prefer the matcher that prints the element** — DOM property reads, `waitFor`.
5. **Verify by breaking it.**

Then the one-line exclusion list of what oxlint already rejects, which is what
stops an agent re-reporting lint findings.

**Rules that bind anything editing this skill** (from `tasks/008`, now deleted —
these are the parts worth keeping):

- **Measured, not remembered.** `MATRIX.md` is a snapshot, not an authority.
  Re-run the lab before rescoping, and treat the specs as ground truth if they
  disagree with the doc.
- **Probe before you write.** Every item goes through `lintTestRules()` first.
  If oxlint flags it, it is out of scope — it moves to the exclusion list and
  nowhere else.
- **No unverified claims about failure output.** If the skill says what a matcher
  prints, a passing test in `assertion-precision.spec.ts` must say the same.
  New claim → add the probe, watch it fail, then make it pass.
- **The lint-caught forms appear exactly once**, in the exclusion list, with no
  explanation of why each is bad. Naming them stops re-reporting; explaining them
  is duplication.
- **Length budget: 120 lines.** Currently exactly at it, so anything added must
  displace something.
- **No `.oxlintrc.json` edits, no new rules, no custom lint plugin.** If a rule
  would serve better than skill text, that is a finding to report, not an edit.
  Do not register the skill in `skills-lock.json` — that file tracks skills
  vendored by source and hash.

**These rules were written for 008's execution and may not survive the parallel
best-practices rework.** They are recorded as *what 008 decided and why*, not as
constraints binding the other agent. Where the rework contradicts one, the rework
wins — but the reasoning here is worth reading first, because the length budget
and the exclusion-list rule were both responses to measured problems rather than
taste. The one rule that should survive regardless: **no claim about what a
matcher prints without a passing probe that says the same**, since the lab
falsified two such claims during 008.

## Open — needs your call

Renumbered in session 4, extended in session 5; items resolved since session 2
are marked and kept only long enough to record how they closed. Do not
cross-reference by number across sessions — per *Method*, state the substance,
not the ordinal.

**Resolved since session 2, confirmed by reading current state:**

- 006's owed mutation checks, the oxlint baseline move, and the push/replace +
  stale-closure decisions — 006 and its follow-up (`tasks/010`, since deleted)
  are committed. `LocationProbe` no longer uses `data-testid`, which removed all
  six `no-test-id-queries` warnings. Session 4 recorded this as "oxlint clean at
  0 warnings"; that was true of *those* warnings, not of the run. The current
  total is **6** — see *Verification state* at the top.
- The skill rework / `tasks/009` reconciliation — resolved, see *Parallel
  workstream* above. 009 deleted, not executed.
- Sub-skills / progressive disclosure — decided by the parallel workstream:
  split into `SKILL.md` + `cannot-fail.md` + `does-not-name-the-defect.md` +
  `wrong-subject.md`. No eval was built to measure whether it helped; the
  argument recorded in session 2 against splitting was never tested, only
  overtaken.
- 006 and 008 committed separately — done, and further, both are now several
  commits in the past. The interleaved-tree revert hazard no longer exists.
- Duplicated drafts — `git rm`'d this session, see top of file.

**Still open:**

1. **008 has had no independent review pass.** It was executed by the same
   agent that wrote it. 005 got a two-finding review that caught a vacuous
   assertion; 008 has had nothing equivalent, and the parallel rework's review
   (if any) is not recorded here.
2. **Knip baseline still dirty, and now much dirtier** — 1 unused file
   (`dialog.tsx`), **40** unused exports, **2** unused types, re-measured in
   session 5. It was 13 / 1 through session 4; the onboarding commit's nine
   shadcn components account for most of the growth. Until deliberately
   triaged, "scan:dead-code passes" means nothing to a future agent without
   diffing the export list by hand — and at 40 entries that diff is now
   genuinely painful, which makes triage more urgent than it was. The four
   non-shadcn entries (`mockEquipment`, `mockAccessGroups`,
   `mockAccessPermissions`, `mockManagers`) are the ones to look at first.
3. **Does the fake-timer finding become a `TESTING_PITFALLS.md` entry?** With
   the upstream links it is a documented ecosystem gap, not a local war story.
4. **Flaky delay test** — `shows the loading state until a delayed response
   arrives` still races a real `setTimeout(50)` against a 100ms helper delay.
   Confirmed still present at `EmployeesPage.spec.tsx:335`, unchanged.
5. **No eval exists for `assertion-precision`.** 009 was deleted rather than
   rewritten. If an eval is still wanted against the current 4-file skill,
   that is new scoping work, not a resurrection of 009 — its byte-identical
   and "settle packaging" framing no longer apply.
6. **Next skill after this one: `TEST_THAT_CANNOT_FAIL`** — three worked
   examples in-repo, and its verification move is already binding method
   here. The packaging question that gated this is now settled (split), so
   nothing blocks starting it except priority against 011/017/013.
7. **`OnboardingPage.spec.tsx:161` has a conditional in a test**
   (`vitest(no-conditional-in-test)`, one of the six remaining oxlint
   warnings). 016 audited that file for assertion precision and did not touch
   it — reasonably, since 016's scope was four named findings. But a
   conditional in a test is the shape `TEST_THAT_CANNOT_FAIL` is about, and it
   is sitting in the repo's newest spec. Worth reading before that skill gets
   written, since it may be a fourth in-repo worked example.
8. **016 produced no written report.** It executed inside `0b959eb` along with
   012/014/015, so its four fixes are verifiable by reading the spec — they are
   there — but the mutation gates it prescribed (the `slice(0, -1)` contact
   removal, the 2-of-3 access propagation, the prefix-path check) have no
   recorded result. The fixes look right on inspection. Nobody has confirmed
   they redden under the mutations that motivated them, which is exactly the
   distinction *Method* draws between green and checked.

## Session 3 (2026-08-15) — test altitude. Design only.

No code written, no skill touched. Output is three task files and the findings
below.

### The pitfall, and that it is genuinely new

People test leaves of the component tree instead of the page-level journey,
defending it on speed. **It is not in `TESTING_PITFALLS.md`** — 13 entries, none
of them this. Not a distillation of an existing draft; new problem space. It
splits into A (wrong entry point), B (wrong assertion altitude), C (journey
skipped by seeding state or mocking the navigator). Full statement in
`tasks/013`.

**`CORP_TESTING_PITFALLS_EXAMPLES.md` is the strongest evidence in the repo for
it** and had been overlooked. Its opening specimen is case C from production —
a Stepper spec mocking `useSteppedNavigationContext` to force `processStep: 1`.
That file is mostly *about* this pitfall, and the pitfalls list does not have it.

### Three drafts each own a fragment

- `BEHAVIOR_VS_STATE` gets closest and stops one step short. Its move — *would
  this test still pass if internals were restructured?* — is the altitude
  question, but the draft applies it only to assertions within a component. The
  step it never takes: **the component you chose to mount is itself an internal
  arrangement.**
- `ONE_REASON_TO_FAIL` already distinguishes "one story with checkpoints" from
  "separate claims sharing a render" — that is the legitimate-vs-substitute test,
  applied to assertions rather than to placement.
- `MOCKING_AS_DIAGNOSIS` has the deepest unwritten version: if the journey test
  is unbearable to write, that is a signal about the app, not about the test.

### Deep research — what it settled

Run by the user on claude.ai. Full findings in `tasks/013`; the two that bind:

1. **Nobody has made altitude mechanical, and the rejection is in our own
   toolchain.** `eslint-plugin-testing-library` #373 (`prefer-appearance`) was
   declined — "we can't infer how the component is written". `typescript-eslint`
   #5923 closed `wontfix` on "unresolvable false-positives". This is a citation
   for the skill's existence: the maintainers of the plugin this repo runs 27
   rules from, locating the boundary where `AGENTS.md` says we live.
   ⚠️ **#373's attribution is unverified** — the research flagged that the
   maintainer's username was inferred. Confirm before citing.
2. **The predicate has prior art; do not invent one.** Cucumber's docs: *"Will
   this wording need to change if the implementation does?"* — the only criterion
   found that applies to a single test, answers yes/no, and transfers to React.
   It is the same move `BEHAVIOR_VS_STATE` already makes.

**One finding cuts against the skill and must be carried, not buried:** Trautsch
& Grabowski mutation-tested 38,782 tests across 17 projects and found **neither
unit nor integration better at detecting defect types.** "Test higher because it
catches more bugs" is therefore not available. The argument has to be about what
is verified — a journey versus a prop contract — which is stronger but different.

### ⛔ The decision that blocks `tasks/013`

The skill can frame altitude as **coverage** (is this leaf the only thing proving
the behavior?), **mocking** (what did you mock to skip the journey?), or
**naming** (does the name describe a user goal or a prop?). Research pushes
toward coverage; the corp specimen shows mocking; mocking risks colliding with
the shipped `component-mocks`. **The maintainer makes this call.** Scope —
single-file vs. spec+component vs. whole-suite — follows from it, and the tension
is that the best-supported framing is the one needing the widest scope.

### 011 / 012 — the speed objection

The standing defence of leaf tests is CI time. 011 and 017 measure where RTL
test time actually goes; 012 shipped the subject they measure against (a real
10-step onboarding slice, because a synthetic 10k-node table measures uniform
trees and real slowness comes from role variety, state, and routing). Design B
was chosen deliberately: tiers are real components, so **size and kind move
together and no cross-tier ratio is a claim about tree size** — 011 carries that
confound as a gate on `COSTS.md`.

**If the lab finds the objection substantially correct, 013's argument changes
shape.** That is a live outcome, not a formality. 017 is required to say in
writing, here, whether 013's argument survives its verdict — so 013 must not
start before 017 closes, regardless of when the framing decision below is made.

`012` is done as of session 5. The tier table in `tasks/011` was written before
the slice existed; that task now instructs its executor to read
`src/employee-onboarding/` and confirm what `ReviewStep` actually renders before
building `tiers.ts` around the assumed shape.

### Still needed from the maintainer

Three or four more real corp specimens. One Stepper example is thin for a skill,
and the pipeline below says a pitfall earns a rule when the repo holds instances
of it.

## The skill pipeline — evidence-first. Decided.

**A pitfall earns an enforced rule only when this repo holds a mutation-checked
instance of it.** Everything else stays prose in `TESTING_PITFALLS.md`. Green is
not evidence, and neither is a well-argued essay.

This inverts the original plan of distilling 13 drafts into rules. The drafts
all predate the tests (written 2026-08-12, before the repo had app specs) and
are generic FE-testing essays; only their *verification move* and *tell*
sections convert into anything an agent can apply.

008 is the first execution of this pipeline and it validated the approach twice
over: the lab falsified two claims I would otherwise have shipped, and the
seeded run found a gap no amount of re-reading would have.

| Evidence in repo | Draft it proves | Proof |
|---|---|---|
| Grace Hopper was already row 1, so the row assertion could not fail | `TEST_THAT_CANNOT_FAIL`, `FIXTURE_COUPLING` | green under old fixture, red under `Lynn Conway` |
| `filter(Boolean)` discarded the empty-`q` request | `TEST_THAT_CANNOT_FAIL` | red as `[ '', … ]` vs `[ null, … ]` |
| Fake timers hang RTL's `asyncWrapper` | `HIDDEN_ASYNC` | 3 upstream issues, 5 dead ends, `fakeTimers.ts` JSDoc |
| The measured oxlint boundary, plain values and DOM | `ASSERTION_PRECISION` | `lint-coverage.spec.ts` (41 tests) + `MATRIX.md` |
| 003's pagination tests stayed green through the `useState` → URL migration without ever proving the URL changed | `TEST_THAT_CANNOT_FAIL`, `BEHAVIOR_VS_STATE` | 006 step 4 predicted it; `puts the current page in the URL` is the test that closes it |
| `removes a repeatable contact` passed while removal deleted the wrong row — both contacts were left blank, so the surviving *count* held whichever one was dropped | `TEST_THAT_CANNOT_FAIL` | 016 §1: green under `answers.slice(0, -1)` in `ContactStep.tsx`; fixed by typing distinct values and asserting the survivor's identity |
| `toHaveTextContent` substring-matches, so every one of eleven journey path assertions passed on a double-prefixed or junk-suffixed URL | `ASSERTION_PRECISION` | 016 §4: `/wrong/prefix/onboarding/address` satisfies `toHaveTextContent('/onboarding/address')`; fixed by an `expectPath()` helper building an anchored regex |
| `toBeChecked()` on a tri-state parent checkbox fails with a matcher-usage error rather than a state diff | `ASSERTION_PRECISION` | 016 §2: Base UI renders `aria-checked="mixed"`, which jest-dom rejects outright — the report says *wrong matcher*, not *the group failed to fully check* |
| `toHaveAttribute('data-indeterminate')` asserts a Tailwind styling hook, not the screen-reader contract | `BEHAVIOR_VS_STATE` | 016 §3: the three states differ in both `data-*` and `aria-checked`; asserting the former reddens on a styling rename and prints ~600 chars of class soup without naming the state |
| `within()` is a performance tool, not just a disambiguation one | the coming test-altitude skill — **settled against a claim it was going to make** | 011: 1.35x / 0.95x / 1.08–1.13x across three tiers, `COSTS.md` *Notes*. Faster at no tier. The skill must not repeat this |
| Role-query cost tracks matching elements, not tree size | the coming test-altitude skill | 011 probe 2: per-node cost varies 16–17x across tiers, per-match cost 1.2–1.3x. Asserted, not just logged — inverting the bound reddens the probe |
| `getByText` is dearer than `getByRole`, inverting the folk ranking | the coming test-altitude skill | 011 probe 1: text 29–45x a testid lookup vs role's 6–16x, at all three tiers |
| The first RTL query against a fresh tree costs 7–13x a repeat | `HIDDEN_ASYNC`, and a caveat on every timing claim | 011: stable across 8 consecutively rendered fresh trees, so not JIT warmup. Every ratio in `COSTS.md` is warm cost |
| N scoped `getByRole` calls cost 6–18x one `getAllByRole` plus indexing | the coming test-altitude skill — **a fix that keeps the altitude** | 011 probe 4, all three tiers |

## `lab/` — the measurement workstream

In the vitest include glob (`lab/**/*.spec.ts`), which is why the full run
reports far more than `src`'s 51 tests. Currently 108 tests across 6 files
(`assertion-precision.spec.ts`, `lint-coverage.spec.ts`,
`component-mocks/typed-mock-drift.spec.ts`, and 011's three under
`test-speed/`).

**The glob is `.ts`, not `.tsx`, and stays that way** — decided by 011, session 6.
JSX lives in `lab/test-speed/tiers.tsx`, which is imported by the specs rather
than matched by the glob, so rendering real page components cost no config
change. 017 inherits this; do not re-decide it.

It mechanizes the admission gate `AGENTS.md` states in prose — *a mistake
belongs here only if it is not mechanically detectable*:

- `lintTestRules(assertions, { imports })` writes a synthesized probe spec to a
  temp dir, shells `oxlint` at it, and returns the rule codes that fired.
  **Honest limit, confirmed not hypothetical:** it lints a snippet in isolation,
  so rules needing whole-file context under-report — `no-node-access` is silent
  on a bare snippet and fires once the RTL import is added. Probe DOM forms
  **with** the import.
- `failureOf(assertion)` returns the failure message plus inspected
  `actual`/`expected` instead of a boolean, so a draft can argue about
  *diagnostic quality*. A coarse assertion that fails with a useless message is
  a real pitfall even when it does fail.
- `MATRIX.md` is the readable output — per-type matcher choice plus how much
  oxlint enforces, every row backed by a spec. Now covers DOM as well as plain
  values.

## Method — binding

**Probe before you claim.** New emphasis this session, and it caught me twice.
No statement about what a matcher prints goes into a skill or a draft without a
passing test that says the same thing. Write the probe, watch it fail, make it
pass.

**Tests are mutation-checked, not trusted for being green.** Break the code each
test covers, confirm it fails, revert.

**Mutate and restore in the same tool call.** New this session, learned the
expensive way: a mutation applied in one call and restored in a later one leaves
the repo broken if anything interrupts the sequence — a rejected call, a context
boundary, an error. This session ended with a live mutation in
`EmployeesPage.tsx` for exactly that reason. Mutate, run, restore, and verify the
restore, all in one command; and never restore a file whose other changes are
uncommitted with `git checkout`.

**Scope verification to what was asked.** Also new. "Verify the task" ran into a
full step-9 mutation sweep without checking whether that was wanted. Confirm the
depth of a verification pass before starting it — the gates plus an
implementation read is a different job from mutation-checking eleven rows.

**A mutation that reddens the right test for the wrong reason is not a pass.**
Find the surgical version or record honestly that you could not.

**A mutation check is two-way when the fix is a fixture change.** Showing the
mutation reddens the *new* test is half the proof; it must also stay green under
the old one, or the change was merely different, not load-bearing.

**Check upstream before reverse-engineering `node_modules`.** A sequencing rule,
not a ban on source-diving. `gh` is **not installed**; `WebSearch` and
`WebFetch` work. Fetch the issue thread, not a StackOverflow summary, and
confirm open/closed state and whether a fix shipped.

**"Setup-only" is retired.** 002 and 003 were stamped *write no new spec files*,
so the only gate was "compiles and lints" — which passed on three defects.

**Tasks state decisions, not menus.** Free choice plus no behavioral gate makes
whatever the agent picks unfalsifiable.

**A decision with no gate must say so in the task.** An agent must never read a
green suite as confirmation of an ungated decision.

**Never cross-reference this file by item number.** The list is reordered every
session. State the substance inline, or name the item — "the knip baseline item"
— never the ordinal.

**Groundwork steps get labelled.** A red-green task opening with implementation
steps contradicts itself unless those steps say "no behavioral gate of their own".

## Decisions from earlier sessions — still binding

**Architecture**

- Flat VSA. Slices are top-level under `src/`, siblings of infra. No `features/`.
- Slices named by capability, not resource: `employee-directory/`, not
  `employees/`.
- Flat inside a slice until 3+ files of a kind justify a subfolder.
- Slices own their routes as `<feature>Routes: RouteObject[]`; `routing/router.tsx`
  only spreads them.
- Route paths are independent of folder names.

**Data layer**

- No backend. Every endpoint invented, served by MSW in dev and test.
- MSW handlers compute responses from request params (a fake server). A canned
  handler makes tests that verify the stub instead of the component.
- Fixtures static and deterministic: 47 employees. 47 is deliberate — not
  divisible by 10, so the last page is partial.
- Envelope `{ data, page, perPage, total }` as `Paginated<T>`.
- `mockResponse(path, { status?, body?, delay? })` and `mockNetworkError(path)`
  live in `testsConfig/`, return an `HttpHandler`, and the caller owns
  `server.use()`. `body` is genuinely absent when omitted.

**Table**

- Plain shadcn `<Table>` with server-driven state. **TanStack Table was
  considered and rejected**: its client-side row models would delete most of the
  pitfall surface this repo exists for.

**Testing seams** (in `CONVENTIONS.md`)

1. Query options — `renderHook` + `useQuery`, for fetching behavior.
2. Page component — `render` + role queries, for observable behavior.

Nothing below those two. Error-path tests belong in the page spec.

**Fake timers** — always via `setupFakeTimerUser()` from
`@/testsConfig/fakeTimers`. Never hand-rolled, never enabled before the initial
render has settled, and never cleaned up by hand. The shim is the canonical
community workaround for [RTL #1197](https://github.com/testing-library/react-testing-library/issues/1197)
(open, no maintainer fix) — permanent, not pending a version bump.

**Dev server is blocked** — deny rules plus a `PreToolUse` hook in
`.claude/settings.json`.

## Roadmap — app surface

- Status filter, sortable headers (header-row off-by-one), row status mutation
  with optimistic update + rollback, delete with `AlertDialog` confirm, row
  detail (portals, duplicate text matching).

A third search param would give the 006 latest-ref decision a real gate — worth
remembering when the status filter lands.

Out of scope: bulk actions, column visibility toggles, CSV export, page-size
selection.

**"Create-employee wizard" was on this out-of-scope list through session 4 and
is now built** — `employee-onboarding/` is that wizard. It was admitted not as
app-surface work but because 011 needed a `huge` tier worth measuring, and a
synthetic tree would have measured the wrong thing. Recorded so a future session
does not read the slice as scope creep, or re-add it to the exclusion list.

## Working preferences

- Direct and critical, no praise or recap. Push back on mistakes with reasons.
- One decision at a time for design discussion; execute scoped implementation
  end-to-end without checkpointing.
- Ask rather than assume when requirements are missing.
- Sonnet executes task files; Opus designs and writes them.
