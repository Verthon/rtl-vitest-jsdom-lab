# Draft — logic inside tests

Status: draft, outside the curator pipeline. Not distilled, not probed,
no maintainer verdict.

Scope: RTL + happy-dom + Vitest.

## The problem

Production code is verified by tests. Tests are verified by nothing. The
whole arrangement rests on the test being simple enough that its
correctness is apparent on reading, because there is no second layer
that checks it.

A test containing branches, loops, or computed expectations breaks that
arrangement. It is now code that could be wrong in the ordinary way code
is wrong, sitting in the one place in the codebase where no mechanism
would notice.

## The mechanism

The typical route in is calculating the expected value rather than
stating it. A test that computes what the output should be, using logic
resembling the production logic, will agree with the implementation
whenever both contain the same mistake. The agreement is not evidence;
it is two copies of one belief.

A conditional in a test produces a different problem: some assertions
run in some conditions. Whether the branch that matters was taken is not
visible in the result. The test is green, and which of its claims were
actually exercised is unknown without reading carefully and simulating
the branch by hand.

Stated expectations avoid both. A literal expected value is not derived
from anything and cannot silently track a change in the implementation.
It is more tedious to write, and that tedium is the mechanism working.

## Data-driven tests as the productive tension

The obvious response to many near-identical tests is a table of cases in
a loop. This is not the same defect — the loop contains no logic about
what is correct, only iteration over stated inputs and stated
expectations. Each row is still a literal claim.

But it introduces its own failure: every case executes the same lines,
so a red result points at a line shared by all of them. The framework
reports a location that does not identify the case. If the case name is
generated poorly, or is an index, the failing run says a case failed
without saying which.

That makes case naming load-bearing in a way it is not for ordinary
tests. The name is the only channel by which the failure identifies
itself, and it has to carry the distinguishing input, not just a
sequence number.

The second cost is skipping. Disabling one case in a table means editing
the table, since there is no per-case skip. This is minor until someone
disables the whole table because one row was inconvenient.

## The dividing line

Iteration over stated cases is fine. Computation of what "correct" means
is not. A loop that runs the same assertion against twenty stated pairs
is clear. A loop that derives the expected value from the input while
running is a reimplementation of the production code with no independent
check.

## Questions worth asking

- Is the expected value stated here, or calculated?
- If the calculation in this test contained the same mistake as the
  implementation, would anything catch it?
- Which branch of this conditional ran on the last green execution?
- When one row of this table fails, does the output name the row?

## Who pays

The developer computing expectations writes less and covers more cases
in fewer lines. The payer is whoever trusts a green run of that test
while both the test and the implementation carry the same wrong
assumption — a defect that survives the entire suite precisely because
the thing meant to catch it was built from the same misunderstanding.
