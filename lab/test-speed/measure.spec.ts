import { measure, ratio, formatRatio } from './measure'

function burn(iterations: number) {
  let total = 0
  for (let index = 0; index < iterations; index += 1) {
    total += Math.sqrt(index % 97)
  }
  return total
}

const BASE_ITERATIONS = 20_000

function label(resolved: boolean) {
  return resolved ? 'resolved' : 'NOT resolved'
}

function work(multiplier: number) {
  return () => {
    burn(Math.round(BASE_ITERATIONS * multiplier))
  }
}

describe('measure', () => {
  it('returns the median of the sampled runs, not the mean', () => {
    const samples = [1, 1, 1, 1, 100]
    let index = 0
    const measurement = measure(
      () => {
        const target = samples[index % samples.length]
        index += 1
        const start = performance.now()
        while (performance.now() - start < target / 10) {
          /* spin */
        }
      },
      { warmup: 0, runs: samples.length },
    )

    const mean = measurement.samples.reduce((sum, value) => sum + value, 0) / samples.length
    expect(measurement.median).toBeLessThan(mean)
    expect(measurement.samples).toHaveLength(samples.length)
  })

  it('discards the warmup iterations from the reported samples', () => {
    let calls = 0
    const measurement = measure(
      () => {
        calls += 1
      },
      { warmup: 4, runs: 6 },
    )

    expect(calls).toBe(10)
    expect(measurement.samples).toHaveLength(6)
  })

  it('detects a known large difference in the right direction and magnitude', () => {
    const result = ratio(work(10), work(1), { warmup: 5, runs: 25 })

    console.log(`[measure] 10x synthetic work measured at ${formatRatio(result.ratio)}`)
    expect(result.ratio).toBeGreaterThan(4)
    expect(result.ratio).toBeLessThan(25)
  })

  it('reports a ratio near 1 for two identical workloads', () => {
    const result = ratio(work(1), work(1), { warmup: 5, runs: 25 })

    console.log(`[measure] identical workloads measured at ${formatRatio(result.ratio)}`)
    expect(result.ratio).toBeGreaterThan(0.5)
    expect(result.ratio).toBeLessThan(2)
  })

  it('establishes R, the smallest ratio this helper can resolve on this machine', () => {
    const candidates = [1.1, 1.25, 1.5, 2, 3, 5]
    const TOLERANCE = 0.35
    const ATTEMPTS = 3

    const resolved = candidates.map((k) => {
      const measurements = Array.from(
        { length: ATTEMPTS },
        () => ratio(work(k), work(1), { warmup: 5, runs: 25 }).ratio,
      )
      const withinTolerance = measurements.every(
        (measured) => Math.abs(measured - k) / k <= TOLERANCE,
      )
      return { k, measurements, withinTolerance }
    })

    for (const { k, measurements, withinTolerance } of resolved) {
      const formatted = measurements.map(formatRatio).join(', ')
      console.log(`[measure] k=${k}: ${formatted} — ${label(withinTolerance)}`)
    }

    const firstResolved = resolved.find((entry) => entry.withinTolerance)
    expect(
      firstResolved,
      'measure.ts resolved none of the synthetic ratios up to 5x — the helper is broken, not the machine',
    ).toBeDefined()

    const R = firstResolved!.k
    console.log(`[measure] R (noise floor) = ${R}x on this machine`)

    expect(R).toBeLessThanOrEqual(3)
  })

  it('interleaves the two forms rather than batching them', () => {
    const order: string[] = []

    ratio(
      () => order.push('a'),
      () => order.push('b'),
      { warmup: 0, runs: 3 },
    )

    expect(order).toStrictEqual(['a', 'b', 'a', 'b', 'a', 'b'])
  })
})
