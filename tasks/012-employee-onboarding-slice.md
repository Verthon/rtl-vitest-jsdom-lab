# 012 — `employee-onboarding`: a genuinely large slice

Read `AGENTS.md` and `CONVENTIONS.md` first. **This task ships a real feature
slice**, not a lab fixture. It is a prerequisite for 011, which measures against
it.

## Why this exists

011 needs a `huge` tier that is worth measuring. The first draft of it proposed a
synthetic ~10,000-node table. That measures the wrong thing: a table of identical
rows is one repeated role pattern with no state, so a role query walks a big but
*uniform* tree. Real page-test slowness comes from role **variety** — buttons,
inputs, links, headings, live regions, disabled and invalid states — plus
re-renders that invalidate whatever caching sits underneath, plus routing and
async work happening during the journey.

Nobody complains that their table test times out. They complain that the
onboarding flow test does. So the subject should be an onboarding flow.

This slice is also reusable: the altitude skill 011 feeds needs a realistic
example of a deep user journey, and several existing drafts
(`BEHAVIOR_VS_STATE`, `HIDDEN_ASYNC`, `OPAQUE_WRAPPERS`) want a subject bigger
than a paginated table.

## The design decision this task inherits

011's tiers were going to be one component family at three sizes, so that size
was the only variable. **That is not what we are building.** Design B was chosen:
three real components of increasing realism, where size and kind move together.

The cost is real and must be carried in writing, not forgotten: **a ratio
measured across these tiers is a claim about specific components, not about tree
size.** If a role query is 30x slower at `huge` than at `small`, that is not
"role queries scale badly with size" — it is "role queries are slower on the
onboarding form than on the employees table", and the causes are confounded
(more nodes, more distinct roles, more state, routing). 011 already carries a
gate requiring `COSTS.md` to state this. Do not resolve the confound by making
the tiers artificially similar; that would throw away the realism this task
exists to buy.

## Scope — decided, not a menu

**A 10-step employee onboarding wizard**, at `/onboarding`, as a new slice
`src/employee-onboarding/`. It is the `huge` tier. The `medium` tier is a 3-step
subset route; `small` stays the existing `EmployeesPage`.

**Real per `CONVENTIONS.md`.** Own `types.ts`, own `mocks.ts` with a
`createOnboardingHandlerMocks(baseUrl)` factory registered in
`src/mocks/handlers.ts`, own `routes.tsx` exporting `onboardingRoutes` with
`lazy`, spread into `routing/router.tsx`. No imports between slices.

**No new seam.** `CONVENTIONS.md` pre-agrees two seams and says a task
introducing a new one must say so explicitly. This task does not introduce one:
tests go through the page component seam, `render(<OnboardingPage />)` with role
queries. Step components are not tested in isolation — that would be the exact
pitfall the coming skill is about, committed inside the repo that documents it.

**Not in scope:** real validation libraries, a state machine library, or a store
package. See the store question below — it is settled, not open.

## Shape

Ten steps, each carrying different role density on purpose. The variety *is* the
subject; a wizard whose ten steps are ten identical text inputs would be the
synthetic table again in a different costume.

| # | Step | Notable roles / state |
|---|---|---|
| 1 | Personal details | text inputs, required-field errors |
| 2 | Contact | inputs + a repeatable "add another" list |
| 3 | Address | select-driven region fields that re-render on change |
| 4 | Role & department | comboboxes populated from a fetched list |
| 5 | Manager | async search field — real MSW round-trip |
| 6 | Start date | date input, disabled ranges |
| 7 | Equipment | checkbox group, many same-role elements |
| 8 | Access & permissions | nested checkboxes with indeterminate parents |
| 9 | Documents | file-ish inputs, a list that grows |
| 10 | Review & submit | read-only summary of every prior step, plus submit |

Step 10 matters most for 011: it renders a summary of all nine prior steps, which
is where the tree is genuinely large *and* heterogeneous at once.

Progress is a stepper with links/buttons per step, present on every step — that
alone is 10 same-role elements that every role query must walk past.

**Routing.** Each step is a URL (`/onboarding/:step`), not `useState`. This is
deliberate: 003's pagination tests stayed green through a `useState` → URL
migration without ever proving the URL changed (`HANDOFF.md` evidence table), and
a wizard is the natural place for that pitfall to recur. It also means 011
measures a journey that involves real navigation, which was the point of
including routing.

**State.** Draft answers persist across steps and survive navigating backward.
Use React state lifted to the route-level component plus URL for the step index —
**no store library.** A store would add a dependency for one feature, and knip is
part of done. If cross-step state proves genuinely unmanageable that way, that is
a finding for the handoff and a follow-up task, not a licence to add Zustand
mid-task.

**API.** `GET /onboarding/options` for the fetched lists (departments, roles,
equipment). `GET /employees?q=` is already available for the manager search —
reuse it via its own slice? No: slices do not import from each other. Add a
`GET /onboarding/managers?q=` handler in this slice's `mocks.ts`. `POST
/onboarding` for submit, returning the created employee. Handlers compute
responses from the request per `CONVENTIONS.md` — the manager search must
actually filter on `q`, or 011's async probe measures a canned response.

## ⚠️ Routing trap — resolve this before step 5, not during it

`TestAppProviders` (`src/testsConfig/TestAppProviders.tsx`) wraps `children` in
a bare `MemoryRouter` — no `<Routes>`, no route matching. Every existing spec
renders the page component directly as a child
(`render(<EmployeesPage />, { wrapper: TestAppProviders })`), which works for
`EmployeesPage` because `useSearchParams` only needs a router context, not a
route match.

**This does not work for `/onboarding/:step`.** `useParams()` returns `{}`
unless the component is rendered through an actual matched route, and
`useNavigate()`-driven URL changes are not observable as route re-renders
without one. No spec in this repo has ever rendered a param-route component —
confirmed by grep, not assumed. Discovering this mid-step-5 wastes a session;
resolve it here.

**The fix, decided:** the react-router team's own recommended pattern (per
`remix-run/react-router` testing examples, matching what `src/main.tsx`
already does in production) is `createMemoryRouter(routes, { initialEntries })`
+ `<RouterProvider router={router} />`, not `MemoryRouter` + bare children.

Extend `TestAppProviders` **additively** — do not change its existing
signature or behavior, since `EmployeesPage.spec.tsx` depends on the current
one:

```tsx
type TestAppProvidersProps = {
  children?: ReactNode
  routes?: RouteObject[]
  routerProps?: ComponentProps<typeof MemoryRouter>
  queryClient?: QueryClient
}
```

When `routes` is passed, build `createMemoryRouter(routes, { initialEntries: routerProps?.initialEntries })`
and render `<RouterProvider router={router} />` instead of
`<MemoryRouter>{children}</MemoryRouter>`. When `routes` is omitted, behavior
is byte-identical to today. `OnboardingPage.spec.tsx` passes `routes:
onboardingRoutes` (or a local equivalent covering `/onboarding/:step`) and
`routerProps: { initialEntries: [...] }`; it does not pass `children`.

**Gate this before continuing to step 5:** run
`npx vitest run src/employee-directory` after the `TestAppProviders` change,
unmodified otherwise — if any existing test breaks, the extension was not
additive and must be fixed before it touches the onboarding spec.

## Steps

1. **Types first.** `src/employee-onboarding/types.ts` — the draft shape, the
   options payload, the submit request/response. No `any`, and the handler
   payloads are annotated so a drifting fixture fails `tsc -b` rather than a test.

2. **Mocks.** `mocks.ts` with the factory and static, deterministic fixtures —
   literal arrays, no faker, no generation at import time. Enough manager records
   that a `q` search is meaningfully filtering (~50). Register in
   `src/mocks/handlers.ts`.

3. **The page and steps.** `OnboardingPage.tsx` owns draft state and renders the
   current step. Steps are flat files in the slice until there are 3+ of a kind,
   per `CONVENTIONS.md` — ten step components *are* 3+ of a kind, so
   `steps/` is correct here. `components/ui/` currently has only `alert`,
   `button`, `card`, `dialog`, `empty`, `input`, `label`, `pagination`,
   `spinner`, `table` — none of the shape needed for combobox, checkbox,
   select, or date input, so this step needs new ones. **Invoke the `shadcn`
   skill** to pick and add the right components (a combobox is `Command` +
   `Popover` composed, not one component — do not guess the mapping) via
   `npx shadcn@latest add`, only the ones this task uses.

4. **Routes.** `routes.tsx` exporting `onboardingRoutes`, `lazy` per the mapped
   named-export form, `HydrateFallback: PageLoader`. Spread into
   `routing/router.tsx`.

5. **Tests — the page seam only.** `OnboardingPage.spec.tsx`, through
   `TestAppProviders`. Cover at minimum: walking forward several steps, going
   back and finding an answer still there, the async manager search, a validation
   block on submit, and **the URL carrying the step** — that last one is the
   assertion 003 taught us to write explicitly.

   This spec is also 011's honest baseline for "what a real high-level test
   costs", so write it the way you would actually write it, not optimised for
   speed. If it is slow, that is data.

6. **Record the tier facts 011 needs.** 011 pins tiers by node count and requires
   interactive-element density to be written down. Measuring that is 011's job,
   but this task must leave it measurable: no random-length lists, no
   `Math.random()`, nothing time-dependent in render. Two renders of the same
   step with the same draft must produce the same tree, or every number in
   `COSTS.md` is noise.

7. **Verify.**

   ```bash
   npm run build && npx vitest run && npx oxlint && npm run scan:dead-code
   ```

   Report the new vitest count and the new full-run wall clock — 011 needs the
   before/after, and this slice is expected to make the suite slower. Say by how
   much. knip must stay clean: an unused step component or an unexported type is
   a fail, and adding a shadcn component this task does not use is dead code.

## Gates

- The slice follows `CONVENTIONS.md` structurally: no cross-slice imports, `lazy`
  routes, one mock factory, types in the slice.
- Handlers compute from the request. A manager search that ignores `q` fails this
  task, because it silently converts 011's async probe into a measurement of
  nothing.
- No step component has its own spec. Tests are at the page seam.
- Render is deterministic — same draft, same tree, every time.
- No store library, no validation library added.
- Ten steps exist and their role density genuinely differs; ten identical input
  screens fail the gate.
- `TESTING_PITFALLS.md` and `.agents/skills/**` are untouched. This task ships a
  subject to measure, and states no conclusions about it.
