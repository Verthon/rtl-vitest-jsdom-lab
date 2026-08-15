# Category 1 — The assertion cannot fail

Green while the defect is present. Not a weak assertion — an absent one wearing
the syntax of a check.

**Test for membership:** name a defective value it passes on. If you can, it is
here. Nothing in this category is linted: the expression shape is correct, only
the meaning is missing.

| Form | Passes on | Use |
| --- | --- | --- |
| `expect(res.total).toBeDefined()` | `NaN`, `0`, `''` — any wrong number | `toBe(4)` |
| `expect(selectedId).toBeFalsy()` | `''`, `0`, `undefined`, `NaN`, `false` | `toBeNull()` |
| `expect(getByRole('row')).toBeInTheDocument()` | always — `getBy` already threw | delete, or assert content |
| `expect(getByRole('row')).toBeDefined()` | always — same reason | delete, or assert content |
| `expect(getByRole('dialog')).toBeInTheDocument()` where visibility was meant | `display:none`, `visibility:hidden`, `hidden` | `toBeVisible()` |

`toBeTruthy()` and `not.toBeNull()` on a `getBy*`/`findBy*` result are the same
finding as rows 3–4.

## The one that is correct — do not flag

```ts
expect(screen.queryByRole('alert')).not.toBeInTheDocument()
```

`queryBy*` returns `null` instead of throwing. Absence is what it is for, and
this fails when the alert appears.

## The trap in row 5

`toBeInTheDocument()` after `getBy*` where visibility was meant is **two**
defects: it cannot fail, and it tests the wrong property. Swapping to
`toBeVisible()` fixes only the second — the query still guarantees the element
exists. To get a real check, query for something you have not already proven:

```ts
await user.click(screen.getByRole('button', { name: 'Open' }))
expect(await screen.findByRole('dialog')).toBeVisible()
```

## Already linted — do not report

Same "cannot fail" property, but a configured `eslint-plugin-vitest` /
`eslint-plugin-testing-library` (or the oxlint ports) rejects them:

| Form | Rule |
| --- | --- |
| `toHaveBeenCalled()` with no arguments | `prefer-called-with` |
| `toThrow()` with no expected message | `require-to-throw-message` |
| `expect` reachable only through `catch` | `no-conditional-expect` |
| unawaited `findBy*` | `await-async-queries` |

If the project does not run those plugins, they are back in scope and are the
first thing to look for — an unawaited `findBy*` asserted with `toBeDefined()`
is green forever, since a Promise is always defined.

## Verification

Break the code so the claim is false and confirm the test reddens. This is the
only category where that step is non-optional: it is the sole way to tell an
assertion that holds from one that cannot fail.
