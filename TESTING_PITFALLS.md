# Testing pitfalls (problem space)

RTL + happy-dom + Vitest mistakes that aren't caught by the linter — judgment
calls, not mechanical rules. One to two sentences each; longer write-ups in
the matching `DRAFT_FE_TESTING_*.md`.

- **Assertion noise** — Setup/filtering logic mixed into the assertion buries
  what's actually being claimed. (`ASSERTION_NOISE`)
- **Assertion precision** — A coarse assertion (`toBe(true)`, a manual
  property check) throws away information a more specific matcher would have
  printed on failure. Enforced by
  `.agents/skills/assertion-precision/SKILL.md`; the caught/uncaught boundary
  and the per-type matcher table are measured in `lab/assertion-precision/MATRIX.md`.
  (`ASSERTION_PRECISION`)
- **Behavior vs. state** — Asserting on a component's internal state or
  structure instead of what a user can observe couples the test to details
  the author is free to change. (`BEHAVIOR_VS_STATE`)
- **Component mocks** — Mocking a component to unblock a test makes every
  claim about that subtree a claim about the mock, and the mock silently
  drifts from the real component's props. Enforced by
  `.agents/skills/component-mocks/SKILL.md`; the drift boundary — typing
  catches renames, not additions — is measured in
  `lab/component-mocks/typed-mock-drift.spec.ts`. (`COMPONENT_MOCKS`)
- **False-pass / false-fail taxonomy** — "False positive" is ambiguous
  between "failed on good code" and "passed on bad code"; say false-pass /
  false-fail / true-pass / true-fail instead. (`FALSE_PASS_TAXONOMY`)
- **Fixture coupling** — A shared fixture accumulates fields until no single
  test's dependency on it is visible, so one edit reddens tests with no
  signal about which failures are real. (`FIXTURE_COUPLING`)
- **Hidden async** — Servicing async work the test holds no reference to
  (timers, un-awaited microtasks) turns the scenario into bookkeeping for the
  runtime instead of a description of user behavior. (`HIDDEN_ASYNC`)
- **Logic in tests** — Computed expected values or branches inside a test can
  reproduce the same mistake as the implementation and pass for the wrong
  reason; state the expectation literally. (`LOGIC_IN_TESTS`)
- **Mocking as diagnosis** — How hard a dependency is to mock reflects how
  the code acquires it, not a tooling gap; repeated awkward mocking across
  unrelated axes is a design signal worth reading. (`MOCKING_AS_DIAGNOSIS`)
- **One reason to fail** — A regression should redden roughly one test whose
  name explains it; a behavior asserted everywhere or one test claiming
  several unrelated things both break that mapping. (`ONE_REASON_TO_FAIL`)
- **Opaque wrappers** — A test helper named after its contents rather than a
  real concept hides the claim behind a word only the author understands.
  (`OPAQUE_WRAPPERS`)
- **Sad path** — Failure states (validation, server fault, network fault,
  timeout) are distinct and usually untested; the common bug is a loading
  state with no exit on the failing path. (`SAD_PATH`)
- **The test that cannot fail** — An assertion that's unreachable, already
  guaranteed by the type system, or simply absent looks like coverage but
  isn't; verify by breaking it once on purpose. (`TEST_THAT_CANNOT_FAIL`)
