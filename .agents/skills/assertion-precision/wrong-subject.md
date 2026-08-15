# Category 3 — The assertion has the wrong subject

The value was flattened, narrowed, or stood in for before `expect` saw it. What
it checks is real; what it leaves unguarded is the rest.

**Test for membership:** name what changes without this assertion noticing. If
a sibling field, another cell, or the order of a list can go wrong while it
stays green, it is here.

Category 1 cannot fail at all. These fail — just not for the defect in front of
them.

| Form | Leaves unguarded | Use |
| --- | --- | --- |
| `expect(row.name).toBe('Ada')` | every sibling field — `role`, `active` | `expect(row).toStrictEqual(record)` |
| `expect(row).toEqual({ id })` | a key present with value `undefined` | `toStrictEqual({ id })` |
| `expect(el.textContent).toBe('Ada…analyst…2019')` | which cell regressed — the subtree is one string | query the cell, then `toHaveTextContent` |
| `expect(el).toHaveTextContent('Ada…analyst…2019')` | same — substring/regex is the only gain | query the cell |
| `expect(el.innerHTML).toContain('<td>Ada')` | asserts markup, not what rendered | a role or text query |
| `expect(getAllByRole('row')).toHaveLength(4)` | which rows, and their order | project names, `toStrictEqual([...])` |
| `expect(tenure).toBe(3.3)` | nothing — but fails on correct arithmetic | `toBeCloseTo(3.3, 10)` |
| several assertions inside one `waitFor` | nothing — but pays the full timeout | await one, assert the rest outside |

## Measured

`expect(row.name).toBe('Ada Lovelace')` **passes** on
`{ name: 'Ada Lovelace', role: 'analyst', active: false }` when the contract
said `role: 'engineer', active: true`. `toStrictEqual` on the whole record
prints both objects and diffs them.

`expect({ id, role: undefined }).toEqual({ id })` **passes**. `toStrictEqual`
fails with `expected { id: 'emp-1', role: undefined } to strictly equal
{ id: 'emp-1' }`.

`toHaveTextContent` on a row prints
`Expected: Ada Lovelaceengineer2019 / Received: Ada Lovelaceanalyst2019` — the
same flattened string the raw read gives. Querying the cell prints
`Expected: engineer / Received: analyst`.

`expect(0.1 + 0.2).toBe(0.3)` fails with
`expected 0.30000000000000004 to be 0.3`. The arithmetic is correct; the
matcher is wrong. `toBeCloseTo(0.3, 10)` passes.

## The `waitFor` case

Multiple assertions inside one `waitFor` **do** name the one that failed — this
is not a reporting defect. The cost is time: the whole block retries until the
timeout, re-running the assertions already true on every tick.

```ts
await screen.findByRole('row', { name: /Ada/ })
expect(screen.getAllByRole('row')).toHaveLength(3)
expect(screen.getByRole('status')).toHaveTextContent('3 employees')
```

Await one condition, assert the rest outside: same message, immediate failure.
`no-wait-for-multiple-assertions` is enabled in this repo's config and does not
fire on it — a linter gap, not a linter pass.

## Already linted — do not report

| Form | Rule |
| --- | --- |
| `container.querySelector`, `.parentElement` | `no-node-access` |
| `fireEvent.click(...)` | `prefer-user-event` |
| `const { getByRole } = render(...)` | `prefer-screen-queries` |
| `await waitFor(() => expect(getBy...))` | `prefer-find-by` |
| a side effect inside `waitFor` | `no-wait-for-side-effects` |
| `queryBy*` asserted for presence | `prefer-presence-queries` |
