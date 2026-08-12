# Handoff — 2026-08-12

Session context for picking this up fresh. Read `AGENTS.md` (why the repo
exists) and `CONVENTIONS.md` (how to work in it) first; this file covers what
was decided, what is done, and what is open.

## Where things stand

**Done:** 001 (flat VSA migration), 002 (slice rename + response envelope +
table rendering). Both executed by Sonnet.

**Ready and unstarted:** `tasks/003-server-pagination.md`.

**Draft, has open questions:** `tasks/004-msw-override-helpers.md`.

**Not written yet:** 005 (debounced filter), 006 (URL search-param state), and
the project-local testing skill.

Note: `tasks/001-*.md` was deleted after completion, so task files on disk are
not a full history.

Uncommitted: everything. `git status` shows the 001/002 moves plus new files
(`CONVENTIONS.md`, `.claude/settings.json`, `tasks/`, the slice files).

## Decisions made — do not relitigate

**Architecture**

- Flat VSA. Feature slices are top-level under `src/` (`employee-directory/`,
  `home/`), siblings of infra. No `features/` wrapper.
- Slices named by **capability**, not resource: `employee-directory/`, not
  `employees/`. The current single slice covers browsing a list; a future
  mutation-heavy flow (onboarding) would be its own slice.
- Flat inside a slice until 3+ files of a kind justify a subfolder.
- Slices own their routes, exported as `<feature>Routes: RouteObject[]`.
  `routing/router.tsx` only spreads them.
- Route paths are independent of folder names — `employee-directory/` serving
  `/employees` is intentional.

**Data layer**

- No backend. Every endpoint invented, served by MSW in dev and test.
- MSW handlers **compute responses from request params** (a fake server), not
  canned payloads. This is load-bearing: a canned handler makes tests that
  verify the stub instead of the component.
- Fixtures static and deterministic: 47 employees in
  `src/employee-directory/mocks.ts`. 47 is deliberate — not divisible by 10, so
  the last page is partial.
- Paginated envelope `{ data, page, perPage, total }`, typed as `Paginated<T>`
  in the slice's `types.ts`. Stays in the slice until a second slice needs it.

**Table**

- Plain shadcn `<Table>` with server-driven state. **TanStack Table was
  considered and rejected**: its client-side row models would delete most of the
  pitfall surface this repo exists for (query-key correctness, stale rows during
  fetch, debounce interactions). Revisit only if the goal changes to "review
  TanStack-based tables", and then as a second slice, not this one.

**State sequencing**

- Pagination state starts as `useState` (task 003), then migrates to URL search
  params (task 006). The migration is deliberate: it is exactly where naive
  tests break, and that breakage is repo content. Do not shortcut 003 straight
  to `useSearchParams`.

**Testing seams** (settled, in `CONVENTIONS.md`)

1. Query options — `renderHook` + `useQuery`, for fetching behavior.
2. Page component — `render` + role queries, for observable behavior.

Nothing below those two. The `tdd` skill's "confirm seams with the user" gate is
pre-answered for routine work.

**Verification**

`npm run build`, `npm run test:unit`, `npm run lint`, `npm run scan:dead-code`.
The dev server is blocked — deny rules plus a `PreToolUse` hook in
`.claude/settings.json` that returns a reason. Regex was pipe-tested: 8/8 block
cases blocked, 10/10 pass cases passed (`grep vite ...` and `cat vite.config.ts`
correctly pass).

**Caveat:** `.claude/settings.json` was created mid-session, so the settings
watcher may not have loaded it. Open `/hooks` once or restart to activate. A
fresh session picks it up automatically.

## Remaining roadmap

Each step adds one pitfall class; build in order.

- **003 — server pagination.** Query key includes `page`; `placeholderData:
  keepPreviousData` deliberately preserved so stale rows stay visible during
  fetch. Setup-only.
- **004 — MSW override helpers.** 401/403/500, empty payloads, latency, network
  error. Three open questions in the file: where they live (slice vs
  `testsConfig/`), generic vs typed per-slice, and whether the helper owns
  `server.use()` or returns a handler. Also fold in real type-checking of
  handler responses against `Paginated<Employee>` — `HttpResponse.json()`
  currently infers from the literal, so fixture drift compiles fine.
- **005 — debounced filter.** The first task where the naive test is genuinely
  wrong: `userEvent` v14's internal delay collides with `vi.useFakeTimers()`
  unless `advanceTimers` is passed. Highest pitfall density in the repo. Write
  this task carefully.
- **006 — URL search-param state.** Filter + page move to the URL; pagination
  resets on filter change.
- **Later:** status filter, sortable headers (header-row off-by-one), row status
  mutation with optimistic update + rollback, delete with `AlertDialog` confirm,
  row detail (portals, duplicate text matching).

Deliberately out of scope: create-employee wizard, bulk actions, column
visibility toggles, CSV export, page-size selection.

## Open questions for the next session

1. **Task style from 005 onward.** 002/003 are setup-only, which is horizontal
   slicing — contrary to the `tdd` skill's red-green rule. That was a deliberate
   scaffolding choice. From 005, tasks should specify the loop (one seam, one
   failing test, minimal implementation) rather than describe a finished
   component. Needs a different task template.

2. **The project-local testing skill.** `AGENTS.md` states the goal is turning
   each pitfall into a skill an agent can apply. The vendored `.agents/skills/tdd`
   is generic and backend-shaped — it knows nothing about RTL, MSW, query
   clients, or fake timers. A project skill layering those specifics is the real
   deliverable, and it needs the `DRAFT_FE_TESTING_*.md` files distilled first
   (user has said that distillation is not done).

3. **Dead code.** `src/components/ui/dialog.tsx` was added during 002 but
   nothing uses it. Delete it or let knip flag it — leaving it erodes trust in
   `scan:dead-code`. `empty.tsx` is used by 003.

4. **Duplicated drafts.** Several `DRAFT_FE_TESTING_* copy.md` and `copy 2.md`
   files sit in the repo root. Probably accidental; worth confirming before any
   distillation work reads them as distinct sources.

## Working preferences observed this session

- Direct and critical, no praise or recap. Push back on mistakes with reasons.
- One decision at a time for design discussion; execute scoped implementation
  end-to-end without checkpointing.
- Ask rather than assume when requirements are missing.
- Sonnet executes the task files; Opus does the design and writes them.
