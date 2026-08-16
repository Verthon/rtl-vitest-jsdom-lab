---
name: fe-testing-architect-problems-round-2
description: Second batch of architect-level frontend test-suite problems — fixture and double architecture, time and scheduling, test selection, migration cost, cross-team ownership, deletion policy, AI-generated volume, configuration axes, and the suite as documentation. Problem catalog, not solutions.
---

# Architect-Level Frontend Testing Problems — Round 2

Continues the numbering from round 1 (§1 placement, §2 accuracy, §3 contracts, §4 suite economics, §5 metrics, §6 descriptions). Same entry shape: what it is, why it hurts, when it bites, the cutting question.

Same exclusions as round 1. Additional exclusion here: anything already covered by §1–§6.

---

## 7. Test data and doubles as a system

The fixture layer is a second codebase with its own domain model, its own coupling, and usually no owner.

### 7.1 The factory graph is an unowned parallel domain model

`buildUser()`, `buildOrder()`, `aCartWith()` encode the shape of your API responses. Nothing checks them against the API, and nothing checks them against each other.

**Why it hurts**
- The factory is the only place the wire shape is written down as data. It becomes the de-facto schema, so it accretes fields nobody uses and loses fields the backend added.
- The graph gets deep — an order factory pulls a customer factory pulls an address factory. One test that cares about a discount instantiates 40 fields.
- Change propagation is invisible: renaming a field in the factory either flips 200 tests at once or, worse, flips none because most tests never read it.

**When it bites**: a backend field rename ships, the suite stays green, the app 404s in staging.

**Question**: If the backend adds a required field tomorrow, which artifact fails first — a type, a factory, or a test? If the answer is "a human in code review," you don't have a fixture architecture.

### 7.2 Factory defaults carry business meaning nobody declared

A default is not neutral. `status: 'active'`, `role: 'admin'`, `items: [one]`, `currency: 'USD'` each select a business branch.

**Why it hurts**
- Most of the suite silently tests one branch. Coverage says the file is covered; the covered path is whatever the default happened to be.
- Changing a default rewrites the meaning of every test that didn't override it — without changing a single line of test text. That's the worst possible diff: semantics move, review sees nothing.
- Tests that pass *because* of a default read as if they pass because of the behavior. Meszaros calls the general form Mystery Guest; here the guest is a value with domain significance.

```ts
export const buildSubscription = (over: Partial<Subscription> = {}): Subscription => ({
  id: 'sub_1',
  status: 'active',
  trialEndsAt: null,
  seats: 1,
  ...over,
})
```

Every test that never mentions `status` is a test of the active path. Flip the default to `'past_due'` and the suite still passes — different suite now.

**When it hurts most**: when the default is the *happy* value, because then the sad paths only exist where someone remembered to override.

**When it bites**: an incident on a state (trialing, past_due, cancelled) that has hundreds of tests "covering" it, none of which ever constructed it.

**Question**: For each factory, which field defaults encode a business state? Are those states enumerated anywhere, or discovered by grep?

### 7.3 Object Mother vs Builder chosen per-file, and the mother's coupling never priced

Fowler's own caveat on Object Mother is that many tests come to depend on the exact data in the mothers (Fowler, via [jonasg.io](https://jonasg.io/posts/object-mother/)); Nat Pryce's [Test Data Builders](http://www.natpryce.com/articles/000714.html) exist specifically to decouple tests from structure they don't care about.

**Why it hurts**
- Named mothers (`pastDueAccount()`) read beautifully and multiply badly: every new variation is a new method, and the method names stop being domain language and start being test-case ids.
- Builders read worse and scale better, but only if immutable — a mutable shared base means one test's `.withSeats(5)` leaks into the next.
- Choosing per-file means both exist, plus inline literals, and a newcomer can't tell which is sanctioned.
- Mothers also *hide* design smells: if constructing your domain object needs a mother, the object may be the problem ([Colin Jack, on Evans](http://colinjack.blogspot.com/2008/08/test-data-builder-and-object-mother.html)).

**When it bites**: at 200+ tests, when someone changes a shared mother to serve one new test and 30 unrelated tests change meaning.

**Question**: Who is allowed to change a shared fixture, and what tells them what depends on it?

### 7.4 Nobody owns the double, so every test invents an inconsistent one

Younes Jaaidi's ["Fake It Till You Mock It"](https://cookbook.marmicode.io/angular/testing/fake-it-till-you-mock-it) makes the ownership point directly: the fake is the only test double that shifts implementation and maintenance burden *off* the individual test, because it can be maintained alongside the dependency by the people who own it.

| Double | Who maintains it | What it knows |
|---|---|---|
| Ad-hoc spying stub (`vi.fn()` per test) | the test author, forever | one call, one return value |
| Shared stub helper | whoever last touched it | a frozen snapshot of one scenario |
| Owned fake | the dependency's owner | its own state, so calls compose |

**Why it hurts**
- The spying stub has no internal state, so a multi-step journey asserts against a world that cannot change: search after add returns the pre-add list, `isSignedIn` stays false after `signIn`.
- Stubs are rarely type-safe in practice — an unstubbed method returns `undefined` and the failure surfaces far from the cause; worse, when the real API changes and the stub doesn't, tests keep passing.
- The test becomes entangled with the dependency's API rather than the SUT's behavior: switch `updateItem` to `batchUpdateItems` and every test that spied on the call must change, even though nothing a user can see changed.
- Faking a dependency you don't own means you're guessing at its behavior. The guess is the thing being tested.

**When it bites**: the first refactor that changes *how* a collaborator is called rather than *what* the app does — round 1's false-positive engine, but sourced in the double's design rather than in the assertion.

**Question**: For each dependency you replace in tests — is there one double, owned by the dependency's owner, that behaves consistently across its own methods? Or N doubles, each valid for one test?

### 7.5 Fixtures can produce states the backend cannot, and cannot produce states it does

There is no invariant parity between the factory and the source of truth.

**Why it hurts**
- Tests assert behavior on impossible data (a cancelled subscription with a future trial end), so the code grows branches for states that never occur — and those branches get "coverage."
- Legitimate states are unreachable in tests because the factory has no way to express them (partial failure, mixed-currency cart, a paginated response that changes total between pages), so they're tested nowhere.
- The gap is asymmetric and invisible: nobody notices a state they can't construct.

**When it bites**: a production bug whose reproduction step is "the backend returned a combination our fixtures can't express."

**Question**: List the five states your domain actually has. Can the fixture layer build each one in a single expression?

---

## 8. Time and scheduling as an architectural choice

Frontends are scheduling engines — debounce, throttle, poll, retry, animate, expire, revalidate on focus. Almost no frontend decides *how* time enters the app.

### 8.1 Nobody owns the clock, so the only lever is a global mode switch

Time arrives through ambient globals: `Date.now`, `setTimeout`, `setInterval`, `requestAnimationFrame`, `Intl` timezone. Fake timers monkey-patch all of them at once (Marmicode, [Controlling Time in Tests](https://cookbook.marmicode.io/angular/testing/controlling-time-in-tests)).

**Why it hurts**
- Turning on fake timers pauses *everything*, including the framework's internal scheduling and anything the test harness itself waits on. That's why `findBy*` and `waitFor` hang under fake timers, and why the network mock layer deadlocks with them.
- The switch is global but the decision is per-file, so it lands in the shared setup file and every test inherits a scheduling model chosen for one test.
- Fake timers leak across tests when not restored — a suite where test 40 fails because test 12 froze the clock.
- The alternative — an injected clock, an infrastructure wrapper you own (James Shore's [Nullables](https://www.jamesshore.com/v2/projects/nullables/testing-without-mocks): `Clock` is a wrapper with an embedded stub) — is an application design decision, not a test decision. It has to be made before there are 1000 tests.

**When it bites**: the first time someone needs deterministic time in a file that already has 30 async tests written against real timers.

**Question**: Is `Date.now()` called anywhere outside one module? If yes, your clock is ambient and every time-sensitive test pays for it.

### 8.2 Durations are hardcoded, so tests must know them

`debounce(300)`, `staleTime: 30_000`, `toast dismiss after 5s` compiled into components.

**Why it hurts**
- Tests must reproduce the constant to advance past it. The constant is now duplicated in N test files, and changing it is a suite-wide edit.
- Exact-time assertions are brittle for reasons that have nothing to do with your code: nested timers in `@sinonjs/fake-timers` add a millisecond, so "advance exactly 300" is structure-sensitive.
- The alternative — durations as injected configuration, so tests set `0` (instant) or effectively-infinite (never fires) — makes the test express intent ("while pending", "after settle") instead of arithmetic. Its trade-off is real and rarely stated: with all durations collapsed to 0, the *ordering* between two timed behaviors (autosave vs debounce) can differ from production.

**When it bites**: a product change from 300ms to 500ms debounce that touches 40 test files.

**Question**: Is any duration in this app a value a test can override, or are they all literals?

### 8.3 No policy on "the timing is the behavior" vs "the timing is in the way"

Two different jobs, one mechanism.

| Situation | What the test needs | Failure mode when confused |
|---|---|---|
| Timing **is** the behavior (debounce window, auto-dismiss, countdown, session expiry) | assert at precise points; manual control of the clock | tested with real timers → slow and flaky, or not tested at all |
| Timing is **in the way** (a form that happens to debounce) | time out of the way entirely | test couples to the debounce constant; every unrelated assertion inherits timing knowledge |

**Why it hurts**
- Without the distinction, tests aren't composable: a test about validation messages fails because someone changed a debounce.
- The blast radius is the whole file, because the clock mode is per-file at best.
- The tooling moved recently (fast-forward tick modes landed in Sinon/Vitest, [Vitest PR#8726](https://github.com/vitest-dev/vitest/pull/8726)), so suites written two years ago encode a workaround as if it were a strategy.

**When it bites**: when a timing change in one component reddens tests in components that don't render it.

**Question**: For each test that touches the clock — is the clock the subject, or an obstacle? Different answers should produce different mechanisms.

### 8.4 The scheduling band nobody tests

Retry with backoff, poll intervals, refetch-on-focus, session/token expiry, optimistic-update timeout, offline queue drain.

**Why it hurts**
- Under real timers these are untestable by construction (a 30-second backoff is a 30-second test), so they get skipped.
- Under fake timers they're testable but need the whole global switch, which the file's other tests can't tolerate — so they get skipped.
- The behavior is exactly where the interesting bugs are: double-submits, stampedes, infinite retry, a token refresh racing a request.
- Round 1 §1.6 named the *level* gap. This is the *mechanism* gap: even when a team decides which level owns retry behavior, it can't express it.

**When it bites**: incidents that only reproduce under degraded network, and can't be regression-tested afterwards.

**Question**: Name the app's retry/expiry policies. Which test asserts each one? If none, is that a decision or an accident?

---

## 9. What runs on what change

### 9.1 Test selection is a recall trade, and nobody names the number

`nx affected`, `turbo --filter`, jest `--changedSince`, sharding, "only run E2E on main." Each is a decision to *not run* tests that might fail.

Meta's [predictive test selection](https://research.facebook.com/publications/predictive-test-selection/) states the trade explicitly: infrastructure cost halved, while guaranteeing over 95% of individual test failures and over 99.9% of faulty changes are still reported. That's a deliberate, measured miss rate.

**Why it hurts**
- Frontend teams adopt affected-detection because it's the default in the tool, not because they chose a recall target. The miss rate exists either way — unmeasured.
- The gap between "tests that could catch this" and "tests we ran" is invisible in the green check. It looks identical to a full run.
- Deterministic impact analysis and probabilistic prediction fail differently: the first misses what the dependency graph doesn't model, the second misses the unusual ([CloudBees on TIA vs PTS](https://www.cloudbees.com/blog/predictive-test-selection-vs-test-impact-analysis)).

**When it bites**: a main-branch break from a PR that was green, where the honest post-mortem line is "that test wasn't selected."

**Question**: What fraction of failures would your selection strategy miss? Nobody has measured it — so what would it cost to find out?

### 9.2 Affectedness depends on a graph the frontend actively destroys

Selection is only as good as the dependency graph.

**Why it hurts**
- Barrel files collapse the graph: one `index.ts` re-export makes every consumer look affected by every sibling. Selection degenerates to "run everything" — the exact cost it was bought to avoid. (Round 1 §4.1 flagged barrels as a *speed* problem; this is the *correctness of selection* problem, same root.)
- Dynamic `import()`, route-based code splitting, and runtime-resolved components are edges the static graph doesn't have. Those tests are never selected.
- Non-code inputs are outside the graph entirely: design tokens, generated API types, translation files, CSS, env config, feature-flag definitions. Changing them affects behavior and affects nothing.
- Shared setup files are the inverse pathology — touch one and everything is affected, so the escape hatch gets used to skip CI instead.

**When it bites**: the first time someone says "why did changing a copy string run 4,000 tests" and the answer is "and changing the router config ran none."

**Question**: Draw the edge from a design-token change to the test that would catch its regression. Does your tool have that edge?

### 9.3 The suite has an undeclared concurrency model

Parallel workers, per-file isolation, shared module registry, one global network-mock registry per process.

**Why it hurts**
- Test doubles installed globally (network handlers, timers, storage, DOM patches) are process-scoped state shared by everything in that worker. Concurrency inside a file is therefore unsafe by default — MSW needed [an explicit server-boundary API](https://mswjs.io/blog/introducing-server-boundary/) to support concurrent runs at all.
- Nobody writes the model down, so the safe/unsafe boundary is learned by producing a flaky test.
- Sharding across CI machines changes ordering, which surfaces order-dependent tests as "infra flakiness" and gets retried instead of fixed.

**When it bites**: the day someone turns on concurrency to fix §4 slowness and gets a suite that fails 2% of the time.

**Question**: What is shared between two tests in the same file? Between two files in the same worker? Where is that written down?

---

## 10. Tests as the constraint on migration

Bache's Test Desiderata 2.0 lists four macro properties of a suite: fast, cheap, predictive of deployment success, and **supports ongoing code design changes** ([Bache, 2026](https://coding-is-like-cooking.info/2026/02/go-beyond-the-test-pyramid-test-desiderata-2-0/)). The fourth is the one nobody measures, and it's the one that decides whether you can move.

### 10.1 The suite is the price of the upgrade, and it's not in anyone's estimate

Evidence, not anecdote — Enzyme had no React 18 adapter, so the test suite became the upgrade:

| Org | Scale | Reported cost |
|---|---|---|
| Sentry | ~5,000 tests | ~20 months, 17 engineers reviewing ([InfoQ](https://www.infoq.com/news/2023/03/sentry-enzyme-migration-rtl)) |
| Slack | 15,000 tests | AST codemods + LLM; ~80% automated, the rest by hand ([InfoQ](https://www.infoq.com/news/2024/12/ai-enzyme-react-test-library)) |
| HubSpot | tens of thousands | multi-year program, framework declared official 4 months before the plan shipped ([HubSpot](https://product.hubspot.com/blog/migrated-from-enzyme-to-react-testing-library)) |
| NYT | — | described as the largest piece of their React 18 upgrade |

**Why it hurts**
- A framework upgrade is scoped as an application task. The suite is 2–10× the application's file count and is coupled to the *testing* library, which is coupled to framework internals.
- The tests that are hardest to migrate are the ones coupled to implementation detail — which is to say, the ones that were already providing the least value are the ones that cost the most to keep.
- The decision is usually made silently, at test-writing time, years earlier, by someone choosing a shallow-render helper.

**When it bites**: at "we should upgrade React/router/state library," when someone finally counts the test files.

**Question**: If you had to move testing libraries next quarter, how many of your tests would need a human? That number is a current liability, not a future one.

### 10.2 The architecture moves somewhere the suite can't follow

React Server Components are the live example: because RSCs run on the server and mix with client components, the React core team's guidance has been end-to-end testing as the primary approach, leaving no unit/integration story for that layer ([Storybook, 2024](https://storybook.js.org/blog/component-testing-rscs/)).

**Why it hurts**
- Adopting the new architecture deletes a test level. Whatever that level was protecting becomes E2E's problem, and E2E doesn't have the budget.
- The migration is therefore not "move tests" but "relocate coverage" — a strategy question (§1) triggered by a framework release nobody on the team voted on.
- Half-migrated is the normal state: two rendering models, two test environments (`jsdom` vs node), two sets of assumptions, indefinitely.

**When it bites**: the first server-side data-transformation bug that would have been a 5-line component test in the old model.

**Question**: For each architectural direction on your roadmap — which test level survives it? Which behavior loses its owner?

### 10.3 The double is coupled to the library, not to the boundary

Store shape, query-client internals, router hooks, form-library state — mocked directly, thousands of times.

**Why it hurts**
- Swapping the library becomes a suite-wide rewrite even though the app's behavior is unchanged. The tests encode a vendor choice as if it were domain truth.
- It's the same mechanism as §7.4, at a different scale: mocking what you don't own means your tests freeze someone else's internals.
- The signal was available early — the tests were painful to write before they were expensive to migrate. GOOS's "listen to the tests" applies; almost nobody logs that pain as architectural feedback.

**When it bites**: at the state-library or data-fetching swap, when the app diff is small and the test diff is enormous.

**Question**: Grep for imports of third-party internals in test files. That set is your migration bill.

---

## 11. Ownership across teams

### 11.1 Larger tests span owners, and unowned tests rot

Stated plainly in *Software Engineering at Google*, ch. 14: a unit test is clearly owned by the team that owns the unit; a larger test spans multiple units and thus multiple owners, raising the question of who maintains it and who diagnoses it when it breaks — and without clear ownership, a test rots ([abseil.io](https://abseil.io/resources/swe-book/html/ch14.html)).

**Why it hurts**
- The frontend's most valuable tests are exactly the wide ones: journeys crossing the shell, the design system, the data layer, and two product areas.
- CODEOWNERS maps files to teams; it does not map *failures* to teams. A red route test names a file, not a cause.
- Rot is silent: the test stays green while its assertions weaken, because the fastest way to make an unowned test pass is to loosen it.

**When it bites**: the shared journey suite that everyone runs and nobody edits, until it is quarantined.

**Question**: For your widest test file — who is paged when it fails at 2am, and who decides whether it's the test or the code?

### 11.2 The design-system seam is an unwritten contract asserted thousands of times

Product tests render DS components and query them by role, label, and text. That makes DS markup a contract, without either side agreeing to one.

**Why it hurts**
- The DS team's CI is green on a markup change (their own tests pass); the cost lands in N product repos. Cost and authority are in different places.
- Nothing distinguishes "DS internals" from "DS public behavior." A `<label>`-to-`aria-label` change is a refactor to one side and a breaking change to the other.
- Product teams defend themselves by mocking the DS, which converts the false positives into false negatives (round 1 §2.2) and hides real integration breaks.
- Test-only surface (round 1 §3.3) makes it worse: a testid added in a product repo becomes a DS API by accident.

**When it bites**: a minor DS version bump that reddens hundreds of tests across teams, with no owner for the fix.

**Question**: Which DS observable properties are contract, and which are internals? If that list doesn't exist, every product test is asserting on internals.

### 11.3 No policy for doubles of things you don't own

The guidance is explicit — don't build fakes for services you don't own; build your own adapter and fake that ([Marmicode](https://cookbook.marmicode.io/angular/testing/fake-it-till-you-mock-it)).

**Why it hurts**
- Analytics SDKs, payment widgets, auth providers, map libraries, chat widgets each get an ad-hoc mock per team, all subtly different, all wrong in different ways.
- Without an adapter there's no seam, so the double must imitate a third party's API — and the third party has no obligation to you.
- Nobody is responsible for re-checking the imitation against reality after a vendor update.

**When it bites**: a vendor SDK major version, or a production failure in an integration with 100% "coverage."

**Question**: For each third-party dependency — is there an adapter you own, or does the vendor's API appear directly in test files?

---

## 12. Deleting tests

### 12.1 Addition requires no justification; deletion requires a defence

The asymmetry is the whole problem.

**Why it hurts**
- Suite size only goes up, so every cost in §4 and §9 compounds structurally.
- Deletion is socially expensive (removing someone's safety net) and technically unverifiable (nothing proves the test was redundant), so the rational individual choice is always to keep it.
- Ian Cooper's position — you should be free to remove tests; the ones to keep are those expressing behavior, the API of the system — is a policy, but almost nobody writes it into a review standard ([summary of the talk](https://thechels.uk/tdd-where-did-it-all-go-wrong)).

**When it bites**: never, visibly. It bites as the slow drift in §4 and the migration bill in §10.1.

**Question**: When was a test last deleted here, and what justified it? If the answer is "when the file was deleted," you have no policy.

### 12.2 "Obsolete" is undefined

Candidate categories, none of which most teams can identify mechanically:

| Category | Signal |
|---|---|
| Tests of removed behavior | the flag is gone, the branch isn't |
| Tests duplicating a higher level | round 1 §1.5, but nobody deletes the loser |
| Tests of implementation detail after a refactor | changed shape without changing user-visible behavior |
| Tests that can only fail for environment reasons | quarantined, retried, never fixed |
| Tests generated to satisfy a gate | §5.2 and §13 |

**Why it hurts**
- Without categories, "delete tests" reads as "reduce quality," so it never gets proposed.
- The suite's real coverage of behavior is unknowable while it's padded with tests that can't fail for a code reason.

**When it bites**: during any migration, when every kept test costs money to port.

**Question**: Which tests in this suite could not fail because of a bug in application code? What is that number?

### 12.3 The coverage gate makes deletion illegal

If a per-file threshold is enforced, deleting the test that covers a file is a build failure.

**Why it hurts**
- The gate mechanically prevents the cleanup, regardless of the test's value. Policy is set by CI config, not by anyone's judgment (round 1 §5.2, in its deletion form).
- Consolidating three overlapping tests into one better test can *lower* a number and get blocked.

**When it bites**: whenever someone tries to act on §12.2.

**Question**: Can a PR that deletes 200 lines of tests and adds 20 better ones pass CI here?

---

## 13. AI-generated tests at volume

### 13.1 Generated tests satisfy the cheap properties and fail the load-bearing one

Bache's assessment is direct: AI tools can generate tests that are sensitive to the code's behavior (predictive), mocked enough to be fast, and cheap to maintain if the tool updates them — and they fall down on the fourth property, supporting design change, because they document *what* the code does and not *why*. Intent isn't in the implementation, so a tool reading only the implementation cannot recover it ([Bache, 2026](https://coding-is-like-cooking.info/2026/02/go-beyond-the-test-pyramid-test-desiderata-2-0/)).

**Why it hurts**
- Tests generated from an implementation are change detectors by construction: they freeze current behavior, including current bugs, and they will fail on every refactor.
- The suite's most valuable function — telling a future reader what the software is *for* — degrades exactly as the suite grows.
- The failure is invisible on every dashboard you have. Count up, coverage up, red rate up-and-explained-away.

**When it bites**: at the next refactor, when a two-line change reddens 60 tests and every one of them is "correct."

**Question**: Pick 10 generated tests. For how many can you state the user-visible consequence of the assertion failing?

### 13.2 Review capacity is the bottleneck, and generated tests are the least-reviewed artifact

Sonar's 2026 developer survey (1,100+ developers) reports AI accounting for 42% of committed code, 96% not fully trusting the output, and only 48% verifying it ([Sonar](https://www.sonarsource.com/company/press-releases/sonar-data-reveals-critical-verification-gap-in-ai-coding/)). Test files are where that verification gap is widest, because a passing test looks like evidence.

**Why it hurts**
- Reviewers skim tests already. Tests that are green, well-formatted, and numerous are skimmed harder.
- The specific defects are hard to see in a diff: tautological assertions, assertions on the mock rather than the SUT, mocking away the logic under test, and high line coverage with no behavioral coverage ([review checklist, qaskills.sh](https://qaskills.sh/blog/reviewing-ai-generated-tests-checklist-2026)) — the same false-negative family as round 1 §2.4, now produced at machine rate.
- Volume changes the economics of every other problem in this document: fixtures (§7), selection cost (§9), migration bill (§10.1), deletion backlog (§12).

**Caveat on sourcing**: most 2026 numbers on this come from vendor surveys, not independent research. Treat direction as real, magnitudes as marketing.

**When it bites**: the first incident where the escaped bug had a passing generated test named after it.

**Question**: What is your review standard for a generated test file, and how is it different from your standard for generated application code?

### 13.3 Coverage stops being a lagging indicator and becomes a production target

When generating tests is nearly free, any coverage threshold is trivially satisfiable.

**Why it hurts**
- Round 1 §5.1's Goodhart problem was throttled by the cost of writing tests. That throttle is gone.
- The number goes to target and stays there, which means it stops carrying information entirely — including the information it used to carry accidentally, like "this module is untested because nobody understands it."
- Teams respond by adding more gates (mutation score, assertion-density lint), which are also generatable.

**When it bites**: when coverage is at target, everything is green, and nobody can say what the suite protects.

**Question**: If generation is free, what remains scarce? Whatever that is, is the thing to measure.

---

## 14. Configuration as a hidden test axis

Feature flags, tenants, locales, permission sets, plan tiers, environment. Each multiplies the state space; the suite silently picks one point in it.

### 14.1 The stub's default selects the branch the whole suite tests

Flags are fetched at runtime, so tests stub the provider. That stub's default — usually "off," usually "the old behavior" — decides what thousands of tests exercise.

**Why it hurts**
- Production may be 90% on the new branch while the suite is 100% on the old one. Both are green.
- Nobody chose this. It's a default in a test helper, written when the first flag was added.
- Coverage is reported for one configuration and read as if it were the whole product.

**When it bites**: at rollout, when the new branch meets real data for the first time.

**Question**: Which flag values does your test setup default to? Do they match the current production configuration?

### 14.2 Combinatorics gets solved by ignoring it rather than deciding

Ten binary flags is 1,024 states. Fowler/Hodgson's guidance is to test the combinations you expect in production rather than all of them ([Feature Toggles](https://martinfowler.com/articles/feature-toggles.html)); the practical reading is a small named set — current production state, next-release state, and all-off fallback.

**Why it hurts**
- "You don't need to test every combination" is heard as "you don't need to decide," so no configuration is named at all.
- The all-off fallback is the configuration you're in when the flag service is unreachable — a real production state that is usually tested only by accident.
- Interactions between flags are precisely the untested part, and precisely where the surprises live.

**When it bites**: a flag-service incident, or two rollouts colliding in the same week.

**Question**: Name the flag configurations your CI runs. If it's "whatever the defaults are," name them anyway and see whether anyone agrees they're right.

### 14.3 Flag removal has no test consequence

The flag is deleted from the service; the stub, the branch, and the tests stay.

**Why it hurts**
- Dead branches keep their coverage, so the metric argues for keeping them.
- The suite documents a product that no longer exists — directly undermining §15.
- Nobody owns flag cleanup, and the tests make it more expensive rather than less.

**When it bites**: during cleanup, when deleting a dead branch fails tests and the path of least resistance is to keep the branch.

**Question**: How many flags in the code no longer exist in the flag service? How many tests reference them?

---

## 15. The suite as documentation

### 15.1 The suite has no index

Thousands of `it(...)` strings, ordered by file path, i.e. by implementation structure.

**Why it hurts**
- A newcomer cannot answer "what does this application do" from the tests, only "what does this file do."
- Neither can an incident responder, or an agent, or the person deciding whether behavior X is intentional.
- The information is present and unreadable, which is the expensive combination — it looks like documentation, so nobody writes documentation.

**When it bites**: onboarding, and every "is this a bug or is it deliberate?" conversation.

**Question**: Without opening the app, can you list its business rules from the test names alone? How long did it take?

### 15.2 Tests written after the fact record behavior, not intent

Bache's point about test-after applies to humans too: write the tests afterwards and you tend to get larger-grained tests using mocks to compensate for weak separation of concerns — and no record of *why* any case matters.

**Why it hurts**
- Reading the implementation tells you what the code does. The test was the only place the reason could have lived, and it repeats the what.
- The cases that most need a reason — the specific date, the odd rounding, the retry cap — are the ones that look arbitrary and get deleted or "fixed" by the next person.
- This is where §13's generated tests and §12's deletion policy collide: you can't tell which tests encode a hard-won lesson.

**When it bites**: when someone changes a value because "no test explains it," and reintroduces a bug from two years ago.

**Question**: For your five weirdest constants — does any test say why?

### 15.3 The fixture layer is the only surviving description of the domain, and it's not readable as one

Follows from §7. The factories know every field, every state, every relationship. They're written as construction helpers, not as a description.

**Why it hurts**
- The most complete domain model in the frontend is in `test/factories`, in a form nobody reads to learn the domain.
- New engineers learn the domain by copying a factory call from a nearby test, which propagates §7.2's defaults as if they were the domain's norms.

**When it bites**: when the product asks "what states can an order be in" and the honest answer requires reading test code.

**Question**: If the fixture layer were the domain documentation, what would it say? Is that what you'd want it to say?

---

## Cross-references to round 1

| Round 2 | Extends round 1 |
|---|---|
| §7.4 doubles ownership | §2.2 mocking more converts FP→FN; §3.2 mocks as unowned second backend |
| §8.4 scheduling band | §1.6 behavior owned by no level |
| §9.2 barrels and selection | §4.1 barrels and speed |
| §12.3 deletion blocked by gates | §5.2 per-file gates override placement |
| §13.3 free generation | §5.1 coverage as a target |
| §11.2 design-system seam | §3.1 tests freeze contracts; §3.3 test-only surface |

## Sourcing notes

- Strongest primary sources: Emily Bache's Test Desiderata 2.0 (Dec 2025 / Feb 2026), *Software Engineering at Google* ch. 14, Marmicode's cookbook, Meta's predictive-test-selection paper, James Shore's Nullables.
- Migration numbers (Sentry, Slack, HubSpot) are reported via InfoQ and company engineering blogs — first-party claims, not independently audited.
- §13's survey statistics are vendor-published. Direction is consistent across sources; magnitudes are not independently verified.
- Marmicode's material is Angular-flavored; the arguments used here (double ownership, clock ownership, timing-as-subject vs timing-as-obstacle) are framework-neutral and restated as such.