import { within } from '@testing-library/react'
import { measure, ratio, formatRatio } from './measure'
import {
  byDepth,
  depthOf,
  hideElement,
  nestedChain,
  renderTier,
  TIER_NAMES,
  tierReady,
  type TierName,
} from './tiers'

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
}

const TARGETS: Record<TierName, TierTargets> = {
  small: { role: 'heading', name: 'Employees' },
  medium: { role: 'button', name: 'Next' },
  huge: { role: 'button', name: 'Submit' },
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
  return measured > 1 ? 'toBeVisible is dearer' : 'toBeInTheDocument is dearer'
}

function cheapestOf<T extends { value: number }>(entries: T[]) {
  return entries.reduce((best, entry) => (entry.value < best.value ? entry : best))
}

function worthIt(rendersSaved: number) {
  if (rendersSaved >= 1) return 'the swap pays for itself against one render'
  return `you would need ~${Math.round(1 / rendersSaved)} such swaps to save the cost of ONE render`
}

describe('probe 12 — toBeVisible vs toBeInTheDocument', () => {
  it('measures what the "toBeInTheDocument is faster" folk rule actually buys, at every tier', async () => {
    const perTier: { name: TierName; value: number; depth: number }[] = []

    for (const name of TIER_NAMES) {
      await withTier(name, (container) => {
        const target = within(container).getByRole(TARGETS[name].role, {
          name: TARGETS[name].name,
        })

        const result = ratio(
          () => {
            expect(target).toBeVisible()
          },
          () => {
            expect(target).toBeInTheDocument()
          },
          RUNS,
        )

        const depth = depthOf(target)
        perTier.push({ name, value: result.ratio, depth })

        console.log(
          `[probe12 ${name}] toBeVisible/toBeInTheDocument=${formatRatio(result.ratio)} (${result.a.median.toFixed(4)}ms vs ${result.b.median.toFixed(4)}ms, target at depth ${depth}) — ${verdictFor(result.ratio)}`,
        )
      })
    }

    const cheapest = cheapestOf(perTier)

    expect(
      cheapest.value,
      'toBeVisible came out no dearer than toBeInTheDocument at some tier. jest-dom runs the same root-node check in both and then walks every ancestor calling getComputedStyle, so it cannot be cheaper — the measurement is not reaching the matcher',
    ).toBeGreaterThan(NOISE_FLOOR)
  }, 60000)

  it('locates the cost in the ancestor walk, by varying depth over a range real trees do not span', async () => {
    await withTier('huge', (container) => {
      // Real components do not spread far enough in depth to isolate the walk:
      // across every p/heading/button in the huge tier the range is depth 5 to
      // 9, and that 1.8x span moves toBeVisible by ~1.2x — at the noise floor,
      // reported below but not leaned on. The synthetic chain is what actually
      // separates the ancestor walk from the matcher's fixed overhead.
      const { shallowest, deepest } = byDepth(container, 'p, h1, h2, h3, button')
      const realShallow = measure(() => {
        expect(shallowest.element).toBeVisible()
      }, RUNS)
      const realDeep = measure(() => {
        expect(deepest.element).toBeVisible()
      }, RUNS)

      console.log(
        `[probe12] on the real tree, depth ${shallowest.depth} → ${deepest.depth} moves toBeVisible ${formatRatio(realDeep.median / realShallow.median)} — reported, but at the noise floor`,
      )

      const LINKS = [1, 16, 48]
      const atDepth = LINKS.map((links) => {
        const leaf = nestedChain(container, links)
        const depth = depthOf(leaf)
        const measurement = measure(() => {
          expect(leaf).toBeVisible()
        }, RUNS)
        return { depth, median: measurement.median }
      })

      const nearest = atDepth[0]
      const furthest = atDepth[atDepth.length - 1]
      const costRatio = furthest.median / nearest.median
      const depthRatio = furthest.depth / nearest.depth
      const perLevel = (furthest.median - nearest.median) / (furthest.depth - nearest.depth)

      console.log(
        `[probe12] synthetic chain: ${atDepth.map((entry) => `depth ${entry.depth}=${entry.median.toFixed(4)}ms`).join(', ')} — cost ${formatRatio(costRatio)} for ${formatRatio(depthRatio)} the depth, ~${(perLevel * 1000).toFixed(2)}µs per ancestor level`,
      )
      console.log(
        `[probe12] mechanism (jest-dom 7.0.1, dist/matchers): isElementVisible recurses element -> parentElement to the root, calling getComputedStyle at every level. toBeInTheDocument does one getRootNode comparison and stops. toBeVisible runs that same comparison first, so it is a strict superset of the work, never an alternative to it.`,
      )

      expect(
        costRatio,
        'toBeVisible did not get dearer as ancestor depth grew, so its cost is not the ancestor walk and the stated mechanism is wrong',
      ).toBeGreaterThan(NOISE_FLOOR)

      expect(
        perLevel,
        'the per-ancestor cost came out at or below zero, so the depth sweep is not measuring the walk',
      ).toBeGreaterThan(0)
    })
  }, 60000)

  it('sizes the saving against one render, which is what decides whether the rule is worth following', async () => {
    const name: TierName = 'huge'

    for (let index = 0; index < 2; index += 1) {
      const view = await renderTier(name, tierReady[name])
      view.cleanup()
    }

    const renderSamples: number[] = []
    for (let index = 0; index < 8; index += 1) {
      const start = performance.now()
      const view = await renderTier(name, tierReady[name])
      renderSamples.push(performance.now() - start)
      view.cleanup()
    }
    const sortedRenders = [...renderSamples].sort((left, right) => left - right)
    const renderCost = sortedRenders[Math.floor(sortedRenders.length / 2)]

    await withTier(name, (container) => {
      const target = within(container).getByRole(TARGETS[name].role, { name: TARGETS[name].name })

      const result = ratio(
        () => {
          expect(target).toBeVisible()
        },
        () => {
          expect(target).toBeInTheDocument()
        },
        RUNS,
      )

      const savingPerSwap = result.a.median - result.b.median
      const rendersSaved = savingPerSwap / renderCost

      console.log(
        `[probe12] swapping one toBeVisible for one toBeInTheDocument saves ${(savingPerSwap * 1000).toFixed(1)}µs. One ${name}-tier render costs ${renderCost.toFixed(2)}ms — ${worthIt(rendersSaved)}.`,
      )

      expect(
        rendersSaved,
        'one assertion swap now saves an appreciable fraction of a render, so the folk rule has become a real optimization on this machine and COSTS.md must stop calling it noise',
      ).toBeLessThan(0.01)
    })
  }, 120000)

  it('pins that the two are not interchangeable: toBeInTheDocument passes on an element toBeVisible rejects', async () => {
    await withTier('huge', (container) => {
      const target = within(container).getByRole(TARGETS.huge.role, { name: TARGETS.huge.name })

      hideElement(target)

      expect(
        target,
        'a display:none element is no longer in the document, so this tier cannot demonstrate the non-equivalence',
      ).toBeInTheDocument()

      expect(() => {
        expect(target).toBeVisible()
      }, 'toBeVisible now passes on a display:none element — the two assertions have become interchangeable and the precision argument against the folk rule is dead').toThrow(/element is not visible/)
    })
  }, 60000)
})
