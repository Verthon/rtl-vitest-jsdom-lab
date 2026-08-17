import { screen, within } from '@testing-library/react'
import { measure, ratio, formatRatio } from './measure'
import { enclosingScope, profileOf, renderTier, TIER_NAMES, tierReady, type TierName } from './tiers'

// The smallest ratio measure.ts can tell apart from "no difference at all" on
// this machine. A probe landing under it has not found anything — it is
// reported as too close to call, never as "slightly slower". Derived at run
// time by measure.spec.ts > 'finds the noise floor …'; pinned here by hand, so
// re-run that spec on a new machine rather than trusting this number.
const NOISE_FLOOR = 1.1

const RUNS = { warmup: 5, runs: 25 }

type TierTargets = {
  role: 'heading' | 'button'
  name: string
  text: string
}

const TARGETS: Record<TierName, TierTargets> = {
  small: { role: 'heading', name: 'Employees', text: 'Employees' },
  medium: { role: 'button', name: 'Next', text: 'Next' },
  huge: { role: 'button', name: 'Submit', text: 'Submit' },
}

async function withTier<T>(name: TierName, fn: (container: HTMLElement) => T): Promise<T> {
  const view = await renderTier(name, tierReady[name])
  try {
    return fn(view.container)
  } finally {
    view.cleanup()
  }
}

function verdictFor(measured: number) {
  if (Math.abs(measured - 1) + 1 < NOISE_FLOOR) return 'too close to call'
  return measured < 1 ? 'within() is faster' : 'within() is slower'
}

const LIST_ROLE: Record<TierName, 'cell' | 'tab'> = {
  small: 'cell',
  medium: 'tab',
  huge: 'tab',
}

function uniqueNames(elements: HTMLElement[]) {
  const counts = new Map<string, number>()
  for (const element of elements) {
    const text = (element.textContent ?? '').trim()
    if (text) counts.set(text, (counts.get(text) ?? 0) + 1)
  }
  return [...counts.entries()].filter(([, count]) => count === 1).map(([text]) => text)
}

function tagFor(container: HTMLElement, target: TierTargets) {
  const testidHost = within(container).getByRole(target.role, { name: target.name })
  testidHost.setAttribute('data-testid', 'lab-target')
  return testidHost
}

describe('happy-dom query caching', () => {
  it('is answered before any other row: the first query on a never-queried tree costs multiples of a repeat, so every row below is warm cost', async () => {
    for (const name of TIER_NAMES) {
      const target = TARGETS[name]

      const firstOnFreshTree: number[] = []
      for (let attempt = 0; attempt < 8; attempt += 1) {
        await withTier(name, (container) => {
          const scope = within(container)
          const start = performance.now()
          scope.getByRole(target.role, { name: target.name })
          firstOnFreshTree.push(performance.now() - start)
        })
      }

      await withTier(name, (container) => {
        const scope = within(container)
        const repeated = measure(
          () => {
            scope.getByRole(target.role, { name: target.name })
          },
          { warmup: 20, runs: 25 },
        )

        const plateau = firstOnFreshTree.slice(2)
        const sorted = [...plateau].sort((a, b) => a - b)
        const freshMedian = sorted[Math.floor(sorted.length / 2)]
        const speedup = freshMedian / repeated.median

        console.log(
          `[cache ${name}] first-query-on-fresh-tree ${freshMedian.toFixed(3)}ms vs repeated ${repeated.median.toFixed(3)}ms — ${formatRatio(speedup)}`,
        )
        console.log(
          `[cache ${name}] per-fresh-tree first queries: ${firstOnFreshTree.map((value) => value.toFixed(3)).join(', ')}`,
        )

        expect(
          speedup,
          `tier ${name}: the first query on a never-queried tree is no longer materially dearer than a repeat — the warm-cost caveat in COSTS.md is stale and the probes below now report cold cost`,
        ).toBeGreaterThan(3)

        const lastTwo = plateau.slice(-2)
        const lateMedian = Math.min(...lastTwo)
        expect(
          lateMedian / repeated.median,
          `tier ${name}: the effect vanished on the last fresh trees rendered, so it is JIT warmup decaying rather than per-tree work`,
        ).toBeGreaterThan(3)
      })
    }
  }, 60000)

})

// The testid query is this probe's baseline — measuring its cost requires
// issuing it. The tag is applied to a lab-owned copy of the tier tree at run
// time; `tiers.spec.ts` asserts no `data-testid` exists in any tier's own markup.
/* eslint-disable testing-library/no-test-id-queries */
describe('probe 1 — getByRole vs getByText vs getByTestId', () => {
  it('measures all three query strategies against one target at every tier', async () => {
    for (const name of TIER_NAMES) {
      await withTier(name, (container) => {
        const scope = within(container)
        const target = TARGETS[name]
        tagFor(container, target)

        const roleVsTestid = ratio(
          () => {
            scope.getByRole(target.role, { name: target.name })
          },
          () => {
            scope.getByTestId('lab-target')
          },
          RUNS,
        )

        const textVsTestid = ratio(
          () => {
            scope.getByText(target.text, { selector: '*' })
          },
          () => {
            scope.getByTestId('lab-target')
          },
          RUNS,
        )

        console.log(
          `[probe1 ${name}] role/testid=${formatRatio(roleVsTestid.ratio)} text/testid=${formatRatio(textVsTestid.ratio)}`,
        )

        expect(
          roleVsTestid.ratio,
          `tier ${name}: a role query should not be cheaper than a testid query`,
        ).toBeGreaterThan(NOISE_FLOOR)
      })
    }
  }, 60000)
})
/* eslint-enable testing-library/no-test-id-queries */

describe('probe 2 — the same role query across the three tiers', () => {
  it('reports cost per node and per match, subject to the size/kind confound', async () => {
    const perTier: { name: TierName; median: number; nodes: number; matches: number }[] = []

    for (const name of TIER_NAMES) {
      await withTier(name, (container) => {
        const scope = within(container)
        const nodes = profileOf(container).nodes

        const matches = scope.getAllByRole('heading').length
        const measurement = measure(() => {
          scope.getAllByRole('heading')
        }, RUNS)

        perTier.push({ name, median: measurement.median, nodes, matches })
        console.log(
          `[probe2 ${name}] nodes=${nodes} matches=${matches} median=${measurement.median.toFixed(3)}ms perNode=${((measurement.median / nodes) * 1000).toFixed(2)}µs perMatch=${((measurement.median / matches) * 1000).toFixed(2)}µs`,
        )
      })
    }

    const nodeCounts = perTier.map((entry) => entry.nodes)
    const sizeSpread = Math.max(...nodeCounts) / Math.min(...nodeCounts)

    expect(
      sizeSpread,
      'the tiers span too little size for any scaling claim; if this grew past 2x, probe 2 must be rewritten as a real scaling probe',
    ).toBeLessThan(2)

    const perNode = perTier.map((entry) => (entry.median / entry.nodes) * 1000)
    const perMatch = perTier.map((entry) => (entry.median / entry.matches) * 1000)
    const perNodeSpread = Math.max(...perNode) / Math.min(...perNode)
    const perMatchSpread = Math.max(...perMatch) / Math.min(...perMatch)

    console.log(
      `[probe2] per-node cost varies ${perNodeSpread.toFixed(1)}x across tiers; per-match cost varies ${perMatchSpread.toFixed(1)}x`,
    )

    expect(
      perMatchSpread,
      'per-match cost was supposed to be the stable unit; if it now varies more than per-node cost, the COSTS.md claim that role-query cost tracks matches rather than tree size is dead',
    ).toBeLessThan(perNodeSpread)
  }, 60000)
})

describe('probe 3 — within(scope) vs a screen-wide query', () => {
  it('answers whether within() is a performance tool or only a disambiguation tool', async () => {
    for (const name of TIER_NAMES) {
      await withTier(name, (container) => {
        const target = TARGETS[name]
        const element = within(container).getByRole(target.role, { name: target.name })
        const scope = enclosingScope(element, container)

        const result = ratio(
          () => {
            within(scope).getByRole(target.role, { name: target.name })
          },
          () => {
            screen.getByRole(target.role, { name: target.name })
          },
          RUNS,
        )

        console.log(
          `[probe3 ${name}] within/screen=${formatRatio(result.ratio)} — ${verdictFor(result.ratio)}`,
        )

        expect(
          result.ratio,
          `tier ${name}: within() came out more than 2x faster than screen, which would make it a genuine performance tool and contradicts COSTS.md`,
        ).toBeGreaterThan(0.5)
      })
    }
  }, 60000)
})

describe('probe 4 — getAllByRole once vs getByRole N times', () => {
  it('measures whether reaching for the list and indexing beats repeated lookups', async () => {
    for (const name of TIER_NAMES) {
      await withTier(name, (container) => {
        const scope = within(container)
        const listRole = LIST_ROLE[name]
        const all = scope.getAllByRole(listRole)
        const names = uniqueNames(all).slice(0, 5)

        expect(
          names.length,
          `tier ${name}: probe 4 needs several uniquely-named ${listRole} elements to query for`,
        ).toBeGreaterThanOrEqual(3)

        const result = ratio(
          () => {
            for (const itemName of names) {
              scope.getByRole(listRole, { name: itemName })
            }
          },
          () => {
            const fetched = scope.getAllByRole(listRole)
            for (let index = 0; index < names.length; index += 1) {
              void fetched[index]
            }
          },
          RUNS,
        )

        console.log(
          `[probe4 ${name}] ${names.length}x getByRole(${listRole}) vs one getAllByRole: ${formatRatio(result.ratio)}`,
        )

        expect(
          result.ratio,
          `tier ${name}: N scoped role queries should not be cheaper than one getAllByRole plus indexing`,
        ).toBeGreaterThan(NOISE_FLOOR)
      })
    }
  }, 60000)
})

describe('probe 5 — role query with { name } vs without', () => {
  it('measures what accessible-name filtering adds to the role walk', async () => {
    for (const name of TIER_NAMES) {
      await withTier(name, (container) => {
        const scope = within(container)
        const target = TARGETS[name]

        const result = ratio(
          () => {
            scope.getAllByRole(target.role, { name: target.name })
          },
          () => {
            scope.getAllByRole(target.role)
          },
          RUNS,
        )

        console.log(`[probe5 ${name}] with-name/without-name: ${formatRatio(result.ratio)}`)

        expect(
          result.ratio,
          `tier ${name}: name filtering came out cheaper than the bare role query, which cannot be right`,
        ).toBeGreaterThan(NOISE_FLOOR)
      })
    }
  }, 60000)
})

// The label an `htmlFor`/`id` pair puts on a real input, per tier. `huge`
// (/onboarding/review) is absent deliberately: it renders no form control at
// all — it is nine summary cards — so it cannot host this probe, and no
// substitute element was invented to give it a row.
const LABELLED: [TierName, string][] = [
  ['small', 'Filter by name'],
  ['medium', 'First name'],
]

/* eslint-disable testing-library/no-test-id-queries */
describe('probe 13 — getByLabelText against the same input', () => {
  it('places the label query on probe 1’s scale, at the tiers that render a labelled control', async () => {
    for (const [name, label] of LABELLED) {
      await withTier(name, (container) => {
        const scope = within(container)
        const input = scope.getByLabelText(label)
        input.setAttribute('data-testid', 'lab-label-target')

        const labelVsTestid = ratio(
          () => {
            scope.getByLabelText(label)
          },
          () => {
            scope.getByTestId('lab-label-target')
          },
          RUNS,
        )

        const roleVsTestid = ratio(
          () => {
            scope.getByRole('textbox', { name: label })
          },
          () => {
            scope.getByTestId('lab-label-target')
          },
          RUNS,
        )

        console.log(
          `[probe13 ${name}] label/testid=${formatRatio(labelVsTestid.ratio)} role/testid=${formatRatio(roleVsTestid.ratio)} — label/role=${formatRatio(labelVsTestid.ratio / roleVsTestid.ratio)}`,
        )

        expect(
          labelVsTestid.ratio,
          `tier ${name}: getByLabelText came out no dearer than a testid lookup, so the measurement is not reaching the label resolution`,
        ).toBeGreaterThan(NOISE_FLOOR)

        expect(
          labelVsTestid.ratio / roleVsTestid.ratio,
          `tier ${name}: getByLabelText is no longer dearer than getByRole('textbox', { name }) against the same input — the recorded ordering is stale`,
        ).toBeGreaterThan(NOISE_FLOOR)
      })
    }
  }, 60000)
})
/* eslint-enable testing-library/no-test-id-queries */
