# Handoff — 2026-08-16 (session 4)

Read `AGENTS.md` (why the repo exists) and `CONVENTIONS.md` (how to work in it)
first. This file is where we resume.

## Session 4 — reconciliation, not new design

Opened by resuming from session 2/3's handoff. Two things had gone stale since
session 3 wrote it, both resolved this session:

1. **The mutation warning at the old top of this file was already false.**
   `EmployeesPage.tsx` was clean, correctly guarded, committed — 006 and its
   negative-page-param follow-up (`tasks/010`, since deleted) had landed and
   been committed between sessions, outside this document. `npx vitest run src`
   is **28 passed / 5 files** (not 27 — 010 added one). Full run is **118
   passed / 8 files**. Confirmed by reading the file and `git log`, not assumed.
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
already staged in the working tree from an uncommitted prior session and is
now committed separately, per *Method*'s workstream-separation rule.

## Resume here

**Everything through 006 / 008 / 009 / 010 is done, verified, and committed.**
The open front is test altitude — `014` → `012` → `011` → `013`, in that
order. `013` is still blocked on one decision (framing: coverage vs. mocking
vs. naming) that only the maintainer can make; see *Session 3 — test
altitude*.

**`014` is new this session, split out of `012`.** The user had already
installed `@stepperize/react` for the onboarding wizard's stepper. That
library owns step state internally by default, which collides with `012`'s
requirement that the URL be the source of truth for the current step (the
`006`/003 lesson — internal state can drift from the URL while tests stay
green). The library supports URL-controlled mode natively
(`useStepper({ step, onStepChange })`), so the fix is real, not a workaround —
but wiring it, plus the `TestAppProviders` routing extension it needs
(`useParams()` requires actual route matching; no spec in this repo has ever
done that), is risky enough and novel enough to deserve its own isolated test
seam rather than being buried under ten onboarding step components. `012` was
edited to depend on `014`'s output instead of building the routing plumbing
itself.

| Task | State |
|---|---|
| `tasks/014-stepper-primitive.md` | **Ready, unexecuted. Run first.** Split out of 012: URL-synced `@stepperize/react` wrapper + `TestAppProviders` `routes` extension, isolated behind its own fixture-based test seam |
| `tasks/012-employee-onboarding-slice.md` | **Ready, unexecuted. Depends on 014.** Ships a real 10-step onboarding slice as 011's `huge` tier |
| `tasks/011-test-speed-cost-model.md` | **Ready, unexecuted. Depends on 012.** Lab task: measures where RTL test time actually goes |
| `tasks/013-test-altitude-skill.md` | **NOT ready — one open decision.** The skill itself. See *Session 3* below |
| `tasks/005-debounced-filter.md` | Executed, reviewed, accepted. Kept only because 006 step 8 refers to it |
| `tasks/007-home-landing-page.md` | Ready. Audited and patched. Independent |

Completed task files get deleted — git holds the history, and whatever outlives
the task belongs here or in the skill itself. 008, 009, 010 are gone this way.

## Parallel workstream — resolved in session 4

Was: the user working with another agent on
`.agents/skills/assertion-precision/SKILL.md` to bring it in line with skill
authoring best practices and give it a proper eval, overlapping `tasks/009`.

**Resolved.** That workstream shipped: the skill is now `SKILL.md` plus three
sub-files, committed at `57c2184` / `12c77cb`. `tasks/009` was read against the
new shape, found unexecutable as written (both hard gates assume one file), and
deleted rather than rewritten — the user's call, since the packaging question
009 existed partly to answer is now moot. No eval exists for the skill; that is
open work if wanted, not something this session produced.

## Verification state — measured this session

Run on the working tree with 006 applied, **before** the stray mutation:

| Gate | Result |
|---|---|
| `npm run build` | passes |
| `npx vitest run src` | **27 passed / 5 files** (was 20) |
| `npx oxlint` | **14 warnings** (was 8) — see below |
| `npm run scan:dead-code` | **unchanged at baseline**: 1 file / 13 exports / 1 type |

```bash
npm run build && npx vitest run src && npx oxlint && npm run scan:dead-code
```

**The oxlint baseline moved, 8 → 14, and 006 did not flag it.** All six new
warnings are `testing-library(no-test-id-queries)` in `EmployeesPage.spec.tsx`
(lines 124, 129, 184, 286, 287, 296), every one of them reading the
`LocationProbe`. That probe is prescribed by 006 step 4 verbatim, so the warnings
are a direct consequence of the task's own design, not sloppiness — but the
number a future agent diffs against is now **14**, and anyone still comparing to
8 will read six expected warnings as a regression.

Worth a decision next session: the probe could expose the search string through a
role-bearing element instead of `data-testid`, which would drop all six. That is
a real change to 006's prescribed pattern, so it needs your call rather than a
silent edit.

> **Gate note.** App tasks gate on `npx vitest run src`, because `lab/` shares
> the vitest include glob and is edited interactively — a red `lab/` spec is not
> evidence an app task broke something. Skill/lab tasks gate on the full run,
> because `lab/` *is* their deliverable. 008 used the full run. **The full run was
> not re-measured this session** — the last known figure is 109/109 across 8
> files, from the close of session 1.

**Uncommitted — now two workstreams, which is the thing to be careful about:**

| File | Workstream | Why |
|---|---|---|
| `.agents/skills/assertion-precision/` (new) | 008 | The skill. 120 lines |
| `lab/assertion-precision/lint-coverage.spec.ts` | 008 | DOM boundary pinned. 9→41 tests |
| `lab/assertion-precision/assertion-precision.spec.ts` | 008 | 11 new DOM probes. 32→43 tests |
| `lab/assertion-precision/MATRIX.md` | 008 | New DOM table; score corrected |
| `TESTING_PITFALLS.md` | 008 | `ASSERTION_PRECISION` points at the skill |
| `DRAFT_FE_TESTING_ASSERTION_PRECISION.md` | 008 | Falsified `toHaveLength` claim fixed |
| `tsconfig.lab.json` | 008 | `DOM` lib + jest-dom types |
| `.oxlintrc.json` | 008 | The 27 `testing-library/*` rules |
| `src/employee-directory/EmployeesPage.tsx` | **006** | URL state. **Currently mutated — see the top of this file** |
| `src/employee-directory/EmployeesPage.spec.tsx` | **006** | 7 new scenarios, +112 lines |
| `src/employee-directory/useDebouncedCallback.ts` (new) | **006** | Replaces the value-debounce |
| `src/employee-directory/useDebouncedValue.ts` (deleted) | **006** | Correctly gone; knip confirms no orphan |
| `tasks/009-assertion-precision-eval.md` (new) | 009 | The eval task |

**The revert hazard is back, in a new form.** Session 1 could say "the tree is
one workstream, `git checkout` is safe". That is **no longer true** — 006 and 008
are both uncommitted and interleaved. A blanket `git checkout` now destroys
Sonnet's 006 work. Committing 008 and 006 as separate commits would end this
hazard permanently and is the cheapest thing you can do next session.

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

Renumbered in session 4; items resolved since session 2 are marked and kept
only long enough to record how they closed. Do not cross-reference by number
across sessions — per *Method*, state the substance, not the ordinal.

**Resolved since session 2, confirmed this session by reading current state:**

- 006's owed mutation checks, the oxlint baseline move, and the push/replace +
  stale-closure decisions — 006 and its follow-up (`tasks/010`, since deleted)
  are committed. `LocationProbe` no longer uses `data-testid` — oxlint is
  clean at **0 warnings**, not 8 or 14.
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
2. **Knip baseline still dirty** — 1 unused file (`dialog.tsx`), 13 unused
   exports, 1 unused type, re-measured this session and unchanged from
   session 2's figure. Until deliberately triaged, "scan:dead-code passes"
   means nothing to a future agent without diffing the export list by hand.
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
   nothing blocks starting it except priority against 011/012/013.

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

The standing defence of leaf tests is CI time. 011 measures where RTL test time
actually goes; 012 ships the subject it measures against (a real 10-step
onboarding slice, because a synthetic 10k-node table measures uniform trees and
real slowness comes from role variety, state, and routing). Design B was chosen
deliberately: tiers are real components, so **size and kind move together and no
cross-tier ratio is a claim about tree size** — 011 carries that confound as a
gate on `COSTS.md`.

**If 011 finds the objection substantially correct, 013's argument changes
shape.** That is a live outcome, not a formality.

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

## `lab/` — the measurement workstream

In the vitest include glob (`lab/**/*.spec.ts`), which is why the full run
reports far more than `src`'s 20 tests. Now 87 tests across 3 files.

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

## Roadmap after 006/007

- Status filter, sortable headers (header-row off-by-one), row status mutation
  with optimistic update + rollback, delete with `AlertDialog` confirm, row
  detail (portals, duplicate text matching).

A third search param would give the 006 latest-ref decision a real gate — worth
remembering when the status filter lands.

Out of scope: create-employee wizard, bulk actions, column visibility toggles,
CSV export, page-size selection.

## Working preferences

- Direct and critical, no praise or recap. Push back on mistakes with reasons.
- One decision at a time for design discussion; execute scoped implementation
  end-to-end without checkpointing.
- Ask rather than assume when requirements are missing.
- Sonnet executes task files; Opus designs and writes them.
