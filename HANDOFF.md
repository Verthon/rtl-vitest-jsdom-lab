# Handoff — 2026-08-12 (session 2)

Read `AGENTS.md` (why the repo exists) and `CONVENTIONS.md` (how to work in it)
first. This file is where we resume.

## Resume here

**First: review 005.** It is green but unreviewed. Sonnet executed it this
session and hit a genuine tooling wall on the fake-timer scenario; the
investigation is written up in `DEBUG_005_fake_timers.md`. Read that file before
touching any fake-timer test in this repo. Assessment checklist is below.

**Then: 006 or 007**, both written and ready. 007 is independent of everything
and can go first if you want a quick win.

| Task | State |
|---|---|
| `tasks/005-debounced-filter.md` | Executed, green, **needs review** |
| `tasks/006-url-search-param-state.md` | Written, not started. Depends on 005 |
| `tasks/007-home-landing-page.md` | Written, not started. Independent |

**Verification right now:** `npm run test:unit` → 20 tests, 4 files, all pass.
Other three commands not re-run since 005 landed — run all four before review.

```bash
npm run build && npm run test:unit && npm run lint && npm run scan:dead-code
```

Uncommitted: everything since `5643655`.

## Reviewing 005 — the fast path

The feature works. Filter is a server param, debounced 300ms, resets page to 1.
Spot-check these, in order of how likely they are to be wrong:

1. **`DEBUG_005_fake_timers.md` is the main artifact.** Read it first — it
   explains why every fake-timer test in `EmployeesPage.spec.tsx` calls
   `setupFakeTimerUser()` instead of the pattern the task prescribed.

2. **The `jest` shim.** `EmployeesPage.spec.tsx:22-26` stubs a global `jest`
   object so RTL will pump vitest's fake timers. Verified this session against
   `node_modules/@testing-library/react/dist/pure.js:62` — `jestFakeTimersAreEnabled()`
   really does gate on `typeof jest !== 'undefined'`, which vitest never
   satisfies. The diagnosis is correct, the shim is scoped, and `afterEach`
   deletes it. **Open question for you:** does this belong in
   `testsConfig/setup.ts` rather than duplicated per spec file? 006 needs the
   same shim, so it will get copied on the next task unless it moves.

3. **`useDebouncedValue` is a value-debounce built on `useEffect`.** Correct per
   005. Note 006 deletes it and replaces it with `useDebouncedCallback` — that
   is a settled decision in the 006 task file, not a defect here.

4. **Mutation checks were run.** Table at the bottom of the debug log, seven
   mutations, all confirmed reddening. Two honest caveats recorded there: the
   slice-before-filter mutation reddened via a corrupted `total` rather than the
   intended mechanism, and the case-sensitivity mutation required changing the
   test input to `'grace hopper'` to be caught directly. Both are disclosed
   rather than papered over — that is the behavior we want.

5. **Known gap, carried from the task:** empty `q` sent as `''` vs `undefined`
   has no behavioral gate. `EmployeesPage.tsx:32` uses `debouncedQuery ||
   undefined`, which is correct. Nothing would catch a regression.

6. **The flaky delay test is still there** — `shows the loading state until a
   delayed response arrives` still races a real `setTimeout(50)` against a 100ms
   helper delay. 005 explicitly left it alone. Now that the fake-timer pattern
   works, it could be converted. Still open.

## What landed in 005

- `mocks.ts` — handler reads `q`, filters by case-insensitive substring on
  `name`, **then** paginates. `total` is the filtered count.
- `api.ts` — `employeesQueryOptions(page, q?)`, key `['employees', page, q]`.
- `useDebouncedValue.ts` — new, generic, no spec file (below both seams, by
  design).
- `EmployeesPage.tsx` — labelled `Input`, `rawQuery` state, debounced value into
  the query, `setPage(1)` in the same `onChange`.
- `EmployeesPage.spec.tsx` — five new scenarios; `input.tsx` + `label.tsx` added
  from shadcn.

## The fake-timer finding, in one paragraph

Every `userEvent` call routes through RTL's `asyncWrapper`, which drains the
microtask queue with an internal `setTimeout(resolve, 0)` and only advances that
timer when it detects Jest. Under `vi.useFakeTimers()` in vitest, that timer is
faked and nothing advances it, so **every `user.type()` / `user.click()` hangs
forever** — regardless of `delay`, `advanceTimers`, or `act`. Workaround is a
stubbed `globalThis.jest.advanceTimersByTime`. Dead ends already ruled out (do
not retry): `delay: null`, async-wrapped `advanceTimers`, narrowing `toFake`,
`MessageChannel` polyfills, and enabling fake timers before the initial render.

This is a strong candidate for `TESTING_PITFALLS.md` — it is common, invisible,
and not linter-detectable. The debug log deliberately does not distill it; that
is a separate decision.

## Open — needs your call

1. **Was upstream ever checked?** `DEBUG_005_fake_timers.md` derives the root
   cause entirely from reading `node_modules` source. Nowhere does it mention
   searching GitHub issues on `testing-library/react-testing-library`,
   `testing-library/user-event`, `vitest-dev/vitest`, or `capricorn86/happy-dom`
   — and this is a years-old, widely-hit incompatibility, so there is almost
   certainly an open issue, a documented workaround, or a maintainer position on
   it. The agent reverse-engineered from scratch what may be written down.

   Worth knowing:
   - Is there a canonical workaround? Ours (`globalThis.jest` stub) is
     plausible but invented. A `vitest.setup` recipe or a maintainer-blessed
     shim would beat it.
   - Is a fix landing? RTL is at **16.3.2, which is latest** — no version bump
     rescues us. If the fix is gated on RTL dropping the Jest coupling, we hold
     the shim indefinitely and should say so in a comment.
   - Does `@testing-library/dom`'s `asyncWrapper` config offer a supported
     override, making the global stub unnecessary?

   **The general lesson matters more than the answer.** Source-diving is a
   legitimate and impressive fallback, but it should be the *second* move. Doing
   it first cost most of a session on a problem that thousands of vitest+RTL
   users have hit. Whatever the review concludes, this belongs in the working
   preferences: check upstream before reverse-engineering `node_modules`.

2. **How do we make that check LLM-friendly and efficient?** Open question, not
   yet designed. The failure above is structural, not a lapse of judgment: the
   agent had no cheap, reliable way to search issue trackers, so it did what it
   could do. Worth deciding what "check upstream first" concretely means here.

   Things to weigh:
   - **What is actually available?** Checked this session: **`gh` is not
     installed** (`gh not found`), so `gh search issues --json` — the cheapest
     structured option — is not on the table without installing it.
     `WebSearch`/`WebFetch` do exist in this harness and were not used. So the
     question splits: install `gh` and make issue search a first-class move, or
     build the habit around web search alone?
   - **Cost.** Issue threads are long, noisy, and mostly "+1". Naive fetching
     burns context fast. `gh search issues --json` with field selection returns
     structured, cheap results; fetching a rendered HTML issue page does not.
     This is the main argument for installing `gh`.
   - **Trust.** A stale StackOverflow answer or a closed-but-not-released fix
     can send an agent down a worse path than reading source. Any recipe needs a
     rule for *when to stop trusting search and go read the code* — the reverse
     of the mistake made here.
   - **Where it lives.** A `CONVENTIONS.md` line, a step in each task file, or
     part of the project-local testing skill (item 8). Probably the skill, since
     it is a general debugging discipline rather than a testing rule.
   - **State of the art.** Genuinely unclear, and worth 20 minutes of research
     rather than a guess. Sub-questions: do the relevant projects expose
     LLM-readable docs (`llms.txt`, `.md` endpoints) the way react-router and
     nuqs do? Is there tooling that summarizes an issue thread to its resolution
     instead of dumping it? Does an MCP server for GitHub issues change the cost
     profile enough to matter?

3. **Where does the `jest` shim live?** Per-spec helper (today) or
   `testsConfig/setup.ts`. 006 will need it too. Note this question partly
   depends on #1 — if upstream documents a supported `asyncWrapper` override,
   the shim may not be the right shape at all.
4. **Does the fake-timer finding become a pitfall entry?** See above.
5. **Flaky delay test** — convert to fake timers now that the pattern works, or
   leave.
6. **Knip baseline is dirty.** `src/components/ui/dialog.tsx` unused plus
   vendored exports. "scan:dead-code passes" still means nothing to a future
   agent. Either ignore `components/ui/` in `knip.ts` or prune. 007 shrinks this
   slightly by deleting scaffold assets.
7. **Duplicated drafts.** Several `DRAFT_FE_TESTING_* copy.md` and `copy 2.md`
   in the repo root. Confirm accidental before any distillation reads them as
   distinct sources.
8. **The project-local testing skill.** Still the real deliverable per
   `AGENTS.md`. Blocked on distilling `DRAFT_FE_TESTING_*.md`. The vendored
   `.agents/skills/tdd` is generic and backend-shaped.

## Tasks 006 and 007 — decisions already locked

Both were designed this session with decisions settled up front rather than left
to the executing agent. Do not reopen these inside the task; they have rationale
written into the task files.

**006 — URL search-param state**

- `useSearchParams` from react-router 8. **nuqs was considered and rejected**:
  its typed parsers and defaults remove exactly the `string | null` parsing and
  update-batching problems 006 exists to demonstrate. React Router 8 gives *no*
  type safety for search params — its typegen covers route params and loader
  data only.
- Write path is **debounced `onChange`, not a `useEffect`**. No mount write, no
  first-render guard.
- `useDebouncedValue` → `useDebouncedCallback` (with unmount cancel). The old
  hook is deleted; an unused export fails knip.
- Bad params are parsed/clamped, URL never rewritten. `?page=99` reaches the
  empty state — this resolves the long-standing "empty-state code is dead" item.
- Both params written in **one** `setSearchParams` call. react-router does not
  queue them; two calls in a tick lose the first. That is the sharpest pitfall
  in the task.
- Back/forward tests **out of scope**, so push-vs-replace is unenforced. Flagged
  in the task as a decision with no gate.

**007 — home landing page**

- Replaces the Vite scaffold with a card grid, one card per capability, linking
  to `/employees`. Needs `npx shadcn@latest add card`.
- `Link`, never `<a href>`. The mutation that matters: a `<div onClick>` still
  navigates in a browser but has no `link` role.
- Copy strings are pinned in the task so the spec cannot drift from the page.
- Deletes `src/assets/{hero.png,react.svg,vite.svg}` and `public/icons.svg` —
  verified this session that `HomePage.tsx` is the sole consumer. Keeps
  `favicon.svg` (referenced by `index.html`; knip does not scan `public/`).

## Method — binding

**Tests are mutation-checked, not trusted for being green.** Break the code each
test covers, confirm it fails, revert. This has caught real problems every time
it has been run.

**"Setup-only" is retired.** 002 and 003 were stamped *write no new spec files*,
so the only gate was "compiles and lints" — which passed on three defects.

**Tasks state decisions, not menus.** 003 offered "dim or disable",
"aria-disabled or `<button disabled>`", "decide and implement one behavior". Free
choice plus no behavioral gate makes whatever the agent picks unfalsifiable —
and one offered option was the bug the next sentence warned against. 005/006/007
lock their choices with rationale.

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

**Dev server is blocked** — deny rules plus a `PreToolUse` hook in
`.claude/settings.json`.

## Roadmap after 006/007

- Status filter, sortable headers (header-row off-by-one), row status mutation
  with optimistic update + rollback, delete with `AlertDialog` confirm, row
  detail (portals, duplicate text matching).

Out of scope: create-employee wizard, bulk actions, column visibility toggles,
CSV export, page-size selection.

## Working preferences

- Direct and critical, no praise or recap. Push back on mistakes with reasons.
- One decision at a time for design discussion; execute scoped implementation
  end-to-end without checkpointing.
- Ask rather than assume when requirements are missing.
- Sonnet executes task files; Opus designs and writes them.
