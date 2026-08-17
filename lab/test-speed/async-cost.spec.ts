import { waitFor, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { measure, formatRatio } from './measure'
import { profileOf, renderTier, TIER_NAMES, tierReady, type TierName } from './tiers'

// The smallest ratio measure.ts can tell apart from "no difference at all" on
// this machine. A probe landing under it has not found anything — it is
// reported as too close to call, never as "slightly slower". Derived at run
// time by measure.spec.ts > 'finds the noise floor …'; pinned here by hand, so
// re-run that spec on a new machine rather than trusting this number.
const NOISE_FLOOR = 1.1

const RUNS = { warmup: 5, runs: 25 }
const ASYNC_RUNS = { warmup: 2, runs: 10 }

const RTL_DEFAULT_INTERVAL = 50

type TierTargets = {
  role: 'heading' | 'button'
  name: string
}

const TARGETS: Record<TierName, TierTargets> = {
  small: { role: 'heading', name: 'Employees' },
  medium: { role: 'button', name: 'Next' },
  huge: { role: 'button', name: 'Submit' },
}

async function withTier<T>(name: TierName, fn: (container: HTMLElement) => Promise<T>): Promise<T> {
  const view = await renderTier(name, tierReady[name])
  try {
    return await fn(view.container)
  } finally {
    view.cleanup()
  }
}

async function measureAsync(fn: () => Promise<unknown>, options = ASYNC_RUNS) {
  for (let index = 0; index < options.warmup; index += 1) {
    await fn()
  }

  const samples: number[] = []
  for (let index = 0; index < options.runs; index += 1) {
    const start = performance.now()
    await fn()
    samples.push(performance.now() - start)
  }

  const sorted = [...samples].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  const median =
    sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]

  return { median, samples }
}

async function ratioAsync(a: () => Promise<unknown>, b: () => Promise<unknown>) {
  for (let index = 0; index < ASYNC_RUNS.warmup; index += 1) {
    await a()
    await b()
  }

  const samplesA: number[] = []
  const samplesB: number[] = []

  for (let index = 0; index < ASYNC_RUNS.runs; index += 1) {
    const startA = performance.now()
    await a()
    samplesA.push(performance.now() - startA)

    const startB = performance.now()
    await b()
    samplesB.push(performance.now() - startB)
  }

  const medianOf = (samples: number[]) => {
    const sorted = [...samples].sort((left, right) => left - right)
    const middle = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
  }

  const medianA = medianOf(samplesA)
  const medianB = medianOf(samplesB)

  return { ratio: medianA / medianB, medianA, medianB }
}

function verdict(measured: number) {
  if (Math.abs(measured - 1) + 1 < NOISE_FLOOR) return 'too close to call'
  return measured > 1 ? 'first form is dearer' : 'second form is dearer'
}

describe('probe 6 — waitFor(expect(getByRole)) vs await findByRole', () => {
  it('measures whether prefer-find-by is a performance rule or a readability rule', async () => {
    const ratios: { name: TierName; value: number }[] = []

    for (const name of TIER_NAMES) {
      await withTier(name, async (container) => {
        const scope = within(container)
        const target = TARGETS[name]

        const result = await ratioAsync(
          async () => {
            await waitFor(() => {
              expect(scope.getByRole(target.role, { name: target.name })).toBeInTheDocument()
            })
          },
          async () => {
            await scope.findByRole(target.role, { name: target.name })
          },
        )

        ratios.push({ name, value: result.ratio })
        console.log(
          `[probe6 ${name}] waitFor/findBy=${formatRatio(result.ratio)} (${result.medianA.toFixed(3)}ms vs ${result.medianB.toFixed(3)}ms) — ${verdict(result.ratio)}`,
        )
      })
    }

    const spread = Math.max(...ratios.map((entry) => entry.value))

    expect(
      spread,
      'waitFor came out more than 2x the cost of findBy on an already-satisfied condition, which would make prefer-find-by a performance rule rather than a readability one — COSTS.md says the opposite',
    ).toBeLessThan(2)
  }, 60000)
})

describe('probe 7 — the polling floor, and what it is actually made of', () => {
  it('shows an already-true condition costs no poll interval, because waitFor checks once before it starts polling', async () => {
    await withTier('medium', async (container) => {
      const scope = within(container)
      const target = TARGETS.medium

      const alreadyTrue = await measureAsync(async () => {
        await waitFor(() => {
          expect(scope.getByRole(target.role, { name: target.name })).toBeInTheDocument()
        })
      })

      console.log(
        `[probe7] waitFor on an already-true condition: median ${alreadyTrue.median.toFixed(3)}ms — RTL's default interval is ${RTL_DEFAULT_INTERVAL}ms, so this is not paying one`,
      )

      expect(
        alreadyTrue.median,
        'a waitFor on an already-true condition now costs a full poll interval — wait-for.js no longer calls checkCallback() before setInterval, and the COSTS.md claim that already-true waits are free is dead',
      ).toBeLessThan(RTL_DEFAULT_INTERVAL / 2)
    })
  }, 60000)

  it('locates the whole already-true floor in one forced macrotask, not in the condition or the poll interval', async () => {
    const bareWaitFor = await measureAsync(async () => {
      await waitFor(() => {
        expect(1).toBe(1)
      })
    })

    const oneMacrotask = await measureAsync(
      async () =>
        new Promise((resolve) => {
          setTimeout(resolve, 0)
        }),
    )

    const conditionOnly = measure(() => {
      expect(1).toBe(1)
    }, RUNS)

    const unexplained = bareWaitFor.median / oneMacrotask.median

    console.log(
      `[probe7] bare waitFor on a trivially-true condition = ${bareWaitFor.median.toFixed(3)}ms; one setTimeout(0) = ${oneMacrotask.median.toFixed(3)}ms; the condition itself = ${conditionOnly.median.toFixed(4)}ms. waitFor/macrotask = ${formatRatio(unexplained)}`,
    )
    console.log(
      `[probe7] mechanism: @testing-library/react configures asyncWrapper (dist/pure.js) to await a setTimeout(0) after the condition resolves, to drain the microtask queue before restoring the act environment. Every waitFor and every findBy pays it once.`,
    )

    expect(
      unexplained,
      "the waitFor floor is no longer accounted for by a single macrotask — RTL's asyncWrapper has changed and COSTS.md's explanation of the floor is stale",
    ).toBeLessThan(2)

    expect(
      conditionOnly.median,
      'the trivially-true condition is not negligible against the floor, so this probe cannot attribute the floor to the macrotask',
    ).toBeLessThan(oneMacrotask.median / 10)
  }, 60000)

  it('shows a condition that is not yet true pays the configured interval, by varying the interval and watching the floor track it', async () => {
    await withTier('medium', async (container) => {
      const scope = within(container)

      const floorAt = async (interval: number) => {
        const measurement = await measureAsync(
          async () => {
            const marker = document.createElement('span')
            marker.textContent = 'lab-late-marker'

            setTimeout(() => {
              container.appendChild(marker)
            }, interval * 1.5)

            await waitFor(
              () => {
                expect(scope.getByText('lab-late-marker')).toBeInTheDocument()
              },
              { interval, timeout: 5000 },
            )

            marker.remove()
          },
          { warmup: 1, runs: 5 },
        )
        return measurement.median
      }

      const slow = await floorAt(120)
      const fast = await floorAt(20)
      const trackingRatio = slow / fast

      console.log(
        `[probe7] not-yet-true condition: interval=120ms → ${slow.toFixed(1)}ms, interval=20ms → ${fast.toFixed(1)}ms — floor tracks the interval at ${formatRatio(trackingRatio)}`,
      )

      expect(
        trackingRatio,
        'the resolution floor did not track the interval passed to waitFor — either the MutationObserver is resolving these waits (making the interval irrelevant) or waitFor no longer honours the option, and probe 7 measures nothing',
      ).toBeGreaterThan(2)
    })
  }, 60000)
})

describe('probe 8 — cost inside the waitFor loop', () => {
  it('measures a role query paid per poll against a cheap predicate, at every tier', async () => {
    const perTier: { name: TierName; value: number; matches: number }[] = []

    for (const name of TIER_NAMES) {
      await withTier(name, async (container) => {
        const scope = within(container)
        let counter = 0

        const result = await ratioAsync(
          async () => {
            await waitFor(() => {
              expect(scope.getAllByRole('heading').length).toBeGreaterThan(0)
            })
          },
          async () => {
            await waitFor(() => {
              counter += 1
              expect(counter).toBeGreaterThan(0)
            })
          },
        )

        const matches = scope.getAllByRole('heading').length
        perTier.push({ name, value: result.ratio, matches })

        console.log(
          `[probe8 ${name}] role-query-in-loop/cheap-predicate=${formatRatio(result.ratio)} (${result.medianA.toFixed(3)}ms vs ${result.medianB.toFixed(3)}ms, ${matches} matches) — ${verdict(result.ratio)}`,
        )
      })
    }

    const dearest = perTier.reduce((worst, entry) => (entry.value > worst.value ? entry : worst))
    const cheapest = perTier.reduce((best, entry) => (entry.value < best.value ? entry : best))

    console.log(
      `[probe8] dearest tier ${dearest.name} at ${formatRatio(dearest.value)} (${dearest.matches} matches); cheapest ${cheapest.name} at ${formatRatio(cheapest.value)} (${cheapest.matches} matches)`,
    )

    expect(
      dearest.value,
      'a role query inside the waitFor callback came out cheaper than a bare counter increment, which cannot be right',
    ).toBeGreaterThan(1)
  }, 60000)

  it("cross-checks against probe 2: subtracting the waitFor floor leaves exactly probe 2's single-query cost, so a satisfied wait pays the query once", async () => {
    await withTier('huge', async (container) => {
      const scope = within(container)
      let counter = 0

      const singleQuery = measure(() => {
        scope.getAllByRole('heading')
      }, RUNS)

      // One waitFor pays a fixed, scheduler-dependent macrotask (probe 7). Under
      // a loaded worker pool that floor's *variance* alone exceeds one query's
      // cost, so a one-query-vs-counter difference cannot resolve it. Running the
      // query IN_LOOP_QUERIES times against the same single floor raises the
      // signal above that noise; the floor cancels in the subtraction either way.
      const IN_LOOP_QUERIES = 40

      const interleaved = await ratioAsync(
        async () => {
          await waitFor(() => {
            for (let index = 0; index < IN_LOOP_QUERIES; index += 1) {
              scope.getAllByRole('heading')
            }
            expect(counter).toBeGreaterThanOrEqual(0)
          })
        },
        async () => {
          await waitFor(() => {
            counter += 1
            expect(counter).toBeGreaterThan(0)
          })
        },
      )

      const withQueries = { median: interleaved.medianA }
      const withCheapPredicate = { median: interleaved.medianB }

      const attributableToQueries = withQueries.median - withCheapPredicate.median
      const impliedQueryCost = attributableToQueries / IN_LOOP_QUERIES
      const agreement = impliedQueryCost / singleQuery.median

      console.log(
        `[probe8 cross-check] waitFor running ${IN_LOOP_QUERIES}x the query = ${withQueries.median.toFixed(3)}ms; waitFor with a counter = ${withCheapPredicate.median.toFixed(3)}ms; difference = ${attributableToQueries.toFixed(3)}ms → ${impliedQueryCost.toFixed(3)}ms per query. Probe 2 measures the same query at ${singleQuery.median.toFixed(3)}ms — agreement ${formatRatio(agreement)}.`,
      )
      console.log(
        `[probe8 cross-check] note the trap this avoids: waitFor-with-one-query divided by the query cost is ~5x on this tier, and reading THAT as a poll count is wrong. It is probe 7's fixed macrotask floor dividing into the query, not repeated polling.`,
      )

      expect(
        agreement,
        "the in-loop per-query cost came out far above probe 2's single-query cost — either waitFor is running its callback more than once on an already-true condition, or the two probes disagree about what a role query costs and one of them is broken",
      ).toBeLessThan(2)

      expect(
        agreement,
        "the in-loop per-query cost came out far below probe 2's single-query cost, so the two probes disagree about what a single role query costs on this tier",
      ).toBeGreaterThan(0.5)
    })
  }, 60000)
})

describe('probe 9 — userEvent.setup() default delay', () => {
  it('measures typing with the default delay against delay: null, and states the per-suite calculation', async () => {
    const TYPED = 'Ada Lovelace'

    await withTier('medium', async (container) => {
      const field = within(container).getAllByRole('textbox')[0]

      const withDelay = userEvent.setup()
      const withoutDelay = userEvent.setup({ delay: null })

      const result = await ratioAsync(
        async () => {
          await withDelay.clear(field)
          await withDelay.type(field, TYPED)
        },
        async () => {
          await withoutDelay.clear(field)
          await withoutDelay.type(field, TYPED)
        },
      )

      const perCharDefault = result.medianA / TYPED.length
      const perCharNull = result.medianB / TYPED.length

      console.log(
        `[probe9] typing ${TYPED.length} chars: default delay ${result.medianA.toFixed(1)}ms vs delay:null ${result.medianB.toFixed(1)}ms — ${formatRatio(result.ratio)} (${perCharDefault.toFixed(1)}ms vs ${perCharNull.toFixed(1)}ms per character)`,
      )

      const REPO_TYPE_CALLS = 17
      const REPO_TYPED_CHARS = 133
      const projectedDefault = perCharDefault * REPO_TYPED_CHARS
      const projectedNull = perCharNull * REPO_TYPED_CHARS

      console.log(
        `[probe9 CALCULATION, not a measurement] this repo has ${REPO_TYPE_CALLS} user.type() call sites typing ${REPO_TYPED_CHARS} characters total (grep'd from src/**/*.spec.tsx). At the measured per-character cost that is ~${projectedDefault.toFixed(0)}ms with the default delay vs ~${projectedNull.toFixed(0)}ms with delay:null — a saving of ~${(projectedDefault - projectedNull).toFixed(0)}ms across the whole suite`,
      )

      expect(
        result.ratio,
        "userEvent's default inter-character delay came out no dearer than delay:null, so either the delay is no longer applied or the measurement is not reaching it",
      ).toBeGreaterThan(NOISE_FLOOR)
    })
  }, 60000)
})

describe('probe 10 — one MSW round-trip', () => {
  it('reports the cost of a real handler resolution as a multiple of the cheapest measured query', async () => {
    await withTier('small', async (container) => {
      const scope = within(container)

      const cheapestQuery = measure(() => {
        scope.getAllByRole('heading')
      }, RUNS)

      const roundTrip = await measureAsync(async () => {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/employees?page=1&perPage=10`,
        )
        await response.json()
      })

      const multiple = roundTrip.median / cheapestQuery.median

      console.log(
        `[probe10] one MSW round-trip = ${roundTrip.median.toFixed(3)}ms = ${multiple.toFixed(0)}x the cheapest measured role query (${cheapestQuery.median.toFixed(3)}ms) on this machine`,
      )

      expect(
        multiple,
        'an MSW round-trip came out cheaper than a single role query, which would make probe 10 pointless and probably means the request never reached the handler',
      ).toBeGreaterThan(1)
    })
  }, 60000)

  it('tests tier-independence over counterbalanced rounds, because two sequential blocks measure warmup as well as tier', async () => {
    const TIERS = ['small', 'huge'] as const

    const blockUnder = async (name: (typeof TIERS)[number]) => {
      let median = 0
      await withTier(name, async () => {
        median = (
          await measureAsync(async () => {
            const response = await fetch(
              `${import.meta.env.VITE_API_BASE_URL}/employees?page=1&perPage=10`,
            )
            await response.json()
          })
        ).median
      })
      return median
    }

    // Discarded. The first fetch block in a worker costs ~1.9x every later one
    // and measureAsync's two warmup iterations do not absorb it: measured
    // 0.307ms for the first block against 0.163ms for every block after it,
    // with the same inflation on whichever tier happened to go first and none
    // on a block with no tier mounted at all. The single-block form of this
    // probe reported that warmup as tier dependence, at 1.8-2.5x.
    //
    // Removing this line does NOT redden the test — checked. The median across
    // rounds below already absorbs one cold block, which is what a median is
    // for. It is kept so that under a loaded worker pool, where more than one
    // early block can be cold, no cold block reaches the recorded set at all.
    await blockUnder('small')

    // Counterbalanced: the tier that leads alternates, so any residual
    // within-round drift lands on both tiers rather than always on the one
    // measured first. Every other probe in this file gets that for free from
    // ratioAsync, which interleaves its two forms inside one loop; this is the
    // one comparison that cannot, because its two forms need different trees
    // mounted, and it is the one that reported the drift as a finding.
    const ORDERS = [TIERS, [...TIERS].reverse(), TIERS] as const

    const rounds: Record<string, number>[] = []
    for (const order of ORDERS) {
      const measured: Record<string, number> = {}
      for (const name of order) {
        measured[name] = await blockUnder(name)
      }
      rounds.push(measured)
    }

    const medianAcrossRounds = (name: string) => {
      const values = rounds.map((entry) => entry[name]).sort((left, right) => left - right)
      return values[Math.floor(values.length / 2)]
    }

    const small = medianAcrossRounds('small')
    const huge = medianAcrossRounds('huge')
    const spread = Math.max(small, huge) / Math.min(small, huge)
    const tierIndependent = spread < NOISE_FLOOR

    console.log(
      `[probe10] round-trip per round (small/huge): ${rounds
        .map((entry) => `${entry.small.toFixed(3)}/${entry.huge.toFixed(3)}`)
        .join(', ')} — medians small=${small.toFixed(3)}ms vs huge=${huge.toFixed(3)}ms, spread ${formatRatio(spread)} against a ${NOISE_FLOOR}x noise floor, so tier-independence is ${tierIndependent ? 'shown' : 'NOT shown — the spread sits at or above the noise floor, and COSTS.md must say so rather than claiming independence'}`,
    )

    expect(
      spread,
      'the MSW round-trip cost differs across tiers by substantially more than the noise floor even with the tier order counterbalanced and the cold first block discarded, so it is genuinely tier-dependent and COSTS.md must report it per tier rather than as one floor',
    ).toBeLessThan(1.5)
  }, 60000)
})

describe('probe 8 sanity — the tiers still differ in heading count', () => {
  it('confirms the in-loop query cost is being paid against different match counts', async () => {
    const matches: Record<string, number> = {}

    for (const name of TIER_NAMES) {
      await withTier(name, async (container) => {
        matches[name] = within(container).getAllByRole('heading').length
        expect(profileOf(container).nodes).toBeGreaterThan(0)
      })
    }

    console.log(`[probe8 sanity] heading matches per tier: ${JSON.stringify(matches)}`)

    expect(
      Math.max(...Object.values(matches)) / Math.min(...Object.values(matches)),
      'probe 8 assumes the tiers differ in how many headings the in-loop query matches; they no longer do, so its cross-tier comparison means nothing',
    ).toBeGreaterThan(5)
  }, 60000)
})
