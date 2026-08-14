# Handoff — 2026-08-14

Read `AGENTS.md` (why the repo exists) and `CONVENTIONS.md` (how to work in it)
first. This file is where we resume.

## Resume here

**008 is executed. The first skill exists.** The next session's work is the two
items in *Open* — the eval, then the packaging redesign — in that order, for the
reason given there.

| Task | State |
|---|---|
| `tasks/005-debounced-filter.md` | Executed, reviewed, accepted. Kept only because 006 step 8 refers to it |
| `tasks/006-url-search-param-state.md` | Ready. Audited and patched. Depends on 005 |
| `tasks/007-home-landing-page.md` | Ready. Audited and patched. Independent |
| ~~`tasks/008`~~ | **Executed 2026-08-14, file deleted.** What survives is in this document |

Completed task files get deleted — git holds the history, and whatever outlives
the task belongs here or in the skill itself. 008 was the first to go.

**Verification at close of session:** build passes, `npx vitest run` is 109/109
across 8 files, `npx oxlint` exits 0 at its 8-warning baseline, knip unchanged
at 1 file / 13 exports / 1 type.

```bash
npm run build && npx vitest run && npx oxlint && npm run scan:dead-code
```

> **Gate note.** App tasks gate on `npx vitest run src`, because `lab/` shares
> the vitest include glob and is edited interactively — a red `lab/` spec is not
> evidence an app task broke something. Skill/lab tasks gate on the full run,
> because `lab/` *is* their deliverable. 008 used the full run.

**Uncommitted — one coherent workstream this time (008), plus the 27 lint rules:**

| File | Why |
|---|---|
| `.agents/skills/assertion-precision/` (new) | The skill. 120 lines |
| `lab/assertions/lint-coverage.spec.ts` | DOM boundary pinned. 9→41 tests |
| `lab/assertions/assertion-precision.spec.ts` | 11 new DOM probes. 32→43 tests |
| `lab/assertions/MATRIX.md` | New DOM table; score corrected |
| `TESTING_PITFALLS.md` | `ASSERTION_PRECISION` points at the skill |
| `DRAFT_FE_TESTING_ASSERTION_PRECISION.md` | Falsified `toHaveLength` claim fixed |
| `tsconfig.lab.json` | `DOM` lib + jest-dom types — see the caveat below |
| `.oxlintrc.json` | The 27 `testing-library/*` rules, from the previous session |

The earlier revert hazard is **dead** — `2bb600f` and `5900872` committed the
fake-timer shim and the `lab/` scaffolding. The tree is one workstream now, so
`git checkout` is no longer the trap it was.

## What happened this session — 008 executed

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
`lab/assertions/_scratch-probe.spec.ts` was left alone as instructed, with its
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

## Open — needs your call

**These two are the next session, and the order is not arbitrary.**

1. **Write the eval. Do this first.** Agreed as required. There is a vendored
   precedent to follow rather than invent: `.agents/skills/shadcn/evals/evals.json`
   — inspect its shape before designing ours. The eval matters beyond scoring the
   skill: **it is the only way to falsify item 2.** Without it, a packaging
   redesign trades measured detection for a guess.

   The seeded/overlap runs from step 6 are the obvious first cases — they are
   already worked, and one of them is a known miss-turned-fix.

2. **Sub-skills / progressive disclosure — proposed, and I pushed back.** The
   concern is real: an agent reviewing 2 tests with 2 mistakes loads all 120
   lines. My argument against splitting *as described*, recorded so it can be
   overruled with evidence rather than re-litigated:

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

3. **008 has had no review pass.** It was executed by the same agent that wrote
   it, which is the weakest possible review position. 005 got a two-finding
   review that caught a vacuous assertion; 008 has had nothing equivalent.
4. **Knip baseline is still dirty** — `src/components/ui/dialog.tsx` unused plus
   vendored exports. Until settled, "scan:dead-code passes" means nothing to a
   future agent without diffing by hand. 007 shrinks it slightly.
5. **Duplicated drafts.** All 12 `* copy*.md` files are byte-identical to their
   base and tracked in git. Safe to `git rm`; say the word. A glob over
   `DRAFT_FE_TESTING_*.md` returns 25 files, 12 of them dupes.
6. **Does the fake-timer finding become a `TESTING_PITFALLS.md` entry?** With the
   upstream links it is a documented ecosystem gap, not a local war story.
7. **Flaky delay test** — `shows the loading state until a delayed response
   arrives` still races a real `setTimeout(50)` against a 100ms helper delay.
8. **Next skill after this one: `TEST_THAT_CANNOT_FAIL`** — three worked examples
   in-repo, and its verification move is already binding method here. Do not
   start it until the eval settles the packaging question, or it will be built in
   the wrong shape too.

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
