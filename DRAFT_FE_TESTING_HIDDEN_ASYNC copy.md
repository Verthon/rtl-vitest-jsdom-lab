# Draft — hidden async leaking into the scenario

Status: draft, outside the curator pipeline. Not distilled, not probed,
no maintainer verdict.

Scope: RTL + happy-dom + Vitest.

## The problem

A test scenario should read as a sequence of things a user does and
things that consequently become true. When the code under test schedules
work the test cannot see — a timer, a promise chain started during
render, a microtask queued by an effect — the test must nonetheless
service that work before its assertions are valid. The instructions for
doing so end up interleaved with the user-facing steps, and the scenario
stops describing user behavior and starts describing the runtime.

The reader can no longer tell which lines are the test and which lines
are bookkeeping.

## The mechanism

The test needs to advance past an asynchronous boundary it holds no
reference to. It cannot await the thing directly, because the thing was
never handed to it. So it awaits a proxy: a flushed microtask queue, an
advanced fake clock, a retrying query that polls until the DOM settles.

Each of these encodes an assumption about what is pending. That
assumption is invisible in the test text — a line advancing timers does
not say which timer, or why one advance is enough — and it is coupled to
the production code's internal ordering. Change how many awaits happen
between the click and the render, and the bookkeeping is wrong in a way
that produces a timeout rather than an explanatory failure.

The acute form is a deadlock: fake timers are installed, and code awaits
a promise that only settles after a timer fires. The runtime blocks on
the promise, the clock only moves when the test advances it, and the
test is blocked awaiting the promise. Resolving it requires splitting
the await from the advance and ordering them by hand, which puts the
production code's internal scheduling into the test as explicit steps.

## Why modern tooling changes the shape but not the problem

Awaiting a retrying query — `findBy*`, `waitFor` — is a substantial
improvement over manually flushing microtasks. It states an intent
("wait until this is true") rather than a mechanism ("advance the queue
once"), and it survives changes in how many ticks the pending work
takes.

But it is still the test compensating for work it cannot see. The
compensation is now legible, which is real progress, and the coupling to
tick counts is gone. What remains is that the test's correctness depends
on the assertion's condition being reachable, and on nothing else
settling afterward that would invalidate it. A component that fires a
second request after the first resolves will satisfy a `findBy` on the
first render and then change underneath it.

Fake timers remain the sharp edge, because they reintroduce manual
control over an ordering the test does not have visibility into.

## The signal

The amount of scheduling machinery in a test scenario is a reading of
the boundary the test chose, not of the framework. A test with several
timer advances and flushes in it is usually reaching across more
asynchronous boundaries than it needs to. The alternatives are to mock
the thing that schedules, so the schedule does not exist during the
test, or to move the boundary so the pending work is outside the unit
under test.

The question is not how to service the hidden work correctly. It is why
the test is positioned somewhere that requires servicing it.

## Questions worth asking

- Which pending thing is this line waiting for, and would the next
  reader know?
- If the production code added one more await internally, would this
  test still be correct?
- Is the async work here something the test should be driving, or
  something it should be standing outside of?
- Would mocking the scheduler remove this machinery, and would the test
  still verify what it is for?

## Who pays

The developer who gets the ordering right ships a green test and the
knowledge of why it is ordered that way, which does not survive in the
file. The payer is whoever sees it fail months later as a bare timeout,
with no message naming a cause, and must rebuild the model of what was
pending and in what order — usually by reading production code they did
not write, to explain a test they did not write.
