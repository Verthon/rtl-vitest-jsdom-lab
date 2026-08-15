---
name: component-mocks
description: Judge whether a mocked component leaves the test verifying
    anything. Use when reviewing Vitest / React Testing Library specs that
    call vi.mock on a component in the tree under test
---

# Component mocks

`vi.mock` on a component replaces a subtree with a stand-in. Every claim the
test makes about that subtree becomes a claim about the stand-in. Nothing
linted here — the call is well formed, and only the meaning is wrong.

Review order below. The first `yes` is the finding.

## 1. Was the blocker the thing the test was about?

The mock was added because something failed. If that something *is* the
behavior under test, the test now avoids the only part that could break.

> `EmployeeRow` is mocked in a spec named *renders a row per employee*. What
> renders the row is the mock. The test passes if `EmployeeRow` is deleted.

Finding: the test verifies the stand-in. Say what claim is left.

## 2. What was the smallest substitution available?

Reaching for the largest one because it definitely works trades away more
truth than the problem required.

| Blocker | Substitute |
| --- | --- |
| Missing DOM API (`ResizeObserver`, `scrollIntoView`) | the method |
| One module's export | the module |
| A network call | the response (MSW) |
| Nothing above fits | the component — last resort |

Finding: name the smaller substitution the author skipped.

## 3. Is the reason legitimate?

Two are. Both are narrower than usage suggests.

- **Environment limitation** — happy-dom lacks an API the subtree needs at
  render. Stub the API, not the component.
- **Undrivable third-party surface** — canvas, a non-React editor, no
  accessible handle. The boundary is where your code ends.

Not legitimate: *the component is complicated*, *setup is shorter*. Those
describe the test getting easier while getting weaker.

## 4. Is the mock typed against the real props?

An untyped mock drifts silently. Measured in
[`lab/component-mocks/typed-mock-drift.spec.ts`](../../../lab/component-mocks/typed-mock-drift.spec.ts):

| Mock | Real prop renamed | Real component gains a required prop |
| --- | --- | --- |
| `({ label }: { label: string })` | compiles — silent drift | compiles |
| `({ label }: BadgeProps)` | `TS2339: Property 'label' does not exist` | compiles |

Two limits, both measured, both worth stating in the finding:

- `vi.mock`'s factory return is **not** checked against the real module.
  Typing is opt-in — you get it by naming the real prop type, not for free.
- Typing catches renames and removals. **Additions stay green**, because a
  mock destructuring a subset is still assignable.

Finding: import the real props type. Say that it closes renames, not
additions.

## Writing the finding

Name the question it failed, what the test still verifies, and the swap.

> `vi.mock('./EmployeeRow')` in *renders a row per employee* leaves the test
> asserting that a stand-in renders. The blocker was `ResizeObserver`; stub
> that instead and render the real row.

## Verify by unmocking

Delete the mock and run. If the test still passes, the mock was never needed.
If it fails on the environment, the blocker is real and question 2 applies —
find the smaller substitution. Restore either way.
