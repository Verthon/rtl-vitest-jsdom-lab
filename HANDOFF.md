# Handoff — 2026-08-14 (session 2)

Read `AGENTS.md` (why the repo exists) and `CONVENTIONS.md` (how to work in it)
first. This file is where we resume.

## ⚠️ Do this before anything else

**`src/employee-directory/EmployeesPage.tsx` is left in a MUTATED state.** I was
mutation-checking 006 and the session ended mid-check with the restore
un-run. Line 30 currently reads:

```ts
const page = rawPage || 1          // MUTATION — the non-numeric guard is gone
```

and must read:

```ts
const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1
```

Fix that one line by hand. **Do not `git checkout` the file** — every other
change in it is Sonnet's 006 work and is uncommitted, so a checkout throws the
task away. There was a pristine copy in a session scratchpad; that directory is
session-scoped and should be assumed gone.

Then confirm `npx vitest run src` is back to **27 passed**. If the count differs,
something else moved — investigate before continuing.

The lesson, which is now a rule in *Method*: a mutation check must restore in the
same tool call that mutates, not a later one.

## Resume here

**006 is executed by Sonnet and partially verified. Verification is the first
real work item.** Then `tasks/009` (the eval). The packaging redesign comes after
009 and only after it, for the reason in *Open*.

| Task | State |
|---|---|
| `tasks/005-debounced-filter.md` | Executed, reviewed, accepted. Kept only because 006 step 8 refers to it |
| `tasks/006-url-search-param-state.md` | **Executed by Sonnet, verification incomplete.** See *006 — what was checked* below. Do not delete the file until verification closes |
| `tasks/007-home-landing-page.md` | Ready. Audited and patched. Independent |
| ~~`tasks/008`~~ | **Executed 2026-08-14, file deleted.** What survives is in this document |
| `tasks/009-assertion-precision-eval.md` | **Ready, unexecuted.** Review-only eval for the skill. Scope decided: pinned fixtures + `evals.json`, no generation cases, no automated scorer. Forbids editing the skill so the baseline stays honest. **May be superseded — see the parallel skill workstream below** |

Completed task files get deleted — git holds the history, and whatever outlives
the task belongs here or in the skill itself. 008 was the first to go.

## Parallel workstream — the skill is being reworked elsewhere

The user is working with **another agent** on
`.agents/skills/assertion-precision/SKILL.md`, to bring it in line with skill
authoring best practices and to give it a proper eval.

**This overlaps `tasks/009` directly, and 009 has not started.** Before executing
009, find out what that workstream produced — it may have already built the eval,
or changed the skill's shape enough that 009's case list no longer matches. Two
specific collision points:

- 009 forbids editing the skill, so its baseline measures the skill *as of
  `e0e4297`*. If the other agent has rewritten it, that baseline is measuring a
  file that no longer exists and 009 needs re-scoping, not executing.
- 009's packaging question (split into sub-skills vs. leave whole) is exactly
  what a best-practices pass would touch. If that call has already been made
  elsewhere, 009's step 6 is answering a settled question.

Do not execute 009 on the assumption it is still current. Reconcile first.

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

1. **Finish verifying 006.** First, because a mutated file is sitting in the tree
   and because everything else is downstream of a clean baseline. The owed
   mutation checks are listed in *006 — what was checked*. Two loose ends beyond
   the mutations: the oxlint baseline moving 8 → 14 (decide whether the
   `LocationProbe` should stop using `data-testid`), and the push-vs-replace and
   stale-closure decisions that 006 explicitly shipped **without gates** — both
   still rest on review alone, and 006 says so in its Decisions section.

2. **Reconcile the skill rework with `tasks/009`.** The user is working with
   another agent on the skill's best-practices pass and its eval. 009 was written
   against the `e0e4297` skill and forbids editing it. Read what the other
   workstream produced *before* touching 009; do not execute it on the assumption
   it is still current. Details in *Parallel workstream* above.

3. **Write the eval.** Scoped as `tasks/009` — read that, not this paragraph, for
   the design, and read item 2 before starting it. Two calls made while writing
   it, recorded because they narrow the vendored precedent:

   - **Review-only.** `.agents/skills/shadcn/evals/evals.json` is a *generation*
     eval: a prompt, no input files, prose expectations about what an agent
     writes. Our skill is used mostly to review existing specs, and step 6's
     seeded/overlap runs were review runs. The authoring half of the skill's
     `description` is therefore unmeasured — a later task, not a 009 stretch goal.
   - **The precedent is prose-only and nothing runs it.** That is the weakest
     form under this repo's *measured, not remembered* rule, so 009 adds real
     fixture files and a spec that pins them — line numbers, and proof that every
     seeded defect sits on the uncaught side of the oxlint boundary. Grading an
     agent's findings is still a hand read; an API-invoking scorer was rejected
     as its own project.

   Fixtures are `.fixture.ts`, never `.spec.ts` — `lab/**/*.spec.ts` is in the
   vitest include glob, so a fixture named that way gets *executed* by the suite
   it is supposed to be an inert input to.

4. **Sub-skills / progressive disclosure — proposed, and I pushed back.** Likely
   in scope for the parallel rework, so this may be decided elsewhere before it is
   decided here. The concern is real: an agent reviewing 2 tests with 2 mistakes
   loads all 120 lines. My argument against splitting *as described*, recorded so
   it can be overruled with evidence rather than re-litigated:

   - 120 lines ≈ 1.5k tokens. A router that describes 5 moves well enough to
     choose between them is ~30 lines, so the saving is smaller than it looks,
     and it buys a second file read plus a routing decision.
   - **The moves are not independent.** One assertion often trips Move 1 (where
     did the boolean come from) *and* Move 3 (does it pass on broken data). The
     "2 mistakes → 1 leaf" assumption is the load-bearing one, and it is exactly
     what the eval can measure.
   - The only clean seam in the current file is **Move 4, which is DOM-only**
     (~18 lines). Moves 1–3 apply to every spec. Carving out 18 lines behind a
     router is not worth it.

   **The bigger context win is probably a cheaper trigger, not a split** — the
   real waste is loading this at all on a spec with no assertion problems. That
   is a `description` frontmatter question, and the eval can measure it directly
   by including specs that should produce zero findings.

   Decide after the eval reports. If it shows single-move invocations dominate,
   the split is justified and I am wrong.

5. **Commit 006 and 008 separately.** Cheapest way to end the revert hazard the
   interleaved tree has reintroduced. Nothing blocks it once 006 verification
   closes.
6. **008 has had no review pass.** It was executed by the same agent that wrote
   it, which is the weakest possible review position. 005 got a two-finding
   review that caught a vacuous assertion; 008 has had nothing equivalent. The
   parallel rework may absorb this.
7. **Knip baseline is still dirty** — `src/components/ui/dialog.tsx` unused plus
   vendored exports. Until settled, "scan:dead-code passes" means nothing to a
   future agent without diffing by hand. 007 shrinks it slightly.
8. **Duplicated drafts.** All 12 `* copy*.md` files are byte-identical to their
   base and tracked in git. Safe to `git rm`; say the word. A glob over
   `DRAFT_FE_TESTING_*.md` returns 25 files, 12 of them dupes.
9. **Does the fake-timer finding become a `TESTING_PITFALLS.md` entry?** With the
   upstream links it is a documented ecosystem gap, not a local war story.
10. **Flaky delay test** — `shows the loading state until a delayed response
    arrives` still races a real `setTimeout(50)` against a 100ms helper delay.
    Survived 006 unchanged; still at spec lines 315–329.
11. **Next skill after this one: `TEST_THAT_CANNOT_FAIL`** — three worked examples
    in-repo, and its verification move is already binding method here. Do not
    start it until the packaging question settles, or it will be built in the
    wrong shape too.

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
