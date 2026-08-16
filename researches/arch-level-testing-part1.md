---
name: fe-testing-architect-problems
description: Map of architect-level problems in frontend test suites — test placement, accuracy (false positive/negative), contracts frozen by tests, suite economics, metrics, and description language. Problem catalog, not solutions.
---

# Architect-Level Frontend Testing Problems

Six problem areas. Each entry: what it is, why it hurts, when it bites, and the cutting question.

**Deliberately out of scope**: query strategy (a11y vs testid), assertion quality, no-logic-in-tests, happy/sad paths, mocking internals, testing-trophy shape, component-library testing, framework specifics, mutation testing, browser-vs-jsdom migration.

---

## 1. Placement — where in the tree does a test live?

### 1.1 No declared boundary

The level is chosen per-PR by whoever writes the test. There is no artifact that says "we test at X."

**Why it hurts**
- Two engineers cover the same behavior at two levels; neither knows.
- Reviewers can't reject a test for being at the wrong level — there's no standard to cite.
- The suite's shape is an accident, so you can't reason about what it protects.

**When it bites**: onboarding, and the first big refactor — nobody can predict which tests will break.

**Question**: Where is the test boundary written down, and what happens in review when someone crosses it?

---

### 1.2 Route-level as default — and where it breaks

Route component is a reasonable default: it's the smallest unit a user can name. It stops being reasonable in specific, recognizable shapes.

| Shape | Why route-level fails |
|---|---|
| **Journey spans routes** (checkout, multi-step wizard, OAuth return) | A route test asserts a fragment of a use case. The seams between steps — the part that actually breaks — are covered nowhere. |
| **Route is a thin shell** | 40 lines of setup to reach 3 lines of interesting behavior. Cost per assertion is dominated by irrelevant tree. |
| **Behavior renders outside the route subtree** | Portals, toasts, global modals, notification centers. The route test can't see the outcome, so it asserts a proxy instead. |
| **Combinatorial context** | auth state × tenant × feature flag × permissions. Multiplying at the most expensive level. Route tests become the slowest and least specific thing you own. |
| **Behavior is lifecycle- or time-driven** | Poll, revalidate-on-focus, background refetch, cache invalidation. Route mount/unmount doesn't express it. |
| **Same component, different route params** | You test the component N times through the route instead of once directly. |

**Question**: For this behavior, can a user name the thing that changed? If yes — which screen? If the answer is "several," route level is the wrong container.

---

### 1.3 Parametric vs contextual components tested identically

Noam Rosenthal's distinction (Smashing Magazine, *Testable Frontend*): **UI building blocks** are parametric — driven by props, few environment demands. **App widgets** are contextual — few props, heavy demands on context, stores, data.

**Why it hurts**
- Testing an app widget like a building block means constructing a fake environment. That environment is a fiction that drifts from the app as the app changes, and the test then reports on the fiction.
- Testing a building block like an app widget means paying full route setup for a date picker.

**When it bites**: when the fake context (store shape, provider set, hook mocks) needs updating in 60 test files because one provider changed.

**Question**: Does this component need *arguments* or does it need a *world*? Two different test strategies follow.

---

### 1.4 No map from user journey to test level

Nik Sumeiko (Erste/George, ~1.5M LOC React) states it as a routing rule: critical user journeys → E2E; use cases and edge cases → integration; view-model logic → unit.

**Why it hurts**
- Without the map, "is this covered?" is unanswerable, so teams answer it with coverage % instead (see §5).
- Journeys the business cares about get tested at whatever level was convenient — usually the cheapest, which is the least like production.

**When it bites**: an incident review asks "why didn't a test catch this?" and the honest answer is that no level owned that behavior.

**Question**: Name your top 5 revenue/risk journeys. For each — which test file fails first if it breaks?

---

### 1.5 Duplicate coverage across levels

The same behavior asserted in a unit test, a route test, and an E2E.

**Why it hurts**
- Cost multiplies on every change: one behavior change → three test edits.
- Defect localization inverts: three failures, none narrower than the others, so the failure tells you less than one well-placed test would.
- It hides gaps — high test count on covered behavior masks uncovered behavior.

**When it bites**: a small requirement change produces a suspiciously large diff in test files.

Fowler's caveat cuts the other way too (bliki/TestPyramid, note 2): if the higher-level test is fast, reliable, and cheap to change, the lower-level one isn't needed. Duplication is a decision, not automatically a smell — but it should be a decision.

**Question**: If this behavior changes, how many test files must change? Is that number intentional?

---

### 1.6 The gap between levels

Behavior that lives *between* your chosen boundaries: cross-route state, cache invalidation after a mutation, retry/backoff, optimistic update rollback, focus restoration, storage sync across tabs.

**Why it hurts**
- It's the behavior most likely to be wrong (it's the integration), and it's structurally invisible to both the unit tests below and the E2E above.
- E2E "covers" it only accidentally — passing E2E is not evidence the invalidation logic is right, only that this one path happened to work.

**When it bites**: stale data bugs, double-submits, "it works until you navigate away and come back."

**Question**: Which behaviors in this app belong to no single component or route? Which test file owns each one?

---

## 2. Accuracy — the false positive / false negative matrix

Khorikov's framing (*Unit Testing: Principles, Practices, and Patterns*): a test's value is set by two of the four pillars — protection against regressions (catches real bugs) and resistance to refactoring (doesn't cry wolf).

|  | Code is correct | Code is broken |
|---|---|---|
| **Test passes** | ✅ correct | ❌ **False negative** — missed regression |
| **Test fails** | ❌ **False positive** — false alarm | ✅ correct |

> Terminology warning: Khorikov calls a *failing test on correct code* a false positive (a false alarm about a bug). Parts of the regression-testing literature reverse the labels — there, a "false positive" flags a change that full revalidation would pass. Agree on the convention before using the matrix in review, or half the team will read the axis backwards.

### 2.1 The trade that nobody makes explicitly

Teams feel false positives (red CI, wasted afternoon) and don't feel false negatives (silence). So the reflex fix is to mock more — pin the environment so the test stops moving.

**That converts FP into FN.** Every mock is an assumption about a collaborator, frozen at the moment of writing, never re-validated. The suite gets quiet and stops protecting anything.

**Question**: In the last 10 test failures, how many were real bugs? Now: in the last 10 production bugs, how many had a passing test over that code?

---

### 2.2 FE sources of false positives — Meszaros's four sensitivities

Gerard Meszaros (*xUnit Test Patterns*, Fragile Test) attributes brittle tests to four sensitivities. Mapped to frontend:

| Sensitivity | Frontend cause |
|---|---|
| **Interface** | Prop/hook signature change, component split or merge, a test-only prop removed, a context provider renamed. Test fails to compile or run — nothing about behavior changed. |
| **Behavior** | The SUT actually changed. This is the *only* one you want. |
| **Data** | Shared fixture/factory edited for one test, breaking others. Seeded MSW data. Snapshot files. Faker without a fixed seed. |
| **Context** | Timezone, locale, `Intl` output, viewport, feature-flag defaults, generated IDs (`useId`), module-level state leaking between files, test order. |

The point of the taxonomy: **before "fix the flaky test," name the sensitivity**. Data and context sensitivity are fixture-architecture problems, not test-writing problems, and fixing them one test at a time never converges.

```ts
// Context-sensitive: passes in CI (UTC), fails on a dev machine in CET
expect(screen.getByText('15 Jan 2026')).toBeInTheDocument()

// Data-sensitive: this test's expectation is owned by a file it doesn't import
const order = orderFactory() // someone adds a discount field → assertion moves
expect(screen.getByText('Total: $100')).toBeInTheDocument()
```

**Question**: For each red test this sprint — which of the four sensitivities was it? If more than half are data or context, the fixture layer is the defect.

---

### 2.3 FE sources of false negatives

| Pattern | Why it can't fail |
|---|---|
| **Render-only smoke test** | `render(<X />)` with no consequential assertion. Passes on any tree that doesn't throw. |
| **Assertion on the double, not the outcome** | `expect(mockNavigate).toHaveBeenCalled()` — verifies the test's own wiring, not that the user got anywhere. |
| **Query that always matches** | `getAllBy*` then `toBeDefined`, or asserting on a container node rather than content. |
| **Mock drifted from real module** | The module changed shape; the mock didn't; the test still passes. Nothing in CI compares them. |
| **Error swallowed by a boundary** | A throw inside the tree is caught by an ErrorBoundary or a `catch` in a query client. Test sees a rendered fallback and moves on. |
| **Assertion beats the async settle** | Passes because it ran against the loading state, not the resolved one. Also passes when the resolution is wrong. |

```ts
// Can't fail: asserts the test's own mock, not the app's behavior
expect(trackEvent).toHaveBeenCalledWith('checkout_started')

// Can fail: asserts what the user or the next system actually observes
expect(await screen.findByRole('heading', { name: 'Payment' })).toBeVisible()
```

**Question**: Break the production code deliberately. Which tests go red? Paul Hammond describes exactly this as his review habit — pull the branch, break something, watch the tests. If nothing goes red, the coverage number is fiction.

---

## 3. Contracts — what a test silently freezes

### 3.1 Every test is a contract on the environment, not just the code

Rosenthal's framing: writing a test creates a de-facto contract that includes the mocked environment. A contract stated as "given username U and password Y, login returns OK" is stable. A contract stated as "given this `useState` holds 14 and the store holds a three-item `userCache`" is brittle and unownable.

**Why it hurts**: the contract is never written down, so nobody decides whether to keep it. It's discovered at refactor time, as a failure.

**Question**: Write this test's contract in one plain sentence, including its environmental assumptions. Would a product person recognize it? If it needs internal state to state, you've frozen an implementation.

---

### 3.2 Fakes and handlers as an unowned second backend

MSW handlers, fixture JSON, and stub gateways are a parallel implementation of the API. Nobody owns them, nothing versions them, no CI job compares them to the real thing.

**Why it hurts**
- Green build, broken software — the failure mode the contract-testing tools exist to prevent (see mockingjay-server's stated goal, and Fowler/Vocke on contract tests ensuring faithful doubles).
- The handler set encodes the API as it was understood on the day it was written. API evolution is silent to your suite.
- Worse than no test: the suite reports confidence it does not have.

**When it bites**: backend ships a non-breaking-by-their-definition change (nullable field, renamed enum, pagination shape). Every FE test passes. Production 500s.

**Related**: Fowler's self-initializing fake includes the missing half — a separate suite that replays recorded calls against the real service and checks the recording still holds.

**Question**: What in CI fails when the backend changes response shape, before production does?

---

### 3.3 Test-only surface as public API

`data-testid`, test-only props, exported-for-testing internals, and `window.__TEST__` hooks are an API you now maintain, with no consumer who complains when it rots.

**Why it hurts**: it accretes, it's invisible to product, and removing any of it breaks tests in files nobody remembers.

**Question**: How many test-only affordances exist in the production bundle, and who deletes them when the test that needed them is deleted?

---

## 4. Suite economics — how suites degrade

### 4.1 Slow degradation is architectural, not per-test

Vitest's own performance docs name the costs: creating the DOM environment runs roughly 200–500 ms per file for jsdom and ~90–200 ms for happy-dom; with the default isolating pool that cost is paid **per test file**, as is worker preparation. Barrel-file imports mean each file re-evaluates a shared module graph.

**Why it hurts**
- The cost scales with *file count and import graph*, not with test count or test complexity. "Write faster tests" cannot fix it.
- It degrades continuously and invisibly: nobody's PR is the one that made it slow.
- Past a threshold, engineers stop running the suite locally. The feedback loop that justified the tests is gone, but the maintenance cost stays.

**When it bites**: watch mode gets abandoned; then `.only` becomes normal; then CI is the only place tests run.

**Question**: What is the suite's time budget, who watches it, and what happens on the PR that exceeds it?

---

### 4.2 Global setup accretion

Every provider added to the shared render wrapper taxes all N tests forever. Meszaros calls the general shape **General Fixture** (fixture setup far larger than any one test needs) and **Fragile Fixture** (a shared fixture change breaking unrelated tests).

```ts
// A tax on every test in the suite, added one PR at a time
const renderApp = (ui: ReactNode) =>
  render(
    <QueryClientProvider client={qc}>
      <ThemeProvider><I18nProvider><FeatureFlags><Router><Analytics>
        {ui}
      </Analytics></Router></FeatureFlags></I18nProvider></ThemeProvider>
    </QueryClientProvider>
  )
```

**Why it hurts**: the cost is diffuse (nobody attributes 200 ms to their provider), and it's a data/context-sensitivity generator — one provider default change reddens the suite.

**Question**: Which of these providers does *this* test actually need? Is there any render helper that isn't the maximal one?

---

### 4.3 Flakiness compounds, and the response makes it worse

The arithmetic is brutal: 10 tests each failing 1% of the time → roughly 1 in 10 builds red; at 50 such tests it's ~4 in 10 (Artsy's writeup of Fowler's article).

**Why it hurts**
- Red stops meaning broken. Once "just re-run it" is normal, the suite has no authority and real regressions get re-run past.
- Automatic retry as policy converts a race condition into a permanent, invisible one.
- Quarantine without a cap is worse than deleting: coverage erodes silently. Fowler's own remedy is a hard numeric limit on the quarantine (e.g. 8) that forces cleanup.

**Question**: How many quarantined/skipped tests exist, what's the cap, and when was the last one fixed rather than added?

---

### 4.4 Project-level smells are the real dashboard

Meszaros splits smells three ways — code, behavior, and **project** — where project smells are the ones visible to management: Buggy Tests, Developers Not Writing Tests, High Test Maintenance Cost, Production Bugs.

Use them as the entry point, then trace down:

| Project symptom | Look at |
|---|---|
| Production bugs in code that has tests | §2.3 false negatives, §3.2 fake drift |
| Test edits dominate feature PRs | §1.5 duplication, §2.2 fragility |
| Engineers skip writing tests for a module | §1.3 wrong strategy for contextual components, §4.2 setup cost |
| Red builds routinely re-run | §4.3 flakiness |

---

## 5. Metrics — what a coverage gate actually does to your architecture

### 5.1 Coverage as a target

Fowler (bliki/TestCoverage): coverage is useful for finding untested code, near-useless as a number describing test quality — and high numbers are cheap to reach with low-quality tests. Make it a target and people will hit it.

### 5.2 The FE-specific harm nobody notices

**A per-file coverage gate silently overrides your test placement strategy.**

- Coverage is attributed per file. A route-level integration test that exercises 12 files spreads its credit thin and leaves each file "under threshold."
- The cheapest way to make a specific file green is a test *of that file* — which is exactly the unit-level, mock-heavy, contextual-component test §1.3 says not to write.
- So the gate manufactures the tests with the worst false-negative and fragility profile, and it does so without anyone deciding.

**Question**: Does our coverage gate reward tests at the level we said we test at? If not, which one is going to win?

### 5.3 Coverage counts execution, not verification

Rendering a component executes its lines. A route test with a single weak assertion can carry a file to 80% while asserting nothing about it. Coverage cannot distinguish this from real verification.

### 5.4 The alternative frame

Kent C. Dodds: shift from code coverage to **use-case coverage** — coverage reports are useful for spotting *use cases* nobody covered, not as a score.

Khorikov's four-code-types quadrant, read for frontend:

| Quadrant | Frontend example | Test posture |
|---|---|---|
| **Domain / algorithms** (complex, few collaborators) | Pricing, validation rules, permission resolution, view-model derivation | Highest value per test |
| **Trivial** (simple, few collaborators) | Presentational components, prop pass-through, formatters over one field | Shouldn't be tested at all — yet these are exactly what a coverage gate hunts |
| **Controllers** (simple, many collaborators) | Route components, container components, orchestration hooks | Briefly, via integration |
| **Overcomplicated** (complex, many collaborators) | The 600-line feature component with 9 hooks | Not a testing problem — split it first |

**Question**: What fraction of our test files sit in the trivial quadrant? What put them there?

---

## 6. Descriptions — the suite as a readable spec

### 6.1 Vocabulary drift

Test names in developer vocabulary ("renders the modal when isOpen is true") while requirements are in product vocabulary ("a user with an expired card is warned before checkout").

**Why it hurts**
- Nobody can audit the suite against requirements, so coverage questions get answered with §5 numbers instead.
- The suite loses its second job — being the executable description of what the product does.

Khorikov's rule (*You are naming your tests wrong!*): no rigid naming policy; name the test as if describing the scenario to a non-programmer familiar with the domain. His related point matters more than the naming: the unit under test is a **unit of behavior**, not a class or a file — the number of modules it spans is irrelevant.

```ts
// Developer vocabulary — describes the code
describe('CheckoutForm', () => {
  it('calls onSubmit with valid payload when fields are filled', ...)
})

// Domain vocabulary — describes the product
describe('checkout', () => {
  it('rejects an order when the saved card has expired', ...)
})
```

### 6.2 The naming failure is a design signal

If a behavior can't be named in domain terms, usually there's no domain seam to name — the logic is dissolved into rendering. The naming problem is the visible end of a structural one.

**Question**: Read 10 test names aloud to a product manager. How many can they confirm or deny?

### 6.3 describe() nesting that mirrors the component tree

Nesting that encodes file/component structure makes the suite **structure-sensitive** — Kent Beck's desiderata lists structure-insensitivity (results don't change when code structure changes) and behavioral sensitivity (results change when behavior changes) as separate, both-wanted properties.

**Why it hurts**: moving or splitting a component reorganizes the test file even though nothing observable changed — a pure interface-sensitivity generator, at file scale.

**Question**: If we merged two components tomorrow, would any test file need to move?

---

## Using this map

1. Start at §4.4 — project symptoms are what people actually report.
2. Trace to the area, then to the entry.
3. Ask the cutting question before proposing anything. Most of these are decisions that were never made, not mistakes that were made.

**Principle**: none of these are rules. Every one is a trade. Fowler's own footnote applies throughout — if high-level tests are fast, reliable, and cheap to change, the lower-level ones aren't needed. The failure is not choosing wrong; it's not choosing.

---

## Sources

- Vladimir Khorikov — *Unit Testing: Principles, Practices, and Patterns* (four pillars; false positives; four types of code; unit of behavior). Blog: <https://enterprisecraftsmanship.com/posts/you-naming-tests-wrong/>. Interview covering the pillars: <https://techleadjournal.dev/episodes/58/>
- Gerard Meszaros — *xUnit Test Patterns*. Fragile Test / four sensitivities: <http://xunitpatterns.com/Fragile%20Test.html>; Buggy Tests: <http://xunitpatterns.com/Buggy%20Tests.html>; smell taxonomy and Slow Tests causes (JAOO 2009 slides): <http://jaoo.dk/dl/jaoo-aarhus-2009/slides/GerardMeszaros_XUnitTestPatternsRefactoringTestCodeToImproveROI.pdf>; project smells chapter: <https://www.oreilly.com/library/view/xunit-test-patterns/9780131495050/ch17.html>
- Martin Fowler — Test Coverage: <https://martinfowler.com/bliki/TestCoverage.html>; Test Pyramid: <https://martinfowler.com/bliki/TestPyramid.html>; Self Initializing Fake: <https://martinfowler.com/bliki/SelfInitializingFake.html>; Eradicating Non-Determinism in Tests (quarantine + cap)
- Kent Beck — Test Desiderata: <https://medium.com/@kentbeck_7670/test-desiderata-94150638a4b3>, <https://testdesiderata.com/>
- Noam Rosenthal — *Testable Frontend: The Good, The Bad And The Flaky*, Smashing Magazine: <https://www.smashingmagazine.com/2022/07/testable-frontend-architecture/>
- Kent C. Dodds — How to know what to test (use-case coverage): <https://kentcdodds.com/blog/how-to-know-what-to-test>
- Nik Sumeiko — CUJ → E2E / use cases → integration / view-model logic → unit (LinkedIn posts on the George/Erste React codebase)
- Paul Hammond (citypaul) — break-something-and-watch-the-tests review habit; <https://github.com/citypaul/fullstack-react-tdd-example>
- Vitest — Improving Performance / Profiling Test Performance (per-file environment and isolation costs): <https://main.vitest.dev/guide/improving-performance>, <https://vitest.dev/guide/profiling-test-performance>
- Artsy Engineering — flakiness compounding arithmetic: <https://artsy.github.io/blog/2014/01/30/isolating-spurious-and-nondeterministic-tests/>
- mockingjay-server — consumer-driven contracts framing: <https://github.com/quii/mockingjay-server>