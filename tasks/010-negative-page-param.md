# 010 — Pin the negative page param

Read `AGENTS.md` and `CONVENTIONS.md` first. Do only this task.

Add **one test** to `src/employee-directory/EmployeesPage.spec.tsx`: a URL
carrying a negative page number falls back to the first page.

Small on purpose. It closes a gap 006's verification found, and the reasoning
behind it matters more than the diff — read *Why this is not a code-oriented
test* before writing anything, because that section is the one an agent is most
likely to get wrong.

## The gap

`EmployeesPage.tsx` parses the page param through this guard:

```ts
const rawPage = Number(searchParams.get('page'))
const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1
```

It defends four input classes: absent, non-numeric, non-positive, non-integer.
The suite exercises **one and a half** of them.

Measured during 006 verification, by mutation, not by reading:

| Mutation | Result |
|---|---|
| Guard → `rawPage \|\| 1` | **27/27 still green** |
| Guard → `Number.isNaN(rawPage) ? 1 : rawPage` | 13 red, but *non-numeric* stays green |

The first mutation is the finding. `Number('abc')` is `NaN` and `NaN || 1` is
`1`, so the much weaker `|| 1` answers the `?page=abc` case identically — the
test named *falls back to the first page for a non-numeric page param* cannot
tell the two implementations apart.

The second mutation locates what the suite actually pins. `searchParams.get`
returns `null` for a missing key and `Number(null)` is `0`, not `NaN`, so a
NaN-only guard sends every ordinary render to page 0 — hence 13 failures. The
absent-key branch is covered many times over. The `>= 1` branch is covered by
nothing, and `?page=-3` reaches the query layer today with no test to catch a
regression.

## Why this is not a code-oriented test

This was raised as an objection when the task was scoped, and the answer is the
reason the task exists in this form. **Read it before you write the test, and do
not "improve" the case list afterwards.**

A test is code-oriented when it asserts on a mechanism the user cannot observe.
`expect(parseSearchParams('-3')).toEqual({ page: 1 })` would be code-oriented:
it names a private function, and inlining that function breaks the test while
the app keeps working.

`?page=-3` is not a mechanism. It is a URL a user can be holding — hand-edited,
a bookmark gone stale, a bad link built elsewhere. The behavior under test is
*the app shows the first page instead of breaking*, which is observable in a
browser by someone who does not know a parse function exists. That is the same
shape as the `?page=abc` test already in the spec.

The check, applied to the test you are about to write: rename
`parseSearchParams`, inline it, or move the clamp into the component body. The
test must still pass. It is pinned to a URL and to rendered output, nothing
else.

**`?page=1.5` was deliberately excluded on exactly this ground.** No user
arrives with a fractional page. That case exists only because `Number.isInteger`
appears in the implementation, which is reasoning backwards from code to test —
the definition of code-oriented. `?page=0` was excluded too, as a weaker version
of the same argument.

Do not add either one. If you think one earns its place, that is a finding to
report, not an edit.

## Decisions — settled. Do not substitute your own.

- **One test, one input: `?page=-3`.** Not a second case, not `it.each`, not a
  table. The existing non-numeric test stays exactly as it is — do not fold it
  into a shared shape, and do not touch it at all.
- **Do not change `EmployeesPage.tsx`.** The guard is correct. This task proves
  it, it does not modify it. Whether `isInteger` earns its place given that no
  user reaches that branch is a separate question that was explicitly deferred.
- **Copy the structure of the non-numeric test** at spec lines 161–175. Same
  inline `TestAppProviders` wrapper with `routerProps.initialEntries`, same
  three assertions. It renders without the `LocationProbe`, and so does this
  one — the URL is the *input* here, not the thing being asserted.
- **Name it** `falls back to the first page for a negative page param`. Parallel
  to the existing name, one word different.
- **Place it directly after the non-numeric test**, so the two bad-input cases
  read together.

## Steps

1. Read `src/employee-directory/EmployeesPage.spec.tsx` lines 161–175 — the test
   you are copying — and the helpers at the top of the file (`dataRows`,
   `findRowByName`, `mockEmployees`).

2. Add the test after it:

   ```tsx
   it('falls back to the first page for a negative page param', async () => {
     render(<EmployeesPage />, {
       wrapper: ({ children }) => (
         <TestAppProviders routerProps={{ initialEntries: ['/employees?page=-3'] }}>
           {children}
         </TestAppProviders>
       ),
     })

     await findRowByName(mockEmployees[0].name)

     expect(dataRows()).toHaveLength(10)
     expect(screen.getByText('Showing 1-10 of 47')).toBeInTheDocument()
     expect(screen.getByRole('button', { name: 'Go to previous page' })).toBeDisabled()
   })
   ```

3. `npx vitest run src` → **28 passed / 5 files**. If any other count appears,
   stop and report; something moved that this task did not touch.

4. **Mutation-check it. This is the step the task exists for** — a new test that
   cannot fail is worth less than no test, and the whole finding above is that a
   plausible-looking test was not pinning what it appeared to pin.

   **Mutate and restore in a single tool call.** Not two calls, not "restore
   next". A mutation left live in the tree is how the previous session ended.

   | Mutation | Must redden |
   |---|---|
   | `Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1` → `rawPage \|\| 1` | the new test, **and nothing else** |

   `?page=-3` gives `Number('-3') === -3`, which is truthy, so `\|\| 1` passes
   `-3` straight through. Exactly one test must go red. If more than one does,
   the mutation reached further than intended and the result is not a pass —
   report it rather than accepting the red.

   Then confirm the restore: 28/28 green again, in the same call.

5. Gates, all four:

   ```bash
   npm run build && npx vitest run src && npx oxlint && npm run scan:dead-code
   ```

   Expected, and these are measured figures rather than guesses — a deviation is
   a finding:

   | Gate | Expected |
   |---|---|
   | `npm run build` | passes |
   | `npx vitest run src` | **28 passed / 5 files** |
   | `npx oxlint` | **14 warnings**, unchanged |
   | `npm run scan:dead-code` | unchanged: 1 file / 13 exports / 1 type |

   The oxlint count must not move. The new test uses role queries only and adds
   no `data-testid`, so a fifteenth warning means something else came in with
   it.

## Report

State plainly:

- The mutation result — which test reddened, how many others, and the restore
  confirmation.
- Whether the four gates matched the table above, with any deviation named.

If you concluded the excluded cases (`?page=0`, `?page=1.5`) should be in scope
after all, say so as a finding with your reasoning. Do not add them.
