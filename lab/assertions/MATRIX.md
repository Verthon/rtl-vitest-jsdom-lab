# Assertion matrix

Which matcher to reach for per data type, and how much of that choice oxlint
already enforces. Every row is backed by a test:

- `assertion-precision.spec.ts` — runs both forms against the same defective
  value and asserts what each failure message actually carries. Reports are
  captured with `failureOf()`, which returns the message plus the inspected
  `actual` / `expected`, or `null` when the assertion passed.
- `lint-coverage.spec.ts` — lints each coarse form with this repo's own
  `.oxlintrc.json` and pins the rules that fire.

`oxlint` column: rule name means the coarse form is already rejected. **judgment**
means the linter is silent and a reviewer is the only line of defence.

| Data type | Coarse form | What its failure says | Precise form | oxlint |
|---|---|---|---|---|
| array — count | `expect(rows.length).toBe(4)` | `expected 3 to be 4` | `expect(rows).toHaveLength(4)` | `prefer-to-have-length` |
| array — which rows | `expect(rows).toHaveLength(4)` | previews the array, truncated after the first entry | `expect(names).toStrictEqual([...])` | judgment |
| array — membership | `expect(names.includes(x)).toBe(true)` | `expected false to be true` | `expect(names).toContain(x)` | `prefer-to-contain` |
| string | `expect(text.includes(x)).toBe(true)` | `expected false to be true` | `expect(text).toContain(x)` | `prefer-to-contain` |
| number — threshold | `expect(total > 1).toBe(true)` | `expected false to be true` | `expect(total).toBeGreaterThan(1)` | `prefer-comparison-matcher` |
| number — equality | `expect(page === 2).toBe(true)` | `expected false to be true` | `expect(page).toBe(2)` | `prefer-equality-matcher` |
| number — float | `expect(tenure).toBe(3.3)` | fails on `3.3000000000000003`, which is correct | `expect(tenure).toBeCloseTo(3.3, 10)` | judgment |
| number — presence | `expect(res.total).toBeDefined()` | passes on `NaN` | `expect(res.total).toBe(4)` | judgment |
| object — one field | `expect(row.name).toBe('Ada')` | passes while a sibling field is wrong | `expect(row).toStrictEqual(record)` | judgment |
| object — undefined key | `expect(row).toEqual({ id })` | passes on `{ id, role: undefined }` | `expect(row).toStrictEqual({ id })` | `prefer-strict-equal` (warn) |
| Set | `expect(ids.has(x)).toBe(true)` | `expected false to be true` | `expect(ids).toContain(x)` | judgment |
| Map | `expect(roles.get(x)).toBe('engineer')` | `expected undefined to be 'engineer'`, without naming the key | `expect(roles).toStrictEqual(new Map([...]))` | judgment |
| Date | `expect(a.getTime()).toBe(b.getTime())` | two epoch numbers | `expect(a).toStrictEqual(b)` | judgment |
| spy — arguments | `expect(spy.mock.calls[0][0]).toBe(url)` | two strings; every other call stays hidden | `expect(spy).toHaveBeenCalledWith(url)` | judgment |
| spy — called at all | `expect(spy).toHaveBeenCalled()` | passes however it was called | `expect(spy).toHaveBeenCalledWith(url)` | `prefer-called-with` |
| spy — alias | `expect(spy).toBeCalledWith(url)` | same, under a deprecated name | `expect(spy).toHaveBeenCalledWith(url)` | `no-alias-methods` |
| Error | `expect(fn).toThrow()` | passes on an error the code was never meant to throw | `expect(fn).toThrow('page must be a positive integer')` | `require-to-throw-message` |
| Promise | `try { await load() } catch (e) { expect(e.message)... }` | passes when nothing rejects — the assertion never runs | `await expect(load()).rejects.toThrow(msg)` | `no-conditional-expect` |
| null vs falsy | `expect(selectedId).toBeFalsy()` | passes on `''`, `0`, `undefined` | `expect(selectedId).toBeNull()` | judgment |

## Score

Nine of the eighteen coarse forms probed in `lint-coverage.spec.ts` are caught
by oxlint with the current config; nine are not. The linter covers the cases
where the *shape* of the expression is wrong — a comparison performed inside
`expect()`, a value reduced by `includes()`, a matcher used without its
argument. It is blind to every case where the expression is well-formed but
points at a value that was already flattened: a spy call read by index, one
field of a record, `toBeFalsy` where `toBeNull` was meant.

That second half is the problem space of this repo.

## Notes

- `toHaveLength` is not the end of the ladder. Its message previews the array
  but truncates after the first entry, and `actual` is the length, not the
  array — so it tells you the count is wrong, never which row is missing.
- The disable comments in `assertion-precision.spec.ts` are load-bearing
  documentation: a coarse form needs one exactly when oxlint already covers it.
- Rules fire that are not listed in `.oxlintrc.json` — `require-to-throw-message`
  is one. oxlint enables the vitest plugin's correctness-category rules once the
  plugin is on.
