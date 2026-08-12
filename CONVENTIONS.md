# Conventions

Read this before writing code in this repo. For *why this repo exists*, see
`AGENTS.md`.

## Verification

```bash
npm run build          # tsc -b && vite build
npm run test:unit      # vitest run
npm run lint           # oxlint
npm run scan:dead-code # knip
```

All four must pass. If something cannot be verified by those four, it needs a
test.

A task file may mark itself **setup-only** (no new tests). That is a deliberate
sequencing choice, not license to skip the four commands.

## Structure

Top-level folders under `src/` are either infra or a feature slice.

| Infra | Holds |
|---|---|
| `lib/` | API client, env, query client, generic utils |
| `components/` | Generic UI only, incl. `components/ui/` (shadcn) |
| `mocks/` | MSW server/browser setup + handler registry |
| `testsConfig/` | Vitest setup, test providers, test query client |
| `routing/` | Router composition only |
| `styles/`, `assets/` | Self-explanatory |

Anything else under `src/` is a feature slice (`employee-directory/`, `home/`).
No `features/` wrapper folder.

Inside a slice: flat files (`HomePage.tsx`, not `components/HomePage.tsx`) until
it would hold 3+ of a kind. Slices own their routes, exported as a
feature-prefixed array (`export const employeeDirectoryRoutes: RouteObject[]`)
that `routing/router.tsx` spreads together. Slices do not import from each other.

Route paths are independent of folder names — `employee-directory/` serving
`/employees` is intentional.

Every route uses `lazy`, mapping the named export through:

```tsx
lazy: async () => ({ Component: (await import('./EmployeesPage')).EmployeesPage })
```

Never swap this for a static `element:` import — the code split collapses
silently.

## API and mocks

There is no backend. Every endpoint is invented and served by MSW, in both dev
and test. The contract is defined in TypeScript and the handler is written
against it.

**Types first.** Each slice defines its request/response types in its own
`types.ts` (`Employee`, `Paginated<T>`). They stay in the slice until a second
slice needs them — premature promotion to `lib/` grows a god-folder of types.

**One factory per slice**, in the slice's `mocks.ts`:

```ts
export function createEmployeesHandlerMocks(baseUrl: string): HttpHandler[]
```

`src/mocks/handlers.ts` composes every slice's factory into the registry. That
registry is the only place infra reaches into a slice.

**Handlers compute their response from the request.** Read the query params, do
the work:

```ts
http.get(`${baseUrl}/employees`, ({ request }) => {
  const url = new URL(request.url)
  const page = Number(url.searchParams.get('page') ?? 1)
  // ...slice the fixture, return the envelope
})
```

A canned handler that ignores params makes tests that verify the stub instead of
the component — if the component forgets `page` in its query key, a canned
handler still returns what the test expected.

**Fixtures are static and deterministic** — literal arrays in `mocks.ts`,
exported so tests can reference them. No faker, no generation at import time.

**Return type must match the declared contract.** `HttpResponse.json()` is not
type-checked against your types by default; annotate the payload or the factory
so a drifting fixture fails the build rather than a test.

**Per-test deviations use `server.use(...)`.** `testsConfig/setup.ts` calls
`server.resetHandlers()` after each test, so overrides never leak — do not
restore them by hand. `onUnhandledRequest: 'error'` is on: an unexpected request
fails the test instead of hanging.

Never `vi.mock` the API client and never stub `fetch`. MSW is the seam.

## Tests

`*.spec.ts` / `*.spec.tsx`, colocated with the code under test.

### Seams

The `tdd` skill requires seams to be agreed before a test is written. For this
repo they are pre-agreed — these two, and nothing below them:

1. **Query options** — `renderHook` + `useQuery(<slice>QueryOptions)`. For
   fetching behavior: query keys, request params, response shape. Example:
   `src/employee-directory/api.spec.ts`.
2. **Page component** — `render(<Page />)` + role queries. For everything a user
   can observe: rendered rows, controls, loading/error/empty states, interaction.

Do not test hooks, helpers, or internals below these seams, and do not ask which
seam to use for routine work — pick from the two. A task introducing a genuinely
new seam says so explicitly.

### Rendering

Render through `TestAppProviders` (`src/testsConfig/TestAppProviders.tsx`) — it
supplies a fresh `QueryClient` and a `MemoryRouter`:

```tsx
render(<EmployeesPage />, { wrapper: TestAppProviders })
```

Never construct a bare `QueryClientProvider` in a spec. The shared factory sets
`retry: false`; without it an error-path test waits through three retries.

Beyond that, test quality is the subject of this repo rather than a rule in this
file — see `TESTING_PITFALLS.md`.

## Style

- No comments unless requested. No JSDoc unless requested.
- No unused exports or files — knip is part of done. Adding a shadcn component
  before the task that uses it is dead code.
- Add shadcn components via `npx shadcn@latest add <name>`, never by hand, and
  only the ones the current task needs.
