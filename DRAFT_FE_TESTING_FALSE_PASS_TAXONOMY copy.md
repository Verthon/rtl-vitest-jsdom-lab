# Draft — false-pass / false-fail

Status: draft, outside the curator pipeline. Not distilled, not probed,
no maintainer verdict.

Scope: RTL + happy-dom + Vitest.

## The problem

Two people discussing a misbehaving test can use the phrase "false
positive" for opposite situations and neither will notice. The term is
borrowed from diagnostics, where it means the test reported the
condition it screens for when the condition was absent. Applied to
software tests, it inherits an ambiguity that diagnostics does not have:
what is the condition being screened for?

If the test screens for failure, then a false positive is a test that
goes red on correct code. If the test screens for passing, then a false
positive is a test that goes green on broken code. Both readings are
defensible, both are in circulation, and the phrase carries no signal
about which one the speaker means.

## Why the ambiguity survives

Because the sentence usually still parses. "We had a false positive in
CI" is a complete-sounding statement that both parties will interpret,
and their interpretations may differ by exactly one hundred and eighty
degrees. Nothing in the exchange forces the discrepancy into the open.

The cost surfaces later and elsewhere: in a decision about whether to
trust a red build, in a bug report that attributes a regression to
flakiness, in a review comment that reads as agreement and was not.

## The replacement

Naming the two axes independently removes the ambiguity entirely:

- **true-pass** — test green, code correct
- **true-fail** — test red, code broken
- **false-pass** — test green, code broken
- **false-fail** — test red, code correct

The first word states what the test reported. The second states whether
that report was right. There is no residual question about what is being
screened for, because the vocabulary does not depend on the framing.

This is not a refinement of the old terms. It is a different vocabulary
that happens to cover the same ground without inheriting the defect.

## Why the two error cases are not symmetric

They fail differently and they are found differently.

A **false-fail** announces itself. Someone is standing in front of a red
build and must deal with it. The cost is real — time, and slow erosion
of trust in the suite when it happens often — but the condition is
visible and gets attention.

A **false-pass** is silent by construction. Nothing prompts anyone to
look. It is typically discovered by a production incident in an area the
suite reported as covered, and the discovery arrives with the additional
damage of having been trusted. There is no routine activity that
surfaces false-passes, which is why deliberate verification exists as a
separate practice.

Treating them as two sides of one coin understates the second.

## Questions worth asking

- When someone says the test was a false positive, which of the four
  cases do they mean?
- Was this failure investigated far enough to know it was a false-fail,
  or was it retried until green?
- What routine in this project would surface a false-pass, if one
  existed?
- Is the flakiness in this suite understood, or is it a category people
  put unexplained reds into?

## Who pays

The team that keeps the ambiguous vocabulary saves the small friction of
adopting new words. The payer is whoever inherits a suite where "false
positive" appears in commit messages, review comments, and incident
notes without a stable meaning, and must reconstruct from surrounding
context which failure mode each occurrence described — or, more often,
gives up and treats all of them as noise.
