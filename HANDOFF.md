# Handoff — 2026-08-13

Read `AGENTS.md` (why the repo exists) and `CONVENTIONS.md` (how to work in it)
first. This file is where we resume.

## Resume here

**005 is reviewed, accepted, and its two review findings are applied.** Nothing
blocks 006 or 007 — both were audited and patched, and both are ready for
Sonnet. 007 is independent and is the quicker win.

| Task | State |
|---|---|
| `tasks/005-debounced-filter.md` | Executed, reviewed, accepted. Both review findings applied |
| `tasks/006-url-search-param-state.md` | Ready. Audited and patched. Depends on 005 |
| `tasks/007-home-landing-page.md` | Ready. Audited and patched. Independent |
| `tasks/008-assertion-precision-skill.md` | Yours, written in parallel. **Not audited by me** — do not assume it got the 006/007 treatment |

**Verification at close of session:** `src` is 20/20 green, the full
`test:unit` is 70/70 across 6 files, build and lint pass, and knip reports its
long-standing baseline unchanged — one unused file
(`src/components/ui/dialog.tsx`) plus the vendored exports.

```bash
npm run build && npx vitest run src && npm run lint && npm run scan:dead-code
```

> **Gate on `npx vitest run src`, not `npm run test:unit`.** `test:unit` also
> picks up `lab/**` through the `vite.config.ts` glob, and `lab/` is a
> diagnostics workstream edited interactively — scratch specs appear, fail or
> time out, and get deleted again within minutes. It happened during this
> session: a `_scratch-` probe went red for a few minutes (30 sequential oxlint
> spawns at ~213ms against a 5000ms default — arithmetic, not a hang) and was
> gone by the end.
>
> The hazard is not the red itself, it is what an executor does about it. A
> failing `lab/` spec is never yours to fix as part of an app task, and a red
> `test:unit` is not evidence you broke something. Both `lab/` files and `src`
> files can be green at any given moment; only `src` is a signal.

**Uncommitted — three independent workstreams, nothing committed this session:**

| Workstream | Files |
|---|---|
| Fake-timer shim + 005 strengthening | `src/testsConfig/fakeTimers.ts` (new), `src/testsConfig/setup.ts`, `src/employee-directory/EmployeesPage.spec.tsx` |
| `lab/` diagnostics | `lab/` (new), `tsconfig.lab.json` (new), `tsconfig.json`, `vite.config.ts`, `AGENTS.md` |
| Docs and tasks | `HANDOFF.md`, `tasks/006`, `tasks/007`, `tasks/008` (new) |

> **Hazard while the tree stays dirty.** 006 step 9 tells you to break the code,
> confirm the test reddens, then revert. **Do not revert with `git checkout` or
> `git restore`** — three unrelated workstreams are uncommitted here and those
> commands would silently destroy them. Undo mutations by hand, or copy the file
> aside first (that is how this session's two mutation checks were run). This
> note dies the moment the tree is committed.

Note `e6cc293` is mislabelled *"employee-directory url based pagination"*. It is
005, the debounced filter. 006 is the URL work and has not started.

## What happened this session

*Two working sessions on the same day. This first block is the later one, which
was a short blocker-clearing pass; everything below it is the earlier design and
audit work.*

**Both 005 review findings were applied and mutation-checked** — see the section
below, which now records the evidence rather than the proposal.

**The test gate moved from `npm run test:unit` to `npx vitest run src`**, in
006's and 007's *Done* sections and in this file. `lab/` shares the vitest
include glob and is edited interactively, so `test:unit` is red at arbitrary
times for reasons unrelated to any app task. The risk was not the red itself but
what an executor does about it — the natural move is to "fix" the failing file,
which would mean editing a live diagnostics scratch buffer.

**Numeric cross-references into this file's *Open* list had drifted, repo-wide.**
Both 006 and 007 cited *"open item 3"* for the knip baseline when knip was item
4, and 006 step 6 cited *"open item 1"* for the empty-branch claim — an item that
no longer exists in the list at all. `tasks/005` carries three more (items 1, 2,
3), left alone since it is executed and closed. Fixed in 006/007 by stating the
substance inline instead of pointing at an ordinal. See the new method note.

**Deliberately not done:** committing the working tree — your call, deferred to
open item 1. Consequence recorded as the revert hazard above.

**The fake-timer shim moved and is now documented.**
`src/testsConfig/fakeTimers.ts` exports `setupFakeTimerUser()` and
`restoreRealTimers()`. The JSDoc carries the symptom, the root cause, the three
upstream issue links, and the five confirmed dead ends, so nobody re-runs that
investigation. `restoreRealTimers()` runs in `setup.ts`'s global `afterEach` — a
leaked fake clock fails the *next* test, which is not a hook worth letting a
task forget to copy. `EmployeesPage.spec.tsx` lost its local helper and its
`afterEach`. Also added `.bind(vi)`, which the original was missing.

**Upstream was checked, and the shim survives it.** Two searches and two fetches,
maybe five minutes:

- [RTL #1197](https://github.com/testing-library/react-testing-library/issues/1197)
  — **open**, unresolved. Our root cause exactly, traced upstream to the PR that
  added the microtask drain in RTL 14. No maintainer fix, no plan.
- [vitest #3184](https://github.com/vitest-dev/vitest/issues/3184) — **closed as
  not planned.** Vitest declines ownership. It is where the `globalThis.jest`
  stub circulates.
- [user-event #833](https://github.com/testing-library/user-event/issues/833) —
  the `userEvent.click` timeout symptom.

So: the diagnosis was right, the shim is the canonical community workaround
rather than an invention, and RTL 16.3.2 being latest means **this is permanent,
not pending a version bump.** The one documented alternative,
`configure({ asyncWrapper: cb => cb() })`, is worse — it discards RTL's
act-environment toggling, not just the timer pump.

**The caveated mutation is closed.** A surgical slice-before-filter — slice
first, but keep `total` honest for the unfiltered case — reddens *exactly*
`returns to the first page when the filter changes` (`Showing 1–2 of 2` vs
`Showing 1–10 of 13`) and nothing else. `DEBUG_005_fake_timers.md`'s note that it
only reddened via a corrupted `total` no longer applies.

## 005 review — two findings, applied

Both landed directly in `EmployeesPage.spec.tsx` (test-only, ~10 lines). Both
were mutation-checked **two ways** — the mutation is red under the new version
*and* confirmed green under the old one, which is what proves the fix was
load-bearing rather than merely different.

Rejected: folding them into 006. Step 8 of that task says *"005's page tests
should survive unchanged — if one needs editing, stop and explain why"*, and
that guard is what catches silent behavior drift during the migration. Handing
Sonnet an instruction to edit two 005 tests alongside it would have blunted it.

1. **`filters the table by name` used a fixture that made half its assertion
   vacuous.** Grace Hopper is `mockEmployees[0]` — already row 1 of the
   unfiltered page, so `findRowByName('Grace Hopper')` asserted nothing and a
   **client-side** filter over the fetched page passed it. Now types
   `lynn conway` and looks for `Lynn Conway` (index 26, page 3, unique).

   Mutation: drop `q` from the request and filter `data.data` client-side.
   **Green** under `Grace Hopper`, **red** under `Lynn Conway`. The comment in
   the test says why that name was chosen, so nobody "tidies" it back.

2. **`filter(Boolean)` masked the `q=''` gap.** The MSW listener now registers
   *before* `renderPage()` and the assertion is
   `toStrictEqual([null, 'Grace Hopper'])` — `null` is param-absent, `''` is
   present-but-empty, and keeping the mount request is what distinguishes them.

   Mutation: `employeesQueryOptions(page, debouncedQuery)` — i.e. drop the
   `|| undefined`. Reddens with `expected [ '', 'Grace Hopper' ] to strictly
   equal [ null, 'Grace Hopper' ]`, which names the defect in the failure
   message itself. Verified this assertion still holds under 006: the test
   stays on page 1, so the mount request remains the only extra one.

## 006 and 007 — audit results

Both were read end-to-end against the code this session and patched in place.

**007 had one blocker, now fixed.** Step 2's example test queried
`getByRole('link', { name: /employee directory/i })` while Decisions pinned the
link text to `Open directory` — the prescribed test could not pass a correct
implementation. The task then offered a menu to resolve it, which is the 003
failure mode the method section declares retired. **Pinned:** the `Link` lives
inside the card with visible text `Open directory`, and the spec queries that
exact name. Whole-card-as-link is explicitly ruled out.

Verified while auditing: `App.spec.tsx` never touches `HomePage` (no collateral
damage), and `src/styles/globals.css` has no `.hero` / `.ticks` / `.counter` /
`#center` rules, so the task's "they are dead strings" claim holds.

**006 had two blockers, now fixed.**

1. **Step 7 sent Sonnet straight back into the wall.** It prescribed the raw
   `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` pattern and said
   "re-read 005 step 4" — 005 step 4's snippet is precisely the one that hangs
   for 5000ms with no stack trace. Now points at `setupFakeTimerUser()`, says to
   ignore 005 step 4, and notes cleanup is global.

2. **`useDebouncedCallback` needs a latest-ref, and the task never said so.**
   `setSearchParams` is memoized on `[navigate, searchParams]`
   (`react-router/dist/development/lib/dom/lib.js:760-764`), so a "stable"
   debounced callback capturing it at mount permanently closes over mount-time
   params and computes its "current" URL from first render. Pinned as a
   decision, with the gap declared: **no scenario in 006 catches it.** Step 7's
   assertion is "no `page` key", and a stale base that never had `page`
   satisfies it for the wrong reason. Same status as push-vs-replace.

Also patched: a note that mutating the callback's params object *is* safe
(react-router passes `new URLSearchParams(searchParams)`, `lib/dom/lib.js:761`)
so nobody "fixes" a non-bug; and the two remaining unpinned menus — step 5's
deep-link case is now its own `it`, and the empty-`q` mutation row now names a
concrete assertion instead of "or add an assertion".

**Carried into 006 from the 005 review:** on page 3, the first keystroke fires an
unfiltered page-1 request instantly, because `onChange` calls `setPage(1)` while
`debouncedQuery` still holds the old value. 006 dissolves this — `page` comes
from the URL and has no setter — so it needs no action, but do not be surprised
when a request disappears.

## `lab/` — new workstream, in flight

Not part of 005/006/007 and not mine; landed in parallel. `lab/` is in the vitest
include glob (`lab/**/*.spec.ts`), which is why `test:unit` reports far more than
`src`'s 20 tests — and why it is no longer the gate (see above).

**It is actively being edited, so treat its state as volatile.** At the close of
this session it held two `_scratch-*` probes alongside the settled files, and one
of them was failing. That is expected. The `_scratch-` prefix is worth keeping as
the convention for "in-flight, may be red, not anyone else's to fix".

It mechanizes the admission gate `AGENTS.md` states in prose — *a mistake
belongs here only if it is not mechanically detectable*:

- `lintTestRules(assertions)` writes a synthesized probe spec to a temp dir,
  shells `oxlint` at it with the `vitest` / `jest` / `testing-library` plugins,
  and returns the rule codes that fired. `lint-coverage.spec.ts` then asserts,
  per assertion shape, **which ones the linter already rejects** —
  `prefer-to-have-length`, `prefer-to-contain`, `prefer-comparison-matcher`, and
  so on. That turns "the linter already catches this" from a judgement call into
  a test, and it means the pitfall list can be *proved* disjoint from the lint
  rules rather than asserted to be.
- `failureOf(assertion)` returns the failure message plus inspected
  `actual`/`expected` instead of a boolean. That lets a draft argue about
  **diagnostic quality** — a coarse assertion that fails with a useless message
  is a real pitfall even when it does fail.
- The specimens are built to trip specific traps — a `NaN` total, `0.1 + 3.2`,
  `Set`/`Map`, two `Date`s an hour apart, an empty string, a `null` widened to
  `string`. They live inline in `assertion-precision.spec.ts`, one per `it`, not
  in a shared fixtures module. (An earlier draft of this handoff claimed a
  `lab/assertions/fixtures.ts`; there is no such file.)
- `MATRIX.md` is the readable output: which matcher to reach for per data type,
  and how much of that choice oxlint already enforces, with every row backed by
  one of the two specs. This is the artifact the skill gets distilled from.

Bearing on the testing-skill item below: this is the most concrete progress yet toward
distilling `DRAFT_FE_TESTING_ASSERTION_PRECISION.md` into a skill, since it
supplies the evidence for what the skill should *not* bother saying.

## The skill — evidence-first. Decided.

**A pitfall earns an enforced rule only when this repo holds a mutation-checked
instance of it.** Everything else stays prose in `TESTING_PITFALLS.md` until the
app grows into it. This is the same standard the method section already applies
to tests, extended to the skill: *green is not evidence, and neither is a
well-argued essay.*

**This inverts the pipeline that was assumed until now.** The plan had been to
distill 13 drafts down into rules. Instead, start from the evidence and let it
select which pitfalls get rules first. Two reasons:

1. **The drafts predate the tests.** All 13 were written 2026-08-12, when the
   repo had no app specs. They are generic FE-testing essays structured as
   *problem / mechanism / tell / verification move / questions / who pays*. Only
   the last two sections convert into anything an agent can apply; the rest is
   justification aimed at a human reader.
2. **The repo has since overtaken them.** Three findings now carry mutation
   evidence, and each is a worked instance of a draft that has none:

| Evidence in repo | Draft it proves | Proof |
|---|---|---|
| Grace Hopper was already row 1, so the row assertion could not fail | `TEST_THAT_CANNOT_FAIL`, `FIXTURE_COUPLING` | green under old fixture, red under `Lynn Conway` |
| `filter(Boolean)` discarded the empty-`q` request | `TEST_THAT_CANNOT_FAIL` | red as `[ '', … ]` vs `[ null, … ]` |
| Fake timers hang RTL's `asyncWrapper` | `HIDDEN_ASYNC` | 3 upstream issues, 5 dead ends, `fakeTimers.ts` JSDoc |
| `lab/` proves which coarse assertions oxlint already rejects | `ASSERTION_PRECISION` | `lint-coverage.spec.ts` + `MATRIX.md` |

**First increment, when it starts: `TEST_THAT_CANNOT_FAIL`.** Chosen because it
has three worked examples rather than one, its verification move (*break it on
purpose*) is already binding method here so the skill would be codifying
practice rather than inventing it, and several other pitfalls reduce to it —
fixture coupling and assertion precision are both ways an assertion stops being
able to fail. It also **does not collide with 008**, which has
`ASSERTION_PRECISION`.

Treat the first one as a format prototype: write it, apply it to the existing
`src` specs, and see whether it catches anything the drafts' prose did not. If
the format does not earn its keep on a pitfall this well-evidenced, it will not
on the thinner ones.

## Decided in session 3

1. **Upstream check — declined, deliberately.** Offered and turned down. We keep
   the invented `globalThis.jest` stub without confirming it against the RTL /
   user-event / vitest issue trackers. Consequence, stated plainly: we hold a
   workaround we cannot cite, and if a supported `asyncWrapper` override exists
   we do not know about it. Revisit if the shim ever misbehaves. The *general*
   lesson from old item 1 still stands and is unaffected by this choice: check
   upstream before reverse-engineering `node_modules`.

2. **Shim moved to `testsConfig/setup.ts`.** It now runs in a global
   `beforeEach`, with `vi.useRealTimers()` and the property delete in the global
   `afterEach`. Every spec gets it automatically; no spec file declares it.
   `setupFakeTimerUser()` in `EmployeesPage.spec.tsx` is down to two lines
   (`vi.useFakeTimers()` + `userEvent.setup({ advanceTimers })`).

3. **`filter(Boolean)` fixed** — open item 9 is closed. The assertion is now
   `expect(requests).toStrictEqual(['Grace Hopper'])` against the full list.
   Verified two ways: the array genuinely holds exactly one entry (the listener
   attaches after the initial fetch settles, so no `null` ever arrives), and the
   delay-to-0 mutation still reddens it.

4. **007 runs before 006.** Not a code dependency — 007 deletes scaffold assets
   and shrinks the knip baseline 006 has to diff against.

**Verification after these changes:** build OK, 20/20 tests, `oxlint` exit 0
(five pre-existing warnings), knip unchanged at 1 file / 11 exports / 1 type.

**Note on `npm run lint`:** it exits 2 with `ESLint output (JSON parse failed)`
— that is the RTK proxy wrapper failing to parse oxlint's output, **not** a lint
failure. Run `npx oxlint` directly to get a true result.

## Open — needs your call

1. **Commit the working tree.** Deferred deliberately — the split is yours to
   make. Three independent workstreams are mixed in it: the fake-timer shim
   (`fakeTimers.ts`, `setup.ts`, `EmployeesPage.spec.tsx`), the `lab/` probes
   (`lab/`, `tsconfig.lab.json`, `tsconfig.json`, `vite.config.ts`, `AGENTS.md`),
   and the docs (`HANDOFF.md`, `tasks/006`, `tasks/007`). Until this lands, the
   revert hazard at the top of this file is live.
2. **Does the fake-timer finding become a `TESTING_PITFALLS.md` entry?** Now
   stronger than it was: with the upstream links it is a documented ecosystem
   gap rather than a local war story, which is what that file is for.
3. **Flaky delay test** — `shows the loading state until a delayed response
   arrives` still races a real `setTimeout(50)` against a 100ms helper delay.
   Convertible now that the pattern works, but MSW's `delay` runs on the faked
   clock and needs its own advance. Small follow-up.
4. **Knip baseline is still dirty** — `src/components/ui/dialog.tsx` unused plus
   the vendored exports. Either ignore `components/ui/` in `knip.config.ts` or
   prune. Until this is settled, "scan:dead-code passes" means nothing to a
   future agent, because nobody can tell a new leak from the baseline without
   diffing by hand. 007 shrinks it slightly by deleting scaffold assets.
5. **Duplicated drafts — confirmed accidental, re-verified this session.** All
   12 `* copy*.md` files are still byte-identical to their base (`cmp` on each)
   and tracked in git. Safe to `git rm`; say the word. This now actively blocks
   the skill work: a glob over `DRAFT_FE_TESTING_*.md` returns 25 files, 12 of
   them dupes, and `ASSERTION_PRECISION` appears three times.
6. **`tasks/008` line 193 has a stale `HANDOFF open item 3` reference** — same
   drift described in the method note. Left alone because you were editing the
   file; one line, fix it next time you open it. 008 has had no audit pass from
   me at all.
7. **The project-local testing skill.** Still the real deliverable per
   `AGENTS.md`. **Approach now decided — see *The skill — evidence-first* below.**
   Remaining call is only whether to start the first increment
   (`TEST_THAT_CANNOT_FAIL`) or wait for 008 to land. The vendored
   `.agents/skills/tdd` is generic and backend-shaped.
9. ~~**Fix `filter(Boolean)`**~~ **Closed** — fixed and mutation-verified. See
   "Decided in session 3" item 3.

## Method — binding

**Check upstream before reverse-engineering `node_modules`.** New this session,
and it is a sequencing rule, not a ban on source-diving. 005 derived a correct
root cause entirely from reading RTL's source; the same answer was two web
searches away, already written up by the maintainers of the project that has the
bug. Source-diving is the legitimate *second* move — and the right one the
moment search returns stale or contradictory advice. `gh` is **not installed**,
so `gh search issues --json` is unavailable; `WebSearch` and `WebFetch` both work
and were cheap here (~5 minutes, four calls). Fetch the issue thread, not a
StackOverflow summary of it, and always confirm open/closed state and whether a
fix actually shipped.

**Tests are mutation-checked, not trusted for being green.** Break the code each
test covers, confirm it fails, revert. This has caught real problems every time
it has been run — including twice this session.

**A mutation that reddens the right test for the wrong reason is not a pass.**
Find the surgical version or record honestly that you could not.

**"Setup-only" is retired.** 002 and 003 were stamped *write no new spec files*,
so the only gate was "compiles and lints" — which passed on three defects.

**Tasks state decisions, not menus.** 003 offered "dim or disable", "decide and
implement one behavior". Free choice plus no behavioral gate makes whatever the
agent picks unfalsifiable. 007 had regressed into this and was fixed above —
check new task files for it specifically.

**A decision with no gate must say so in the task.** 006 does this for
push-vs-replace and now for the latest-ref requirement. An agent must never read
a green suite as confirmation of an ungated decision.

**Never cross-reference this file by item number.** New this session. Task files
cited "HANDOFF open item 1" and "open item 3"; the list is reordered every
session, so by the time an executor reads them they pointed at the wrong item or
at one that had been deleted. State the substance inline, or name the item —
"the knip baseline item" — never the ordinal. Three such references survive in
`tasks/005` and are left as-is because it is closed.

**A mutation check is two-way when the fix is a fixture change.** Showing the
mutation reddens the *new* test is half the proof; it must also be shown to stay
**green** under the old one, or you have not demonstrated the change was
load-bearing rather than merely different. Both 005 findings were closed this
way.

**Groundwork steps get labelled.** A red-green task that opens with two
implementation steps contradicts itself unless those steps say "no behavioral
gate of their own — verified by the scenarios that follow".

## Decisions from earlier sessions — still binding

**Architecture**

- Flat VSA. Slices are top-level under `src/`, siblings of infra. No `features/`.
- Slices named by capability, not resource: `employee-directory/`, not
  `employees/`.
- Flat inside a slice until 3+ files of a kind justify a subfolder.
- Slices own their routes as `<feature>Routes: RouteObject[]`; `routing/router.tsx`
  only spreads them.
- Route paths are independent of folder names — `employee-directory/` serving
  `/employees` is intentional.

**Data layer**

- No backend. Every endpoint invented, served by MSW in dev and test.
- MSW handlers compute responses from request params (a fake server). A canned
  handler makes tests that verify the stub instead of the component.
- Fixtures static and deterministic: 47 employees. 47 is deliberate — not
  divisible by 10, so the last page is partial.
- Envelope `{ data, page, perPage, total }` as `Paginated<T>`, in the slice until
  a second slice needs it.
- `mockResponse(path, { status?, body?, delay? })` and `mockNetworkError(path)`
  live in `testsConfig/`, return an `HttpHandler`, and the caller owns
  `server.use()`. `body` is genuinely absent when omitted — otherwise every error
  path looks like a well-behaved JSON API.

**Table**

- Plain shadcn `<Table>` with server-driven state. **TanStack Table was
  considered and rejected**: its client-side row models would delete most of the
  pitfall surface this repo exists for.

**Testing seams** (in `CONVENTIONS.md`)

1. Query options — `renderHook` + `useQuery`, for fetching behavior.
2. Page component — `render` + role queries, for observable behavior.

Nothing below those two. Error-path tests belong in the page spec, not a separate
error spec file — same seam, one file.

**Fake timers** — always via `setupFakeTimerUser()` from
`@/testsConfig/fakeTimers`. Never hand-rolled, never enabled before the initial
render has settled, and never cleaned up by hand.

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
