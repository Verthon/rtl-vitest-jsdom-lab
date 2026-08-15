# Category 2 — The failure does not name the defect

Fails correctly, reports uselessly. The message is two primitives, so the
reader learns something differs without learning what.

**Test for membership:** read the failure aloud. If it does not contain the
name of the thing that broke — the row, key, element, or call — it is here.

Every message below is measured output, not paraphrase. Quote it in the review
comment: the consequence is the justification.

| Form | Failure says | Use |
| --- | --- | --- |
| `expect(ids.has(x)).toBe(true)` | `expected false to be true` — members lost | `expect(ids).toContain(x)` |
| `expect(employees).toHaveLength(4)` | count only; array preview truncates after entry 1 | project, then `toStrictEqual([...])` |
| `expect(roles.get(k)).toBe('engineer')` | `expected undefined to be 'engineer'` — key never named | `toStrictEqual(new Map([...]))` |
| `expect(a.getTime()).toBe(b.getTime())` | `expected 1767225600000 to be 1772323200000` | `expect(a).toStrictEqual(b)` |
| `expect(el.checked).toBe(true)` | `expected false to be true` — no element in report | `toBeChecked()` |
| `expect(el.disabled).toBe(true)` | same | `toBeDisabled()` |
| `expect(el.value).toBe('Ada')` | two strings, no element | `toHaveValue('Ada')` |
| `expect(el.getAttribute('href')).toBe('/x')` | two strings, no element | `toHaveAttribute('href', '/x')` |
| `expect(el.classList.contains('on')).toBe(true)` | `expected false to be true` | `toHaveClass('on')` |

`toStrictEqual` on a Date prints
`expected 2026-01-01T00:00:00.000Z to strictly equal 2026-03-01T00:00:00.000Z`.
`toBeChecked()` prints the serialized element. Same pass/fail behaviour, a
message you can read.

## `expected false to be true` has four sources — you own one

Identical message, and the linter catches every one except the Set:

| Form | Linted |
| --- | --- |
| `expect(names.includes(x)).toBe(true)` | `prefer-to-contain` |
| `expect(total > 1).toBe(true)` | `prefer-comparison-matcher` |
| `expect(page === 2).toBe(true)` | `prefer-equality-matcher` |
| **`expect(ids.has(x)).toBe(true)`** | **nothing** |

`.has()` on a `Set`/`Map`, `.contains()`, and any predicate the test computed
itself escape the net that catches their three siblings. When this message
appears in CI, that is the family it came from.

## The one that misleads

```ts
expect(spy.mock.calls[0][0]).toBe('/employees?page=2')
// expected '/employees?page=1' to be '/employees?page=2'
```

This looks like a clean diff, so it survives review. But the spy was called
twice and the call that was actually wrong — `page=3` — appears nowhere.
Indexing picked one call and hid the rest.

```ts
expect(spy).toHaveBeenCalledWith('/employees?page=2')
//   1st call: - "/employees?page=2"  + "/employees?page=1"
//   2nd call: - "/employees?page=2"  + "/employees?page=3"
//   Number of calls: 2
```

Use `toHaveBeenNthCalledWith(n, ...)` when position genuinely is the claim — it
keeps the call count in the report.

## Not here

Anything green on a broken value is category 1 and outranks this. `.length`
routed through a number matcher is `prefer-to-have-length`.
