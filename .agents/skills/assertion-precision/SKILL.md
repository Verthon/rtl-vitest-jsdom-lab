---
name: assertion-precision
description: Judge whether an assertion can fail, and whether its failure
    names the defect. Use when reviewing Vitest / React Testing Library specs,
    or when a test failure does not say what broke
---

# Assertion precision

An assertion earns its place twice: it must be able to fail, and its failure
must name what broke. This skill covers what a linter cannot — the expression
is well formed, the matcher exists, the argument has the right type, and only
the meaning is wrong. Forms a configured `eslint-plugin-vitest` /
`eslint-plugin-testing-library` already rejects are listed in each file under
*Already linted* so you can skip them (and pick them back up in a project that
runs neither).

## Triage — three questions, in this order

Ask them of every assertion you review. The first `yes` wins; stop there.

**1. Can you name a defective value this passes on?**
→ [`cannot-fail.md`](cannot-fail.md)
The suite is green and the defect is present. Outranks everything else: the
line is counted as coverage, read as protection, and delivers neither.

**2. Does the failure message omit the name of what broke?**
→ [`does-not-name-the-defect.md`](does-not-name-the-defect.md)
It fails correctly and reports two primitives. Costs debugging time on a test
that is otherwise working — which is why it survives review.

**3. Can something change without this assertion noticing?**
→ [`wrong-subject.md`](wrong-subject.md)
A sibling field, another cell, the order of a list. What it checks is real;
the rest is unguarded.

Each file is a table: form, measured consequence, replacement. Quote the
consequence in the review comment — it is the justification, and it is real
output, not paraphrase.

## Writing the finding

Name the form, quote what it costs, give the swap:

> `expect(rolesById.get('emp-9')).toBe('engineer')` fails with
> `expected undefined to be 'engineer'` and never names the key.
> `expect(rolesById).toStrictEqual(new Map([...]))` prints the whole map.

Do not report a form because a rule also catches it, and do not report one
without saying what it costs.

## Verify by breaking it

Change the code so the claim is false, confirm the test reddens *for the stated
reason*, restore. Reddening for the wrong reason is not a pass. Read the
failure output while you are there: if it does not name the defect, the
assertion is still too coarse.

For category 1 this step is not optional — it is the only way to tell an
assertion that holds from one that cannot fail.
