# Draft — assertion noise obscuring intent

Status: draft, outside the curator pipeline. Not distilled, not probed,
no maintainer verdict.

Scope: RTL + happy-dom + Vitest.

## The problem

A test is read far more often than it is written, and usually under
pressure — something is red and someone needs to know what it claimed.
The first question a reader has is what behavior is being verified. If
answering that requires mentally executing the test line by line, the
test has failed at its most common job regardless of whether it is
correct.

Low-level manipulation is what usually stands in the way. Filtering and
mapping a collection into the thing being asserted on, reaching into a
spy's recorded calls, walking a DOM subtree to find the node that
matters — each step is individually reasonable, and collectively they
bury the claim.

## The mechanism

The details leak upward because the test operates on whatever the
production code hands it. If a function returns a large collection and
the behavior of interest is a count within a subset, the test must do
the narrowing. That narrowing is not the point of the test, but it
occupies most of its lines, and it looks exactly like the parts that are
the point.

Nothing distinguishes setup manipulation from meaningful claim except
the reader's attention. As the test grows, the ratio worsens, and the
intent becomes something the reader reconstructs rather than reads.

## The move

Encapsulating the manipulation behind a named surface is ordinary
information hiding applied to test code. The assertions become named
operations that state what they check, and the mechanics of getting to
the value live below that surface. A chain of named checks reads as a
description of expected state; the same checks expressed as inline
filtering read as a program.

The gain is specifically for the reader on the failing day. The
mechanics still exist and still have to be correct, but they are no
longer competing for attention with the claim.

## The failure mode of the move

This has an inverse defect, and it is the more common outcome when the
technique is applied without care. A helper named after something that
does not exist as a concept in the system replaces visible mechanics
with an opaque word. The reader now cannot see what is checked and has
no way to guess, which is worse than the noise it replaced — noise at
least contains the answer.

The test of a good abstraction here is whether the name corresponds to
something a person on the team would recognize without opening the
helper. Names drawn from the domain pass this. Names invented to
summarize whatever the helper happened to contain do not.

There is also a threshold below which this is not worth doing. A test
with two lines of setup does not need a named surface; adding one is
indirection with no reader to serve.

## Questions worth asking

- Reading this test cold, how long until you know what it claims?
- Which lines here are the claim, and which are getting to it?
- Does this helper's name correspond to a thing that exists, or does it
  summarize a block of code?
- Would a reader need to open the helper to know what failed?

## Who pays

The developer writing the manipulation inline has it fresh in mind and
loses nothing. The payer is every subsequent reader, most often during
an incident, who must reconstruct the intent from mechanics before they
can even begin evaluating whether the failure is real — and who pays it
again on each visit, because the reconstruction is not recorded
anywhere.
