# 014 — URL-synced stepper primitive

Read `AGENTS.md` and `CONVENTIONS.md` first. This task is split out of `012`
because it is infrastructure, not onboarding-domain work, and because it
carries the highest-risk, least-precedented code in that task — better to get
it right in isolation, with a tiny fixture, than discover a problem with it
buried under ten step components. **012 depends on this task's output** and
should not start until this one's gate is green.

## Why this exists

`@stepperize/react` (`7.0.0`, already installed — see `package.json`) is a
headless step-flow library: `defineStepper([...])` returns a typed
`useStepper()` hook plus a `Stepper.*` primitive component tree for rendering
progress indicators, prev/next controls, etc.

Left to its defaults, `useStepper()` owns the current-step state itself. `012`
requires the URL (`/onboarding/:step`) to be the source of truth for the
current step — the same lesson `006` encoded for the page-param case: a
component's internal state can silently drift from the URL while a naive test
suite stays green, because nothing forces the assertion to go through the URL.
Wiring stepperize as the *owner* of step state would reopen that exact hole
inside a library dependency, one level harder to see than it was in `006`
because the state now lives inside a third-party hook instead of a local
`useState`.

**Decided: the URL drives stepperize, not the reverse.** `useStepper` supports
this natively and it is the library's documented, first-class mode, not a
workaround — `UseStepperOptions` (`node_modules/@stepperize/react/dist/index.d.ts`)
takes:

```ts
step?: ControlledStep<Steps>            // controlled current step id
onStepChange?: (step, context) => void  // fires on stepper-driven navigation
onInvalidStep?: (raw: unknown) => void  // fires when `step` doesn't match a known id
```

with `parseStep(value): Get.Id<Steps> | undefined` on the object `defineStepper`
returns, for narrowing an arbitrary value (the URL param) to a known step id.
This is the direct analogue of `006`'s `parseSearchParams` guard, applied to
steps instead of pages — reuse the shape of that pattern, do not invent a new
one.

## Scope — decided, not a menu

**A reusable wrapper**, `src/employee-onboarding/useUrlStepper.ts` (or
`.tsx` if it must return JSX — decide based on what it needs to return; a hook
that also renders is a smell, prefer keeping render in the caller). It is
still inside `employee-onboarding/` — this is not generic-enough infra to earn
`src/lib/`, and `CONVENTIONS.md`'s promotion rule (types move to `lib/` only
when a second slice needs them) applies here too. If a second slice ever wants
a stepper, that is when it moves, not before.

**What it owns:**

1. Reads the current step from the router (`useParams<{ step: string }>()`).
2. Calls `stepper.parseStep(raw)` to narrow it; on `undefined`, `useNavigate`s
   (with `{ replace: true }` — a bad step in the URL is a correction, not a new
   history entry, unlike `006`'s page param which explicitly avoided `replace`
   for a different reason; state why in a comment only if the reasoning is
   non-obvious from the code, per this repo's comment policy) to the first
   step's URL.
3. Passes the narrowed step to `useStepper({ step, onStepChange })`.
4. `onStepChange` (fired by `stepper.next()` / `stepper.prev()` / primitive
   trigger clicks) calls `useNavigate()` to push the new step's URL. This is
   the write side — stepperize changes, URL follows.
5. Returns whatever the onboarding page needs to render steps and controls:
   at minimum `stepper` itself (for `.current`, `.canPrev`, `.canNext`,
   `.isLast`, `.match(...)`), and does not hide it behind a narrower
   interface — `012` needs the real object, not a subset guessed in advance.

**What it does not own:** step content, draft form data, submit logic. Those
are `012`'s job. This task ships plumbing and a progress-indicator UI, not
wizard steps.

**Progress indicator.** Use the `Stepper.*` primitives
(`Stepper.Root`/`List`/`Items`/`Item`/`Trigger`/`Indicator`/`Title`) from
`defineStepper`'s returned object, per the library's README pattern, rather
than hand-rolling one — that is the point of depending on the library. Style
with existing Tailwind conventions in this repo; do not add a new UI
dependency for this.

## The routing seam — carried over from 012, resolve here instead

`012` originally flagged that `TestAppProviders` only wraps children in a bare
`MemoryRouter` with no route matching, which breaks for anything using
`useParams()`. That fix (an additive `routes` prop on `TestAppProviders`
switching it to `createMemoryRouter` + `RouterProvider` when passed) is now
**this task's to build**, since this is the first code that needs it. Full
detail and the exact type signature are in `012`'s "Routing trap" section —
read that section before touching `TestAppProviders.tsx`, and do not diverge
from the additive contract described there. `012` should no longer need to
touch `TestAppProviders.tsx` at all once this task lands.

**Gate before continuing:** after extending `TestAppProviders`, run
`npx vitest run src/employee-directory` — the extension must not change
`EmployeesPage.spec.tsx`'s behavior. If anything there breaks, the extension
was not additive.

## A new seam, declared explicitly

`CONVENTIONS.md` pre-agrees two seams (query options, page component) and
says a task introducing a new one must say so. **This task introduces a
third: an isolated primitive/integration seam**, for infrastructure that has
router integration risk but is not itself a page. The alternative —
folding this into `012`'s page-seam tests only — would mean the riskiest,
least-precedented code (URL↔stepperize sync, invalid-step recovery,
`TestAppProviders`'s new branch) is only ever exercised indirectly, under ten
step components' worth of unrelated noise. Test it directly instead:

**`useUrlStepper.spec.tsx`**, colocated. Render a tiny fixture — 2 or 3 dummy
steps with no real content (`<div>{step.id}</div>` is enough) — through a
minimal route tree (`/fixture/:step`) using the new `TestAppProviders` `routes`
prop. This is not a wizard; it exists only to exercise the hook.

Cover at minimum:

- The URL sets the initial step (`initialEntries: ['/fixture/step-2']` lands
  on `step-2`, not the default).
- Calling next()/prev() (via the primitive trigger or the stepper object)
  changes the URL — assert on the router state, not on which DOM node
  rendered, or this degrades into `TEST_THAT_CANNOT_FAIL` territory: the URL
  assertion is the whole point, same as `006`'s `puts the current page in the
  URL`.
- Navigating back (browser back / a direct URL edit to a prior step) is
  reflected in the rendered step — proves the sync is bidirectional, not just
  write-only.
- An invalid step in the URL (`/fixture/nonexistent`) redirects to the first
  step, and does so via `replace` — assert the history length, not just the
  final location, or a `push` bug passes silently.
- `stepper.canPrev` is `false` on the first step, `stepper.canNext` /
  `stepper.isLast` behave correctly on the last.

## Steps

1. **Read the stepperize types** at
   `node_modules/@stepperize/react/dist/index.d.ts` and
   `node_modules/@stepperize/core/dist/index.d.ts` before writing code — this
   task file quotes the relevant fields, but confirm against the installed
   version rather than trusting the quote if anything seems off.
2. **Extend `TestAppProviders`** per the "Routing seam" section above. Gate:
   `npx vitest run src/employee-directory` unchanged.
3. **Build `useUrlStepper.ts`** and the progress-indicator component using
   `Stepper.*` primitives.
4. **Write `useUrlStepper.spec.tsx`** against the fixture flow, covering the
   list above.
5. **Verify.**

   ```bash
   npm run build && npx vitest run src && npx oxlint && npm run scan:dead-code
   ```

   Gate on `src`, not the full run — this ships app code, `lab/` is untouched.
   Report the new vitest count.

## Gates

- `EmployeesPage.spec.tsx` passes unchanged after the `TestAppProviders`
  extension.
- The URL is the only source of truth for the current step, proved by a test
  that asserts on router state after a stepperize-driven navigation, not on
  rendered content alone.
- Invalid step recovery uses `replace`, proved by history length, not by
  final-location alone.
- `stepper.parseStep` (or equivalent narrowing), not a hand-rolled string
  comparison against step ids — reuse what the library gives you.
- No wizard content, no draft/form state, no `employee-onboarding` domain
  types in this task. Those belong to `012`.
- `TESTING_PITFALLS.md` and `.agents/skills/**` are untouched.
