# Draft — one test, one reason to fail

Status: draft, outside the curator pipeline. Not distilled, not probed,
no maintainer verdict.

Scope: RTL + happy-dom + Vitest.

## The problem

The useful output of a suite is not the pass/fail bit. It is the set of
test names that turned red, read as a description of what broke. That
reading only works if the mapping between defects and failing names is
close to one-to-one.

Two things degrade it from opposite directions. A single defect that
lights up thirty tests produces a wall of red in which the names carry
no differentiating information. A single test asserting five unrelated
things produces one red name that describes only the first assertion
that happened to fail.

Both are failures of the same property: the suite stops being readable
as a diagnosis.

## The mechanism

The first case is usually built deliberately and with good intent. An
important behavior gets asserted in every test that touches the
component, on the reasoning that more checks cannot hurt. When that
behavior regresses, every one of those tests fails. The information
content of thirty simultaneous reds is roughly one red, minus the time
spent confirming they share a cause.

The second case comes from a different pressure: rendering and setup are
expensive to write, so once a test has a component mounted, adding
another assertion is nearly free. The test accumulates claims. Because
assertions abort on the first failure, everything after the failing line
is unverified — and a name chosen for the first claim now covers four
others silently.

## The target

The property worth designing toward is that a regression turns exactly
one test red, and that test's name states what regressed. This is a
direction rather than an achievable invariant; components share code,
and some defects legitimately break several distinct behaviors.

The productive use of the target is diagnostic. A change that reddens
twenty tests is telling you something — either the defect is genuinely
broad, or the suite is repeating itself. Which of those it is, is worth
knowing, and the only time it is cheap to find out is while looking at
the twenty reds.

## The exception that is not one

Integration tests that drive a sequence of interactions do assert
repeatedly along the way, and this is correct. The sequence is one
scenario, and checking intermediate states is how you locate where a
scenario diverged.

The distinction is whether the assertions belong to one story or several.
A test that walks a user through submitting a form and checks state at
each step is one test with internal checkpoints. A test that submits a
form and then also verifies an unrelated toggle is two tests sharing a
render for convenience. The second one has a name that can only be right
about half its content.

## Questions worth asking

- If this behavior regressed, how many tests would go red, and would the
  extra ones tell you anything the first did not?
- Does this test's name cover everything it asserts, or only the first
  thing?
- Are these assertions steps in one scenario, or separate claims sharing
  a setup?
- Is this assertion here because this test is about it, or because the
  component was already rendered?

## Who pays

The developer repeating an important assertion everywhere buys
reassurance at write time and pays nothing immediately. The payer is
whoever faces the resulting screen of red after a one-line change and
has to establish that thirty failures share a single cause before any
diagnosis can start — work that has to be redone from scratch on every
subsequent regression in the same behavior.
