# 013 — `test-altitude`: the skill

Read `AGENTS.md`, `CONVENTIONS.md`, and the *skill pipeline* section of
`HANDOFF.md` first.

**This task is not ready to execute.** One framing decision is open (below). It
is written down now so tomorrow starts from a position rather than from scratch.

## The pitfall

People write tests against leaves of the component tree — `<PriceCell price={99} />`,
`<Step7 />` with seeded props — instead of the page-level test that covers the
user journey. The defence is speed: high-level tests are slow and time out on CI.

Note this pitfall is **not** in `TESTING_PITFALLS.md`. Thirteen entries, none of
them this. It is new problem space, not a distillation of an existing draft.

### It splits three ways

Named so the skill can be scoped to one or more deliberately:

- **A — wrong entry point.** Mounts `<PriceCell price={99} />` instead of the
  page. Visible from the render call alone.
- **B — wrong assertion altitude.** Mounts the page, then reaches straight for
  `getByTestId('price-cell')`. Looks like an integration test; isn't one. Common
  in mature codebases and much harder to see.
- **C — the tree was never traversed.** Mounts the page but jumps to step 7 by
  seeding state or mocking the navigation context, instead of walking steps 1–6.
  Altitude looks right; the journey is skipped.

**C is the one with real-world evidence in this repo.**
`CORP_TESTING_PITFALLS_EXAMPLES.md` opens with it: a Stepper spec that mocks
`useSteppedNavigationContext` to force `processStep: 1`, renders, and asserts a
translation string is present. The journey is skipped by mocking the thing that
would have carried you through it. That file also names "lack of business
oriented names" with specimens like `'should render properly for external'` —
`external` being a prop name. A test named after a prop is a test written at
prop altitude.

## The hard part — why the naive rule fails

"Flag leaf tests" is wrong. A leaf test is not a defect by itself:
`<DatePicker />` with thirty date-parsing edge cases is *correct* to test
directly, and driving thirty cases through a ten-step wizard would be absurd.

The real predicate is narrower: **is this leaf test standing in for a journey
test that does not exist?** A leaf test is a problem when it is the only thing
proving a behavior, or when it duplicates what a journey test already proves and
displaces maintenance of it.

Cases that map the boundary — the skill must get all five right:

| # | Case | Read |
|---|---|---|
| 1 | `<DatePicker />`, 30 parsing cases; page test covers happy path | legitimate — combinatorial coverage belongs low |
| 2 | `<PriceCell price currency />` renders `€99`; nothing else touches pricing | **substitute** — nothing proves a real price reaches that cell |
| 3 | `<SubmitButton disabled />`; page test also covers submit blocked | duplicate, not substitute — finding or noise? open |
| 4 | `<Step7 />` seeded; page test walks 1–6 and stops | **C** — journey never reaches the thing tested |
| 5 | `<EmployeeRow employee={fixture} />` 4 cells; page test asserts rows exist | genuinely ambiguous |

## Prior art — settled by research, do not re-derive

A deep research pass was run on whether test altitude has been made reviewable.
Findings that bind this task:

**Nobody has made this mechanical, and the reason is documented in our own
toolchain.** `eslint-plugin-testing-library` issue #373 proposed a
`prefer-appearance` rule and it was declined — the maintainer called it "really
tricky to report this correctly", the proposer conceded "we can't infer how the
component is written", and it was closed the same day (2021-05-07).
`typescript-eslint` #5923 was closed `wontfix` on the same shape of objection
("unresolvable false-positives"). **This is a citation for the skill's
existence**, not a setback: it is the maintainers of the plugin this repo already
runs 27 rules from, locating the boundary exactly where `AGENTS.md` says this
repo lives.

⚠️ **Verify #373 before citing it.** The research flagged its own attribution
gap: the maintainer's username is inferred from thread context, not confirmed.
Open the issue and confirm the quotes and who said them. This repo's standard is
that a claim names its source; an inferred attribution does not meet it.

**The core predicate has prior art — use it, do not invent one.** Cucumber's
official "Writing better Gherkin" docs give the only criterion found that applies
to a single test, is answerable yes/no, and transfers to React:

> "Will this wording need to change if the implementation does?"

Operationalised: *would this assertion have to change if the component were
refactored without changing user-visible behavior?* If yes, it is at too low an
altitude.

This is the same move `DRAFT_FE_TESTING_BEHAVIOR_VS_STATE.md` already makes —
"if someone restructured this component's internals without changing what a user
experiences, would this test still pass?" The draft applies it to assertions
within a component and never takes the last step: **the component you chose to
mount is itself an internal arrangement.** That step is this skill.

**The leaf-vs-substitute call also has prior art.** Automation Panda's BDD 101:

> "Is the risk that this feature has a regression significantly covered by the
> unit test? If yes, there is no need to create an end-to-end test for it as
> well."

Inverted, that is the substitute test: *is the risk already covered somewhere
higher, and if not, is this leaf test pretending it is?*

**Two findings that cut against the skill — carry them, do not bury them:**

1. Trautsch & Grabowski (*JSS*) classified 38,782 tests as unit or integration
   per the IEEE definition and mutation-tested 17 projects: **neither level was
   better at detecting defect types.** If that holds, "test higher because it
   catches more bugs" is dead. The skill's argument must be about *what is
   verified* — a journey versus a prop contract — not about detection rate. That
   is a stronger argument, but it is a different one, and the skill must not
   quietly make the discredited one.
2. Every coverage-based redundancy tool in the survey over-reports, per its own
   authors (TeReDetect's precision on the redundancy smell was measured "close to
   zero" in a 2024 study). A Stryker mutant-subsumption gate is therefore not a
   shortcut to the predicate.

**Out of scope and already excluded by the research:** pyramid / trophy /
honeycomb advocacy, anything concluding in a ratio, unit-vs-integration
definitional debate. Do not reintroduce them.

## ⛔ The open decision — resolve before executing

The skill can frame altitude three ways. **This is not settled and must not be
guessed at.**

1. **Coverage** — is this leaf test the only thing proving this behavior? The
   research pushes here: the Automation Panda substitution test is a coverage
   question, and it is the framing that catches case 2 and case 4.
2. **Mocking** — what did you mock to avoid the journey? This is what the corp
   specimen actually shows. **Risk: overlaps `component-mocks`, which already
   ships.** If the skill lands here, the boundary between the two must be stated,
   or review gets two skills firing on one line.
3. **Naming** — does the name describe a user's goal or a component's props?
   Nearly mechanical, rampant per the corp file, but shallow — it detects the
   symptom, not the defect.

The maintainer sees these in review and makes this call. Once made, the scope
question below follows from it.

## The scope question — follows from the framing

`assertion-precision` and `component-mocks` are both **single-file** skills: they
judge the spec in front of them. This one probably cannot be, and that is a real
departure worth deciding deliberately.

- **Single file** — cheap, runs on a diff. Catches A reliably, B sometimes, C
  rarely. Will flag legitimate leaf tests, because from one file you cannot tell
  whether a journey test exists.
- **Spec + the component it mounts** — can ask "is this a leaf or a page?" and
  "could a user observe this?". Catches B properly.
- **Whole suite** — can answer "is this the only coverage?", which is the
  coverage framing's actual question. But that is a repo audit, not a review
  skill.

Note the tension: framing 1 is the best-supported, and it is the one that most
needs whole-suite scope. That tension is the thing to resolve, not to average
over.

## Prerequisites

- **011 / 012** supply the speed evidence. The standing objection to this skill
  is "high-level tests are too slow"; 011 measures whether that is real or a
  misattribution, and the skill's counter-argument must cite `COSTS.md` rather
  than assert. **If 011 finds the objection is substantially correct, this
  skill's argument changes shape** — that is a real possible outcome, not a
  formality.
- **More corp specimens.** One Stepper example is thin evidence for a skill.
  Per the pipeline, a pitfall earns a rule when the repo holds instances of it.
  Ask for three or four more real specimens before writing rules.

## Gates (for when it executes)

- The skill states which of A / B / C it owns, and does not silently drift.
- Its predicate is the Cucumber/`BEHAVIOR_VS_STATE` refactor question, cited, not
  a newly invented one.
- All five boundary cases above are worked examples, including the two the skill
  should **not** flag.
- The relationship to `component-mocks` is stated explicitly.
- No claim that higher-level tests detect more defects — Trautsch & Grabowski.
- Speed claims cite `COSTS.md`, not intuition.
- #373 attribution verified before it is cited.
- `TESTING_PITFALLS.md` gains an entry for this pitfall — it currently has none.
