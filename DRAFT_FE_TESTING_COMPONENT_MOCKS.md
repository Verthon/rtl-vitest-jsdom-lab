# Draft — mocking a component

Status: draft, outside the curator pipeline. Not distilled, not probed,
no maintainer verdict.

Scope: RTL + happy-dom + Vitest.

## The problem

Replacing a component with a stand-in resolves whatever was blocking the
test, and the test then exercises a tree containing something that will
never exist in production. Every claim the test makes about interaction
with that subtree is a claim about the stand-in.

This is sometimes the only available option. It is never free, and the
cost is easy to lose track of because the test goes green and stays
green.

## The mechanism

Two distinct costs, and the second is the one that surprises people.

**The test verifies a fiction.** Whatever the real component does —
render structure, internal state, event handling, the timing of its
callbacks — is absent. If the failure being avoided was caused by that
behavior, the test now specifically avoids the thing most likely to
break. Confidence produced by the test does not extend to the real
tree.

**The stand-in drifts.** The real component's props change over time.
The mock's do not, because nothing connects them. Unless the mock is
explicitly typed against the real component's props, a renamed or
removed prop leaves the mock accepting something the real component no
longer takes, and the test stays green while production is wrong. The
drift is silent and accumulates in proportion to how long the mock
lives.

Typing the mock against the component's prop type closes the second gap
and is worth doing whenever a component mock survives past the immediate
fix. It does nothing about the first.

## The legitimate reasons

Two, and they are narrower than usage suggests.

**Environment limitation.** happy-dom implements a subset of browser
APIs. A dependency reaching for something unimplemented fails at render,
and the component cannot be exercised at all. The first move is to check
whether the environment can be configured or the API stubbed at a lower
level than the whole component — replacing one missing measurement
method is a much smaller fiction than replacing a subtree.

**A third-party surface the test cannot drive.** A wrapped non-React
editor or canvas widget may have no accessible handle to interact with,
and the test is not there to verify the vendor's code. Substituting a
minimal controllable stand-in is defensible, and the boundary is
natural — it is where your code ends.

Neither reason is "the component is complicated" or "this makes setup
shorter." Those describe the test getting easier while getting weaker.

## The narrowing question

When a mock seems necessary, the useful question is how small it can be.
Stubbing a single missing DOM method, a single module, or a single
network response are all smaller fictions than an entire component.
Reaching for the largest available substitution because it definitely
works trades away more truth than the problem required.

## Questions worth asking

- What does this test still verify once this component is a stand-in?
- Was the thing that blocked the render the thing this test was about?
- Is the mock typed against the real component's props, and if not, what
  tells you when they diverge?
- What is the smallest thing that could be substituted instead of this?
- Is this reaching for a mock because the environment cannot render it,
  or because the test is easier that way?

## Who pays

The developer mocking the component unblocks the test and closes the
ticket with a green suite. The payer is whoever ships a change to the
real component's interface later, sees the suite pass, and finds in
production that the tests covering that integration had been describing
a stand-in for months — with nothing in the history marking when the two
stopped matching.
