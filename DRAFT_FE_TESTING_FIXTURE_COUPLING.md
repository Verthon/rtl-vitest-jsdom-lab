# Draft — fixture coupling

Status: draft, outside the curator pipeline. Not distilled, not probed,
no maintainer verdict.

Scope: RTL + happy-dom + Vitest.

## The problem

Test independence is usually understood as one property: tests must not
share mutable state and must not depend on execution order. That
property is well covered — it is the reason for fresh renders, reset
mocks, and per-test setup, and tooling enforces most of it.

There is a second property that is not the same thing and is not
enforced by anything: how many tests read from the same fixture. Tests
can be perfectly independent at runtime — no shared mutation, any
execution order — and still be coupled through a shared definition of
what the data looks like. Editing that definition fails all of them at
once.

The first property is about the run. The second is about the edit.

## The mechanism

A fixture starts as a convenience. One test needs a user object with
six fields; a second test needs almost the same thing; extracting it is
obviously correct. The extraction repeats, and the fixture accumulates
fields, because each new consumer needs one thing the previous ones did
not.

Now the fixture describes no particular scenario. It is a union of
everything every test needed, and no single test's requirements are
visible in it. A test asserting on a filtered count depends on the exact
composition of the collection, but nothing in the test says which
property of the collection it depends on. The dependency is real and
undocumented.

When someone adds a field or changes a value for a new test, the tests
that break are the ones whose undocumented dependency was violated.
The failure count is a function of fixture reach, not of defect size —
one edit, forty reds, and no signal about which of the forty found
something real.

## The reframing

The number to look at is not how large the fixture is. It is how many
tests would go red if one value in it changed, and whether a person
making that change could predict which ones.

At a handful of consumers this is manageable and the deduplication was
worth it. At scale the fixture has become a schema that many tests
depend on for unstated reasons, and it can no longer be edited — only
appended to. Append-only fixtures grow monotonically, which makes the
next edit worse, which makes appending more attractive.

Builders and factories address this by letting each test state the part
it cares about and defaulting the rest. The gain is not less
duplication; it is that the dependency becomes visible in the test that
holds it, so the blast radius of an edit is legible before making it.

## Where the tension is real

Fully local test data has its own cost. Repeating a twelve-field object
in thirty tests means a schema change requires thirty edits, and reviews
of those diffs are unreadable. The pull toward extraction is not a
mistake.

The judgment is about which axis of change is more likely: the shape of
the data, or what individual tests need from it. Shared fixtures are
cheap when the shape churns and the requirements are uniform. They are
expensive in the reverse case, which is the more common one as a suite
ages.

## Questions worth asking

- If one value in this fixture changed, how many tests go red, and
  would the person making the change be able to predict which?
- Does this test state which property of the data it depends on, or
  only consume the whole thing?
- Has this fixture been edited recently, or only appended to?
- Is the reason for extracting this the shape of the data, or the
  discomfort of repetition?

## Who pays

Whoever extracts the shared fixture removes visible duplication and
makes the immediate diff smaller. The payer is whoever needs the fixture
to say something slightly different a year later, and finds that the
smallest change that serves their test also reddens tests across the
suite whose relationship to the fixture nobody recorded — leaving them
to either append yet another variant or triage failures they did not
cause.
