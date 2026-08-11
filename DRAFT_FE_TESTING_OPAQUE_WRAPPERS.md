# Draft — wrappers that hide what is tested

Status: draft, outside the curator pipeline. Not distilled, not probed,
no maintainer verdict.

Scope: RTL + happy-dom + Vitest. Companion to the assertion-noise draft,
which covers the opposite failure of the same decision.

## The problem

Extraction in test code is judged by the wrong criterion. The usual
question is whether the helper removes duplication, and by that measure
almost any extraction succeeds. The question that matters is whether a
reader who has never seen this file can still say what the test
verifies.

A helper can pass the duplication test and fail the comprehension test
completely. When it does, the test still runs, still catches
regressions, and is no longer readable as a statement about the system —
which is most of what a test is for.

## The mechanism

The failure comes from naming a helper after its contents rather than
after a thing. A helper that bundles several assertions gets called
something summarizing the bundle. That summary is a word the author
coined while looking at the code, and it names a grouping that exists
nowhere else — not in the domain, not in the production code, not in any
conversation the team has had.

The reader encounters the word, has no referent for it, and must open
the helper to learn anything. The extraction has converted visible
mechanics into a term of art with one user, which is a private language.

The tell is that the name cannot be found anywhere else in the codebase.
A concept that exists only in test helpers is usually not a concept.

## The distinction from good extraction

Extraction works when the name already means something. A domain term, a
state the product genuinely has, a role a user occupies — these carry
meaning the reader brings with them, and the helper attaches mechanics
to a referent that already exists.

The direction of causation is the whole thing. If the concept was
identified first and the helper written to serve it, the name has a
referent. If the code was written first and the name chosen to cover it,
the name is a label on a box.

## The reader test

The check is to read the test as someone with no context: no knowledge
of the file, the helper, or the feature. From the test body alone, can
you state what behavior is claimed and what would make it false?

This is harder to run on your own code than it sounds, because the
context is in your head and cannot be voluntarily discarded. What
substitutes reasonably well is asking whether every non-obvious noun in
the test appears somewhere outside the test file. Words that do not are
where meaning was invented rather than referenced.

## The distinct case of setup helpers

Render helpers that mount a component with providers are a different
matter and mostly benign. They hide arrangement, not claims, and their
name usually describes an obvious action.

They turn harmful at the point where they start making assertions or
choosing between behaviors internally. Then the test body no longer
contains the full setup, and a reader who assumed the helper only
mounted things is wrong in a way nothing signals.

## Questions worth asking

- Does every noun in this test refer to something that exists outside
  this file?
- Could a reader state what this test claims without opening the helper?
- Was this name chosen because the concept exists, or to summarize the
  code that ended up inside?
- Does this setup helper only arrange, or does it also decide and
  assert?

## Who pays

The developer extracting the helper compresses the test and removes
repetition, and the name makes sense to them because they hold the
context that gave rise to it. The payer is the next reader, who sees a
short test that appears clear, discovers the clarity is borrowed from a
word they cannot resolve, and must reconstruct the meaning from the
helper's implementation — arriving where they would have been with no
extraction at all, after spending the time.
