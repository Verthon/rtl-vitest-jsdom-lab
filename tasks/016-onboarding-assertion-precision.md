# 016 — OnboardingPage assertion precision fixups

Read `AGENTS.md` and `CONVENTIONS.md` first. This task fixes four assertion
defects in `src/employee-onboarding/OnboardingPage.spec.tsx`, found by running
the `assertion-precision` skill over it.

**Scope is the spec file only.** Every finding below was verified by mutation
testing against the current implementation, and the implementation was correct
in all four cases — the tests are what is wrong. Do not change any component,
hook, or handler to make a test pass. If you believe a fix requires a source
change, stop and report that instead.

Baseline before you start: `npx vitest run src/employee-onboarding/OnboardingPage.spec.tsx`
→ **15 passed**. It must still be 15 passed when you are done.

The `component-mocks` skill was also run against this file and produced no
findings — the spec has no `vi.mock`/`vi.spyOn`/`vi.fn` and stubs at the network
boundary via MSW, which is correct. Do not introduce component mocks here.

## 1. `removes a repeatable contact` cannot fail — fix this first

`OnboardingPage.spec.tsx:205-218`. This is the only category-1 finding: the
assertion is green while the defect is present.

**Measured.** Replacing the id-based removal in `steps/ContactStep.tsx:30`

```ts
onChange(answers.filter((contact) => contact.id !== id))   // real
onChange(answers.slice(0, -1))                             // mutation
```

makes "Remove contact 1" delete contact **2** instead. The test still passes.

The reason is that `Contact 1` / `Contact 2` are `index + 1` labels rendered at
`ContactStep.tsx:46`. Remove either of two contacts and exactly one heading
labelled "Contact 1" remains, so both current assertions hold no matter which
row was dropped. The test asserts the surviving *count*, never the surviving
*identity*, and the two contacts it creates are indistinguishable because it
never fills their fields.

**Fix:** give the two contacts distinct values, then assert on the value that
should have survived.

```tsx
await user.click(screen.getByRole('button', { name: 'Add another contact' }))
await user.type(screen.getAllByLabelText('Name')[0], 'Grace')
await user.click(screen.getByRole('button', { name: 'Add another contact' }))
await user.type(screen.getAllByLabelText('Name')[1], 'Alan')

await user.click(screen.getByRole('button', { name: 'Remove contact 1' }))

expect(screen.getAllByLabelText('Name')).toHaveLength(1)
expect(screen.getByLabelText('Name')).toHaveValue('Alan')
```

Check the step's initial state before writing this — confirm whether the step
starts with zero contacts or one, since that decides how many "Add another
contact" clicks are needed and what `getAllByLabelText('Name')` indices mean.
Read `ContactStep.tsx` and `defaultDraft.ts`; do not assume the snippet's two
clicks are right.

**Gate — mutation, not inspection.** Apply the `slice(0, -1)` mutation above,
run the test, confirm it now **fails** with
`expected element to have value Alan, received Grace` (or equivalent naming the
surviving contact). Revert the mutation. A fix that does not redden under this
mutation has not fixed anything.

## 2. `toBeChecked()` on a tri-state parent reports the wrong problem

`OnboardingPage.spec.tsx:299`.

**Measured.** Base UI's parent checkbox renders `aria-checked="mixed"`, which
jest-dom's `toBeChecked()` rejects outright. Mutating the group handler so the
parent only propagates to 2 of 3 children makes the test red — but with a
matcher-usage error, not a state diff:

```
Error: only inputs with type="checkbox" or type="radio" or elements with
role="checkbox" ... and a valid aria-checked attribute can be used with
.toBeChecked(). Use .toHaveValue() instead
```

The report says *you used the wrong matcher*, not *the group failed to fully
check*. Category 2 — fails correctly, reports uselessly.

## 3. `toHaveAttribute('data-indeterminate')` asserts the styling hook

`OnboardingPage.spec.tsx:294` and `:300`. Same two lines as fix 2 — resolve them
together.

**Measured** against the real `Checkbox`, the three states are exactly:

| state | attributes |
| --- | --- |
| unchecked | `data-unchecked="" aria-checked="false"` |
| indeterminate | `data-indeterminate="" aria-checked="mixed"` |
| checked | `data-checked="" aria-checked="true"` |

`data-*` is a Tailwind selector hook; `aria-checked` is the contract a screen
reader reads. Asserting the data attribute means a styling refactor that renames
it reddens the test for no user-visible reason, and the failure prints ~600
characters of class soup without naming the state.

**Fix for 2 and 3 together:**

```ts
expect(engineeringGroup).toHaveAttribute('aria-checked', 'mixed')   // :294
// ...
expect(engineeringGroup).toHaveAttribute('aria-checked', 'true')    // :299
```

Line 300's `not.toHaveAttribute('data-indeterminate')` becomes redundant once
299 asserts `aria-checked="true"` — `mixed` and `true` are mutually exclusive
values of one attribute. Delete it rather than translating it.

Also reconsider `:290`'s `expect(engineeringGroup).not.toBeChecked()` — that one
runs against `aria-checked="false"`, which jest-dom accepts, so it works today.
Decide whether to leave it or make the whole test consistent on `aria-checked`;
either is defensible, state which you chose and why in the report.

**Gate:** apply the 2-of-3 propagation mutation to `AccessStep.tsx`'s
`onValueChange`, confirm both access tests now fail with an `aria-checked`
diff naming `mixed` vs `true` — not with a jest-dom usage error. Revert.

## 4. `currentPath()` substring-matches

`OnboardingPage.spec.tsx:86`, and the ten further `currentPath()` assertions
through the journey test (`:90, :98, :104, :110, :116, :121, :127, :133, :138, :147`).

**Measured** — `toHaveTextContent` is substring-by-default, so both of these
pass:

```tsx
render(<output aria-label="p">/onboarding/personal-details-EXTRA-JUNK</output>)
expect(el).toHaveTextContent('/onboarding/personal-details')   // passes

render(<output aria-label="q">/wrong/prefix/onboarding/address</output>)
expect(el).toHaveTextContent('/onboarding/address')            // passes
```

A malformed or double-prefixed path satisfies every path assertion in the
journey test. Category 3 — the check is real, the remainder is unguarded.

`LocationProbe` renders the pathname as the element's entire content, so anchor
the match:

```ts
expect(currentPath()).toHaveTextContent(/^\/onboarding\/personal-details$/)
```

Eleven call sites repeat this shape. Fold the anchoring into a helper rather
than writing the regex out eleven times — e.g. have `currentPath()`'s caller go
through `expectPath('/onboarding/address')` that builds the anchored regex from
a plain string, so the call sites stay readable and no site can forget the
anchors. Escaping: the paths here are `[a-z-]` and `/` only, so a plain
`new RegExp('^' + path + '$')` is honest for this input — but if you write a
general helper, escape the input rather than pretending the constraint holds
forever.

**Gate:** temporarily change one `expectPath` argument to a path that is a
strict prefix of the real one (e.g. `/onboarding/address` → `/onboarding/addr`)
and confirm it fails. Under the current unanchored form it would pass. Revert.

## Verify

```bash
npm run build && npx vitest run src && npx oxlint && npm run scan:dead-code
```

Report the vitest count. It must be unchanged at 15 for this file — these are
assertion fixes, not new coverage. If your fix for 1 splits a test or adds one,
say so explicitly and justify it.

## Gates

- All four mutations above were **run**, each confirmed red for the stated
  reason, each reverted. Report the actual failure output for each, not a
  claim that you checked.
- `git status` is clean apart from `OnboardingPage.spec.tsx` and this task
  file. No source file is modified — the mutations are temporary and reverted.
- No `vi.mock` introduced.
- `data-indeterminate` no longer appears in the spec.
- No `toHaveTextContent` on `currentPath()` without anchors.
- `TESTING_PITFALLS.md` and `.claude/skills/**` are untouched. If this work
  suggests a new pitfall entry, propose it in the report — do not write it.
