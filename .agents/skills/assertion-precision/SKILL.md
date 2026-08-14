---
name: assertion-precision
description: Judge whether an assertion can fail, and whether its failure names the defect. Use when writing or reviewing Vitest / React Testing Library specs — on any expect() over an array, record, Map, Date, spy, promise, or DOM element.
---

# Assertion precision

An assertion earns its place twice: it must be able to fail, and its failure
must name what broke. A coarse matcher can lose either. oxlint catches the forms
where the *expression shape* is wrong; everything here is well-formed code
pointing at a value that was already flattened.

Claims below in *italics* name a passing test in `lab/assertions/`. The matcher
lookup table is `lab/assertions/MATRIX.md` — consult it, do not recite it.

## Move 1 — Ask where the boolean came from

If `expect()` receives a boolean, find out who computed it. Data that arrived as
a boolean is fine. A boolean the *test* manufactured — by `.includes()`,
`.has()`, `.contains()`, a comparison, a property read — discarded the value
before the matcher saw it, and the failure can only say `expected false to be
true`.

`expect(activeIds.has('emp-4')).toBe(true)` prints `expected false to be true`;
`expect(activeIds).toContain('emp-4')` prints the members the set does hold.
*has() reduces the whole set to a boolean*.

## Move 2 — Climb the ladder: count → identity

Counting is the rung below naming. `toHaveLength` says the count is wrong; it
previews the array but truncates after the first entry, and its `actual` is the
length — so it never names the missing row. Project the thing you mean and
assert on that.

```ts
expect(screen.getAllByRole('row')).toHaveLength(3)  // count only
const names = screen.getAllByRole('row').map((row) => row.textContent)
expect(names).toStrictEqual(['Ada', 'Grace', 'Katherine'])
```

*toHaveLength on rows reports a count without naming the row that is missing* /
*asserting the projected row names is what names the missing row*.

The same rung exists for text. `toHaveTextContent` reports the same flattened
string a manual `textContent` read does — its gain is substring and regex
matching, not better output. To know *which cell* regressed, query the cell.
*neither form names which cell regressed, so the cell is the thing to query*.

**The ladder runs downhill too.** Several assertions over the elements of one
collection are weaker than one assertion over the collection: they fix the
parts they mention and say nothing about order, length, or the elements they
skip. Watch for a `toStrictEqual` that has been decomposed into a length check
plus per-index probes — that is a rung lost, not detail gained.

```ts
expect(requests.length).toBeDefined()          // three assertions, and none of
expect(requests[0]).toBeFalsy()                // them can tell null from ''
expect(requests.includes('Grace Hopper')).toBe(true)

expect(requests).toStrictEqual([null, 'Grace Hopper'])
```

## Move 3 — Reject the shapes that pass on a broken value

These are green against data that is already wrong. Treat each as a defect
regardless of how the suite currently runs.

| Shape | Passes on | Use |
|---|---|---|
| `toBeDefined()` on a number | `NaN` | `toBe(expected)` |
| `toBeFalsy()` where null was the contract | `''`, `0`, `undefined` | `toBeNull()` |
| one field of a record | a wrong sibling field | `toStrictEqual(record)` |
| `toEqual` | a key whose value is `undefined` | `toStrictEqual` |
| `expect` reachable only via `catch` | nothing rejecting | `await expect(p).rejects.toThrow(msg)` |
| `toBeInTheDocument()` after `getBy*` | always — `getBy` already threw | delete it, or assert the content |
| `toBeInTheDocument()` where visibility was meant | `display: none` | `toBeVisible()` |
| `spy.mock.calls[0][0]` | hides every other call | `toHaveBeenCalledWith(...)` |
| `getTime()` on Dates, exact `toBe` on a float | epoch numbers; correct arithmetic | `toStrictEqual` / `toBeCloseTo(v, 10)` |

`expect(screen.queryByRole('alert')).not.toBeInTheDocument()` is **correct** —
do not flag it. Absence is what `queryBy` is for.

## Move 4 — Prefer the matcher that prints the element

Reading a DOM property hands `expect` a bare primitive, so the failure is two
booleans or two strings with no element in it. The jest-dom matcher prints the
element whose state was wrong.

`checked` → `toBeChecked()`, `disabled` → `toBeDisabled()`, `value` →
`toHaveValue()`, `getAttribute()` → `toHaveAttribute()`, `classList.contains()`
→ `toHaveClass()`. Never assert against `innerHTML`.

*reading checked reports two booleans and nothing about the element* /
*toBeChecked prints the element whose state was wrong*.

Several assertions inside one `waitFor` do name the one that failed — but only
after burning the full timeout retrying the block, re-running the assertions
already true on every tick. Await one condition, assert the rest outside: same
message, immediate failure. *waitFor does name the failing assertion, but pays
the full timeout to do it*.

## Move 5 — Verify by breaking it

Change the code so the claim is false, confirm the test reddens *for the stated
reason*, restore. Reddening for the wrong reason is not a pass. Read the failure
output while you are there: if it does not name the defect, the assertion is
still too coarse.

## oxlint already rejects these — do not report them

`expect(x.length).toBe(n)`, `expect(a.includes(b)).toBe(true)`, a comparison or
`===` inside `expect()`, `toHaveBeenCalled()` without arguments, `toThrow()`
without a message, `toEqual` on an object literal, `expect` inside `catch`,
`toBeCalledWith` and other aliases, `queryBy*` asserted for presence,
`container.querySelector` / `parentElement`, an unawaited `findBy*`, queries
destructured from `render`, `fireEvent`, a side effect inside `waitFor`, and a
`waitFor` wrapping a single `getBy`.

The boundary is measured, not remembered: `lab/assertions/lint-coverage.spec.ts`
pins which rules fire. If it reddens, the line moved — rescope from the spec.
