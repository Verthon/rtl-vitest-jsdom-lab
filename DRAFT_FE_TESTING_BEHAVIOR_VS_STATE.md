# Draft — behavior vs. state

Status: draft, outside the curator pipeline. Not distilled, not probed,
no maintainer verdict.

Scope: RTL + happy-dom + Vitest.

## The problem

A component has two surfaces. One is what a user can observe and act
on — rendered text, enabled controls, what happens after a click. The
other is how the component arranges itself internally to produce that —
which hook holds which value, how state is split, what a child receives.
Only the first is a contract with anyone. The second is a private
arrangement that the author is free to change.

A test asserting on the second surface reports a failure every time that
arrangement changes, including changes that altered nothing a user could
perceive. The test is not wrong; it is measuring the wrong thing, and it
will keep doing so accurately and expensively for as long as it exists.

## The mechanism

Access is the whole story. If a test can reach internal state, someone
eventually will, because reaching it is usually the shorter path to a
green test than driving the component through its real interface.
Asserting that a piece of state equals a value takes one line; arranging
the interaction that makes that state observable takes several.

The result is a test coupled to a decision the author considered
reversible. Splitting a component in two, moving a value from local
state into a reducer, replacing a controlled input with an uncontrolled
one — none of these change what the user sees, and all of them redden
tests written against the internal arrangement.

The inverse case is the one that makes the distinction concrete: a
refactor that leaves observable behavior identical should produce a
fully green suite. If it does not, the suite has been measuring
structure.

## The framing

Treating the unit as a black box is not a restriction imposed for
purity. It is a statement about which of its surfaces is stable enough
to be worth writing a test against. Public interface changes are events
the team notices and discusses; internal arrangement changes happen
constantly and quietly. A test anchored to the first is cheap to keep,
a test anchored to the second is a standing tax on refactoring.

RTL's query design pushes in this direction by making the user-visible
path the convenient one, but the tooling only removes the easiest
shortcuts. It cannot stop a test from asserting on something that
happens to be reachable and happens to be internal.

## Where it gets genuinely hard

The clean cases are easy to state and rare in practice. The difficult
ones look like this:

- a value that is internal today and part of the interface tomorrow,
  because a sibling component started depending on it
- behavior that is real and user-affecting but has no visible
  manifestation in the rendered output, such as a request not being
  fired twice
- a component whose only meaningful output is what it passes to a
  callback, where the callback signature is both an interface and an
  implementation detail depending on who you ask

These are not resolved by the black-box framing. They are where the
framing runs out and a judgment call starts.

## Questions worth asking

- If someone restructured this component's internals without changing
  what a user experiences, would this test still pass?
- Is the thing being asserted on something a user could notice, or
  something only the author could?
- Is this callback part of the contract with the parent, or an artifact
  of how the split happened to land?
- Was the internal value reached because it is the right thing to
  assert, or because it was the reachable thing?

## Who pays

The developer asserting on internal state finishes faster and gets a
test that is easy to write and easy to read. The payer is whoever
refactors that component afterward, who must decide, for each red test,
whether it found a real regression or is reporting a structural change
that was the entire point of the work. That decision cannot be
delegated or batched, and it recurs on every refactor for the life of
the test.
