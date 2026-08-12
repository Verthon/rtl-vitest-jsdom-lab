# Handoff — 2026-08-12

Read `AGENTS.md` (why the repo exists) and `CONVENTIONS.md` (how to work in it)
first. This file is where we resume.

## Resume here

**Next task: 005 — debounced filter. It is not written yet.**

Three decisions must be settled before it can be handed to an executing agent.
Do not let an agent resolve these itself — that is what produced the 003 defects:

1. **Debounce delay** — a specific number, and does the component own the timer
   or a hook?
2. **Filter scope** — client-side over the current page, or a server param that
   resets pagination? The second is the interesting one and partly overlaps 006.
3. **Task format** — red-green loop per scenario, or scenarios up front and
   implementation after (what we did for 003)?

005 has the highest pitfall density in the repo: `userEvent` v14's internal delay
collides with `vi.useFakeTimers()` unless `advanceTimers` is passed. Write it
carefully.

## State

**Done:** 001, 002, 003, 004. Task files deleted after completion; 002 and 003
are recoverable at `git show a4f5331:tasks/003-server-pagination.md`. **004's
final content was never committed** — its decisions are transcribed below because
the file is gone.

**Verification:** all four commands pass. 15 tests, 4 files.

```bash
npm run build && npm run test:unit && npm run lint && npm run scan:dead-code
```

Uncommitted: everything since `5643655`.

## What 003 and 004 actually landed

003 was executed by Sonnet and shipped three defects that all four commands
passed. Fixed this session:

- Previous/Next used `aria-disabled` on a live anchor plus an `onClick` guard —
  a control that looks disabled but still works. This is precisely the bug the
  task warned about, and the task's own wording permitted it. Now a real
  `<button disabled>`, which required editing vendored
  `src/components/ui/pagination.tsx` (shadcn forces `nativeButton={false}`).
- Empty state rendered its message twice (title + description). Duplicate DOM
  text is itself a pitfall this repo documents.
- Numbered links vanished in the empty branch, which also duplicated the
  Previous markup.

Also removed: an unreachable `nextPage < 1` guard, an unrequested `aria-busy`,
and `PaginationEllipsis` (unused; 003 forbids ellipsis logic).

004 shipped two helpers in `src/testsConfig/mockResponse.ts`:

```ts
mockResponse(path, { status?, body?, delay? }): HttpHandler
mockNetworkError(path): HttpHandler
```

**Decisions — settled, do not relitigate:**

- Live in `testsConfig/`, not the slice. Generic, parametrized, no slice
  knowledge. A generic helper inside a slice would force the next slice to
  import across slices (forbidden) or copy it.
- Return an `HttpHandler`; the caller owns `server.use()`. Composes as
  `server.use(a, b)`, and keeps the side effect visible. A helper owning
  `server.use()` internally reads like a value while mutating global state — the
  opaque-wrapper pitfall.
- `baseUrl` resolved internally from `env`; the path argument is relative.
  Inconsistent with `createEmployeesHandlerMocks(baseUrl)` — that factory is also
  called exactly once, so the inconsistency is the factory's.
- Two exports, not four. Error/empty/latency collapse into status+body+delay.
  Network failure needs its own export: `HttpResponse.error()` is not a status
  code and is a different code path in ky.
- `body` genuinely absent when omitted, not defaulted to `{}` — otherwise every
  error path looks like a well-behaved JSON API and error tests pass against a
  fiction.
- No typed per-slice wrapper until a test needs one.

## Method that changed this session

**Tests are mutation-checked, not trusted for being green.** Every acceptance
test was verified by breaking the code it covers and confirming it fails. This
caught two tests of mine that could not fail, and one pair that could not tell
500 from 401. Re-run the table if these areas change:

| Mutation | Caught by |
|---|---|
| `page` dropped from query key | partial last page |
| `disabled` → `aria-disabled` | first page, partial last page |
| Next / Previous step by 2 | steps forward and back |
| `ceil` → `floor` on lastPage | partial last page, one link per page |
| Previous always disabled | both directions, steps forward and back |
| `status` forced to 200 | server error, unauthorized |
| `delay` ignored | delayed response |
| `body` ignored | delayed response |
| `HttpResponse.error()` → 200 | network failure |

**"Setup-only" is retired.** 002 and 003 were stamped *write no new spec files*,
so the only gate was "compiles and lints" — which passed on all three defects
above. The rationale (pitfall tests need 005's filter) confused two kinds of
test: pitfall-demonstration tests, which genuinely wait for 005, and acceptance
tests, which are how you know the agent built the thing. Cheap-to-rewrite
acceptance tests were traded away to avoid trivial churn.

**Tasks state decisions, not menus.** 003 offered "dim or disable", "aria-disabled
or `<button disabled>`", "decide and implement one behavior". Free choice plus no
behavioral gate means whatever an agent picks is unfalsifiable — and one of the
offered options was the bug the next sentence warned against. 004's rewrite locks
its choices with rationale.

## Open — needs your call

1. **Empty-state code is dead.** All controls disable at the boundary and `page`
   is `useState`, so nothing can reach an out-of-range page. The code exists per
   003 step 6 but no test covers it. It becomes honestly reachable in 006 when
   `?page=9` can be typed. Leave it uncovered until then, or delete and
   reintroduce with 006.

2. **Flaky delay test.** `shows the loading state until a delayed response
   arrives` uses a real-time `setTimeout(50)` racing a 100ms helper delay. It
   catches the mutation but will go flaky under load. Needs fake timers →
   005. Fix there or drop and reintroduce.

3. **Knip baseline is dirty.** `src/components/ui/dialog.tsx` unused (added
   during 002) plus 11 unused vendored exports. `CONVENTIONS.md` says all four
   commands must pass; knip exits 0 but reports, so "scan:dead-code passes"
   currently means nothing to a future agent. Either ignore `components/ui/` in
   `knip.ts` or prune.

4. **Duplicated drafts.** Several `DRAFT_FE_TESTING_* copy.md` and `copy 2.md`
   files in the repo root. Probably accidental; confirm before any distillation
   reads them as distinct sources.

5. **The project-local testing skill.** Still the real deliverable per
   `AGENTS.md`. Blocked on distilling `DRAFT_FE_TESTING_*.md`, which is not done.
   The vendored `.agents/skills/tdd` is generic and backend-shaped.

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

**Table**

- Plain shadcn `<Table>` with server-driven state. **TanStack Table was
  considered and rejected**: its client-side row models would delete most of the
  pitfall surface this repo exists for. Revisit only if the goal changes, and
  then as a second slice.

**State sequencing**

- Pagination starts as `useState` (003), migrates to URL search params (006). The
  migration is deliberate — it is exactly where naive tests break, and that
  breakage is repo content. Do not shortcut 003 to `useSearchParams`.

**Testing seams** (in `CONVENTIONS.md`)

1. Query options — `renderHook` + `useQuery`, for fetching behavior.
2. Page component — `render` + role queries, for observable behavior.

Nothing below those two. Error-path tests belong in the page spec, not a separate
error spec file — same seam, one file.

**Dev server is blocked** — deny rules plus a `PreToolUse` hook in
`.claude/settings.json`. Regex pipe-tested 8/8 block, 10/10 pass.

## Roadmap after 005

- **006 — URL search-param state.** Filter + page move to the URL; pagination
  resets on filter change. Empty-state assertions land here.
- **Later:** status filter, sortable headers (header-row off-by-one), row status
  mutation with optimistic update + rollback, delete with `AlertDialog` confirm,
  row detail (portals, duplicate text matching).

Out of scope: create-employee wizard, bulk actions, column visibility toggles,
CSV export, page-size selection.

## Working preferences

- Direct and critical, no praise or recap. Push back on mistakes with reasons.
- One decision at a time for design discussion; execute scoped implementation
  end-to-end without checkpointing.
- Ask rather than assume when requirements are missing.
- Sonnet executes task files; Opus designs and writes them.
