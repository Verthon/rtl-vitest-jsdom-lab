# RTL / Vitest / happy-dom lab

## Goal

Find the test mistakes that survive code review. Not the ones a linter
catches — the judgment calls.

Each mistake becomes a skill an agent can apply when reviewing or writing
tests. Claims get measured here first, so a skill can say "6x", not "slower".

The app under `src/` exists only to give the probes something real to run
against.

## The three labs

Every lab is executable. Run one and you reproduce its numbers.

### `lab/assertion-precision/`

**Question:** when an assertion fails, does the message name the bug?

Runs a coarse assertion and a precise one against the same broken value, then
captures what each one actually printed. Also lints both forms with this
repo's own config, to see where oxlint already covers you and where only a
reviewer does.

**Findings:** `lab/assertion-precision/MATRIX.md` — a matcher per data type,
plus the rule that enforces it (or `judgment` when nothing does).

### `lab/component-mocks/`

**Question:** does TypeScript notice when a mocked component drifts from the
real one?

Typechecks a mock against a changed component. Renaming a prop is caught.
Adding one is not.

**Findings:** `.agents/skills/component-mocks/SKILL.md`.

### `lab/test-speed/`

**Question:** what do RTL, jest-dom and happy-dom actually cost?

Measures queries, assertions, async helpers and module imports. Everything is
a ratio between two forms in the same run, on the same tree, at three tree
sizes. Ratios under the measured noise floor are reported as *too close to
call*.

**Findings:** `RTL_COST.md` is the one page to read. `lab/test-speed/COSTS.md`
is the full write-up with method and caveats.

## Where everything lives

| File | What it is |
|---|---|
| `TESTING_PITFALLS.md` | The problem space. Every pitfall, one or two sentences. |
| `RTL_COST.md` | What RTL costs, short version. |
| `lab/test-speed/COSTS.md` | What RTL costs, long version. |
| `lab/assertion-precision/MATRIX.md` | Which matcher, and who enforces it. |
| `.agents/skills/*/SKILL.md` | Shipped skills. The finished form of a pitfall. |
| `DRAFT_FE_TESTING_*.md` | Pitfalls not yet distilled into a skill. Deleted when the skill ships. |
| `CONVENTIONS.md` | Structure, mock contract, verification. Read before writing code. |
| `tasks/NNN-*.md` | Scoped work items. |

## Running things

```bash
npm install

npm run test:unit                 # everything
npm run lint

npx vitest run lab/test-speed --disable-console-intercept   # cost probes
npx vitest run lab/assertion-precision

npm run dev                       # the sample app
```

The cost probes print their numbers, so `--disable-console-intercept` matters.

Import cost is measured out of process, because the first import in a process
pays for the whole graph:

```bash
./lab/test-speed/import-cost-oop.sh
```
