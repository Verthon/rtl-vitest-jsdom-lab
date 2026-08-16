# 015 — Stepper primitive fixups

Read `AGENTS.md` and `CONVENTIONS.md` first. This task closes three defects
found reviewing `014`'s output. `014`'s implementation is otherwise correct and
its gates were verified by mutation testing — do not rewrite what works.
**`012` should not start until this task's gate is green**, because fix 1
changes a signature `012` will call on every page test.

## 1. `TestAppProviders` — make the two modes exclusive

`src/testsConfig/TestAppProviders.tsx` currently accepts both `children` and
`routes`. When `routes` is passed, `children` is **silently discarded** — the
`routes` branch renders `<RouterProviderWithRoutes>` and never references
`children`. `014` declared this extension "additive"; it is not additive, it is
a mode switch with a footgun.

The failure this invites: a `012` page test passes `routes` and also passes the
page as `children` (the shape every existing call site uses). Nothing errors.
Nothing warns. The page never renders, and whatever assertion follows fails
with a confusing "unable to find element" instead of "you passed children to
the routes branch". `useUrlStepper.spec.tsx:61` already contorts around this,
rendering `render(<></>)` so that a discarded child is harmless.

**Fix:** make the props a discriminated union so passing both is a compile
error, not a silent drop.

```ts
type TestAppProvidersProps =
  | {
      children: ReactNode
      routerProps?: ComponentProps<typeof MemoryRouter>
      queryClient?: QueryClient
      routes?: never
    }
  | {
      children?: never
      routes: RouteObject[]
      routerProps?: ComponentProps<typeof MemoryRouter>
      queryClient?: QueryClient
    }
```

Then update `useUrlStepper.spec.tsx` to stop passing `children` through the
wrapper. RTL's `wrapper` option always passes `children`, so the routes mode
cannot use `wrapper` — render the provider directly instead:

```tsx
function renderFixture(initialEntries: string[]) {
  return render(
    <TestAppProviders routes={fixtureRoutes} routerProps={{ initialEntries }} />,
  )
}
```

This also removes the `render(<></>, { wrapper })` contortion, which is the
tell that the API was wrong.

**Gate:** `npx vitest run src/employee-directory` still passes unchanged —
the `children` mode must be untouched. `npm run build` must typecheck; if the
union is right, adding both props to a call site fails `tsc`.

## 2. Use `onInvalidStep` instead of the hand-rolled effect

`useUrlStepper.ts` recovers from an invalid URL step with:

```ts
useEffect(() => {
  if (parsedStep === undefined) {
    navigate(`${basePath}/${wizard.steps[0].id}`, { replace: true })
  }
}, [parsedStep, basePath, navigate, wizard.steps])
```

`@stepperize/react` ships the purpose-built callback for exactly this. From
`node_modules/@stepperize/react/dist/index.d.ts`:

```ts
/**
 * Called when a controlled `step` is not a known step id.
 *
 * Stepperize falls back to `defaultStep` (or the first step) and passes the
 * raw value here so you can recover, for example by replacing a URL param.
 */
onInvalidStep?: (raw: unknown) => void
```

The current code works, but it is the deferred path: stepperize renders its
fallback step, then the effect fires and corrects the URL a render later.
`014`'s gate 4 said to reuse what the library gives you; `parseStep` was
reused, this was not.

**Fix:** pass `onInvalidStep` to `useStepper` and drop the `useEffect`. Keep
`parseStep` for the narrowing that feeds `step` — both are still needed, they
do different jobs. Note that `useStepper`'s `step` option accepts raw strings
(`ControlledStep` is `Get.Id<Steps> | (string & {}) | null`), so confirm
against the installed types whether `parsedStep` or `rawStep` should be passed
once `onInvalidStep` owns recovery — do not guess, read the type.

`StepperProgress.tsx`'s `Stepper.Root` takes the same `onInvalidStep` prop.
Decide whether it needs one too, or whether the hook's is sufficient given both
instances read the same URL — state the reasoning in the task report, not in a
code comment.

**Gate — the existing test must still fail on a `push` regression.** After the
change, re-run this mutation and confirm the invalid-step test still fails:

```bash
# temporarily change replace: true -> false, run, confirm red, revert
npx vitest run src/employee-onboarding
```

If the test goes green under that mutation, the recovery path is no longer
covered and the fix regressed the gate.

## 3. Delete the dead title fallback

`StepperProgress.tsx:29`:

```tsx
<Stepper.Title>{'title' in step ? String(step.title) : step.id}</Stepper.Title>
```

The fallback branch is never exercised — every wizard in this repo defines
`title` on every step, and nothing tests a title-less step. It is speculative
generality for a caller that does not exist.

**Fix:** constrain the component to wizards whose steps carry a `title`, so the
requirement is enforced by the type instead of a runtime branch. Narrow the
`Steps` generic to `readonly (Step & { title: string })[]` and render
`step.title` directly. If that narrowing turns out to fight stepperize's
inference, the acceptable fallback is to keep the runtime check but add a test
covering the title-less path — an untested branch is not acceptable either way.

## 4. Fix the overstated test name

`useUrlStepper.spec.tsx:139` is named `reports isLast and disables next on the
last step` but asserts only that the Next button is disabled — that is
`canNext`, not `isLast`. The behavior is correct (verified: on `step-3`,
`isLast=true canNext=false canPrev=true`); the name promises coverage the body
does not deliver.

Either assert `isLast` — the fixture would need to surface it, e.g. rendering
a "Finish" affordance gated on `stepper.isLast` rather than exposing the raw
boolean as text, which would be testing the fixture rather than the hook — or
rename the test to match what it checks. Prefer the former: `012` needs an
`isLast`-gated submit affordance anyway, so proving the flag drives real UI is
worth more than renaming.

## Verify

```bash
npm run build && npx vitest run src && npx oxlint && npm run scan:dead-code
```

Report the new vitest count (baseline after `014`: 35 tests, 6 files).

## Gates

- `EmployeesPage.spec.tsx` passes unchanged.
- Passing both `children` and `routes` to `TestAppProviders` is a **type
  error**, verified by temporarily writing such a call and confirming `tsc`
  rejects it.
- `useUrlStepper.spec.tsx` no longer calls `render(<></>, { wrapper })`.
- The invalid-step test still fails when `replace: true` is mutated to
  `replace: false` — verified by actually running the mutation, not by
  inspection.
- No `useEffect`-based step recovery remains in `useUrlStepper.ts`.
- No untested branch in `StepperProgress.tsx`.
- No wizard content, no draft/form state, no onboarding domain types. Those
  are still `012`'s.
- `TESTING_PITFALLS.md` and `.agents/skills/**` are untouched.
