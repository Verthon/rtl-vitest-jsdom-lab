# Purpose

This repo is a lab for the common mistakes people make writing Vitest + React
Testing Library + happy-dom tests — the kind that survive code review, not
the kind the linter already catches (e.g. an un-awaited RTL async query is
already an ESLint rule; that's not our problem space).

The goal is to turn each recurring mistake into a skill an agent can apply
during review or authoring. A mistake belongs here only if it is both
genuinely common and not mechanically detectable — no style nitpicks, no
rules a linter could express.

- `TESTING_PITFALLS.md` — the current list, one to two sentences each.
- `DRAFT_FE_TESTING_*.md` — longer, unreviewed explorations of individual
  pitfalls. Draft status: not distilled, not yet turned into skills.
