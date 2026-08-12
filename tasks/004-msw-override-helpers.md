# Task 004 — MSW response override helpers

Status: draft — scope not yet locked, see open questions
Depends on: 002 (envelope + real handler). Not hard-blocked by 003.
Scope: `src/employee-directory/mocks.ts` and/or `src/testsConfig/`.

## Goal

Per-test control over what the employees endpoint returns, without hand-writing
an `http.get(...)` block in every spec. The shared handler from 002 stays the
happy path; these helpers cover the exceptions.

## Cases to cover

- **Error statuses** — 401, 403, 500. Enough to drive the error branch and,
  later, auth-dependent behavior.
- **200 with a different payload** — empty `data`, a single page (`total` <
  `perPage`), a specific slice, a partial last page.
- **Latency** — a delayed response, so loading states and in-flight races are
  assertable. MSW's `delay()`.
- **Network failure** — `HttpResponse.error()`, which is a different code path
  from a 500 in most clients including ky.

## Shape

Helpers wrap `server.use()` and are called from inside a test:

```ts
mockEmployeesError(500)
mockEmployeesResponse({ data: [], total: 0 })
mockEmployeesDelay(200)
```

Each must be scoped to a single test — `server.resetHandlers()` in the existing
setup file already handles teardown; verify it does before relying on it.

## Open questions — resolve before implementing

1. **Where do these live?** Colocated in `src/employee-directory/mocks.ts`
   alongside the happy-path factory, or in `src/testsConfig/` as generic
   builders? Colocated keeps the slice self-contained and matches the VSA
   convention; `testsConfig/` avoids duplicating the same four helpers for every
   future slice. Leaning colocated until a second slice proves the duplication.

2. **Generic or per-slice?** A generic `mockEndpointError(path, status)` is less
   code but loses type safety on the payload. A typed
   `mockEmployeesResponse(partial: Partial<Paginated<Employee>>)` catches
   fixture drift at compile time — which matters, since fixture coupling is one
   of the pitfalls this repo documents.

3. **Does the helper own `server.use()` or return a handler?** Owning it is
   terser at the call site. Returning a handler is more composable when a test
   needs to override two endpoints at once. Probably owning it, given there is
   one endpoint today.

## Note on pedagogy

These helpers make error-path tests easy to write, which makes it easy to write
one that passes for the wrong reason — a 500 override plus retries left enabled
on the test query client means the assertion either times out or resolves late.
That interaction is itself a pitfall worth capturing once this lands.

## Constraints

- No code comments (project convention).
- Do not change the shared happy-path handler's behavior.

## Verification

```bash
npm run build
npm run test:unit
npm run lint
npm run scan:dead-code
```
