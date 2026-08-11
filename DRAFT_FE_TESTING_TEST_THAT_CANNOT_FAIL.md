# Draft — the test that cannot fail

Status: draft, outside the curator pipeline. Not distilled, not probed,
no maintainer verdict.

Scope: RTL + happy-dom + Vitest.

## The problem

A green test is normally read as evidence. But green has two possible
causes: the code behaved correctly, or the test was never in a position
to notice otherwise. These are indistinguishable from the outside, and
the suite reports them identically.

Tests in the second category are worse than absent tests. An absent test
leaves a visible hole. A test that cannot fail fills the hole with
something that looks like coverage, and the area is then treated as
covered by everyone who reads the file afterward.

## The mechanism

There are several distinct ways an assertion becomes unreachable, and
they do not look alike:

**Asserting something already guaranteed.** A test that renders a
component and asserts it is defined tests the import system. TypeScript
already proves that at compile time. There is no plausible edit to the
production code that makes this red.

**Unreachable assertion.** A promise created but neither returned nor
awaited runs its rejection into the void. The test function has already
returned by the time the failure occurs, so nothing connects it to the
result. The suite prints a warning, at best, in a stream nobody reads
during a green run.

**Assertion never reached.** A query that throws before the assertion,
inside a branch the test never enters, or after an early return, leaves
the expectation as decoration.

**Nothing asserted at all.** A test that performs an interaction and
ends. It verifies that the interaction did not throw, which is a real
but very small claim, and one nobody reading the test name expects to be
the whole scope.

## The tell in the name

A test named for what it verifies has an implicit failure mode in the
name. A test named for nothing in particular usually has no failure mode
at all, because the author did not have one in mind while writing it.

"Should work correctly" is the canonical case. It is not a bad name for
a good test; it is a symptom that the author sat down without a specific
behavior in view. Whatever gets written next is unlikely to be aimed at
anything. The name is the earliest available signal, and it arrives
before any code is written.

## The verification move

The property is unobservable in a passing run, so reading the test does
not settle it. The check is to break it on purpose: invert the
assertion, change the expected value, or comment out the line in the
production code the test is aimed at. Confirm it goes red, confirm the
message is legible, restore.

Doing this once per test at write time is cheap. Doing it later, on a
suite of unknown provenance, is how you find out which parts of it were
ever load-bearing.

## Questions worth asking

- What change to the production code would make this test red?
- If the answer is "none", what is this test for?
- Has this assertion ever been observed failing, or is it green by
  assumption?
- Does the name state a behavior, or a mood?

## Who pays

The developer writing a test that cannot fail gets a green check, a
coverage increment, and a closed ticket. The payer is whoever later
believes the area is tested — someone shipping a change who reads the
suite as a safety net, and discovers in production that the net had a
hole exactly where the file listing said it did not.
