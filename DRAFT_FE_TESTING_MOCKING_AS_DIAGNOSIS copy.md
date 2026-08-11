# Draft — mocking difficulty as a reading of the dependency graph

Status: draft, outside the curator pipeline. Not distilled, not probed,
no maintainer verdict.

Scope: RTL + happy-dom + Vitest.

## The problem

Difficulty writing a test is normally attributed to the testing tools.
The reasoning is immediate and usually feels correct: the test is hard,
the test framework is what makes tests, so the framework is deficient.

But the effort required to substitute a dependency is largely determined
before any test exists, by how the code obtains that dependency.
Dependencies handed in are trivially replaced. Dependencies acquired
internally require intervening in module resolution, which is a heavier
and more fragile mechanism. The difficulty is a property of the code,
observed through the test.

## The mechanism

A dependency that arrives through a parameter, a prop, or a context can
be replaced by passing something else. Nothing needs to be intercepted;
the substitution point is part of the design.

A dependency acquired by importing it directly has no such point. The
only place to intervene is the module registry, before the importing
module resolves. That works, and every modern framework provides it, but
it is a different kind of operation: hoisted above the imports it
affects, scoped to a file, and invisible at the point of use. Whether a
mock applies is not answerable by reading the consuming code.

The effort gradient between these two is not a tooling artifact. It
reflects that one design exposes a seam and the other does not.

## What the difficulty is reporting

Specific difficulties map to specific structural facts, and the mapping
is worth reading rather than working around:

- **Several unrelated things must be mocked to test one unit** — the
  unit has more collaborators than its responsibility suggests
- **Each must be mocked by a different mechanism** — the dependencies
  arrive through inconsistent routes, so there is no single seam
- **Mocking one requires mocking another to match it** — the two are
  coupled to each other, and the coupling has surfaced in the test
  because the test is the first thing that ever tried to separate them
- **A module must be partially mocked, keeping some exports real** —
  things with different testing lifetimes are colocated in one file

None of these are resolved by better mocking APIs. They are resolved, if
they are worth resolving, in the production code.

## The limit of this reading

Not all mocking difficulty is a design signal. Some is environmental:
happy-dom, like any DOM simulation, implements a subset of browser APIs,
and a third-party library reaching for something unimplemented produces
an error that says nothing about your architecture. The same for
genuinely external boundaries — time, randomness, network — which have
to be substituted regardless of how well the code is structured.

Treating every awkward mock as an architectural verdict overcorrects
into refactoring code that was fine. The signal is in the pattern: a
unit that is hard to isolate in several unrelated ways, repeatedly, is
saying something. A single stubborn boundary usually is not.

## The relationship to testability claims

"This code is hard to test" is often heard as a complaint about test
effort. It is more usefully heard as a report about coupling that was
not visible until something tried to use the unit in isolation. The test
is the first consumer with different needs than production, and it finds
what a single consumer never would.

That does not automatically mean the code should change. It means the
information exists and can be read before deciding.

## Questions worth asking

- Is this hard because of the framework, or because the dependency has
  no seam?
- How many things must be substituted to exercise this unit, and does
  that match what the unit is for?
- Do these mocks have to agree with each other, and what does that say
  about the things they replace?
- Is this an architectural signal or an environment limitation?

## Who pays

The developer who reaches for module-registry mocking gets past the
obstacle and keeps the ticket moving, and the structural fact the
difficulty was reporting goes unrecorded. The payer is whoever
encounters the same coupling later from a different direction — a second
consumer, a refactor, a feature that needs the unit standalone — and
meets the problem again with no note that it had already been observed
and paid for once.
