# Draft — assertion precision

Status: draft, outside the curator pipeline. Not distilled, not probed,
no maintainer verdict. Written as a standalone doc for review, not as a
`agents/fe/skills/` artifact.

Scope: RTL + happy-dom + Vitest. Network is MSW's problem, mechanical
rules are ESLint's problem, E2E is out of scope. What is left is
judgment.

## The problem

An assertion has two audiences. The first is the person who writes it,
who reads it once, sees it green, and moves on. The second is the person
standing in front of it on the day it goes red — often months later,
often not the author. The first audience is satisfied by any assertion
that passes for the right reason. The second is served only by an
assertion that, on failure, prints enough of the actual state to locate
the defect without opening a debugger.

Almost all assertion-quality decisions are made while looking at the
green case and therefore optimize for the wrong audience. The cost is
invisible at write time and paid in full at failure time, by someone
else.

## The mechanism

A test framework can only report what the assertion handed it. If the
value that reaches the matcher has already been reduced, the information
that was thrown away cannot be reconstructed for the error message. The
reduction usually happens one expression earlier than the assertion, in
a place that does not look like an assertion decision at all.

Consider the same defect surfacing through three assertions on the same
array:

```
expect(items.length === 6).toBe(true)   // expected true, received false
expect(items.length).toBe(6)            // expected 6, received 5
expect(items).toHaveLength(6)           // expected length 6, received 5, and a
                                        // preview truncated after the first entry
expect(names).toStrictEqual([...])      // names the entry that is missing
```

All four are correct. All four catch the regression. They differ only
in what the failing run tells you, and that difference is the entire
practical value of the test on the day it matters.

There are three rungs here, not two, and `toHaveLength` is the middle one.
It was measured, not assumed: its message previews the array but truncates
after the first entry, and its `actual` is the length rather than the array —
so it says the count is wrong and never which element is missing. Only
projecting the field you mean and asserting on that projection names the
defect. See `lab/assertions/assertion-precision.spec.ts`, *toHaveLength
previews the array, but truncates it after the first entry*.

The same shape recurs everywhere. Comparing a DOM node's `checked`
property against `false` forces the reader to recall whether the DOM
represents an unchecked box as `false`, `undefined`, or an absent
attribute — and produces a boolean error message either way.
`toBeChecked()` answers the question without the reader needing to know,
and prints the element's markup when it fails. Reaching into a spy's
recorded calls by index to compare a parameter yields a boolean; the
dedicated matcher for call arguments prints the expected and received
argument lists.

## What this is not

This is not a rule that boolean assertions are forbidden. Code that
genuinely operates on a boolean — a flag, a predicate's return, a field
that is a boolean in the domain — has nothing richer to assert on, and
`toBe(true)` is the honest assertion there.

The distinction is whether the boolean existed in the data or was
manufactured in the test. A boolean that the test computed is a boolean
the test destroyed information to produce.

## Where it hides

The reduction is rarely written as an obvious comparison. It arrives as:

- a comparison inside `expect(...)` rather than between `expect` and the
  matcher
- a truthiness check standing in for a specific state check
- a manual property lookup that flattens a rich object before the
  matcher sees it
- a custom error message supplied by hand, which shifts the burden of
  keeping the message accurate onto whoever edits the test next, and
  which goes stale silently because nothing validates it

## The verification move

The property being discussed here is only observable in the failing run,
so it cannot be judged by reading a passing test. The check is to break
the assertion deliberately once — invert it, change the expected value —
read the message the framework produces, and then restore it. This
answers two questions at once: whether the message is legible, and
whether the test can fail at all.

That second question is not rhetorical. A test whose assertion is
unreachable, or whose promise is never awaited, is green for reasons
unrelated to the code under test.

## Questions worth asking

- If this line goes red in six months, does the message name the defect,
  or only announce that one exists?
- Did the boolean in this assertion come from the data, or did the test
  make it?
- Is there a matcher that already knows the shape being asserted on, and
  would therefore print it?
- Has this assertion ever been observed failing?

## Who pays

The developer choosing the coarse assertion saves a few seconds and
finishes the ticket. The payer is whoever triages that test later — a
teammate, or the same developer with the context gone — who gets
`expected true to be false` from a suite of several hundred tests and
must reconstruct by hand the state the assertion already had and threw
away.

## Adjacent, deliberately not covered here

Which mocking technique fits which test case, and how the choice of test
double changes what an assertion can even see, is a separate concern
that needs its own map. Assertion precision assumes the value under
assertion is already the right value; choosing test doubles is what
makes that true.
