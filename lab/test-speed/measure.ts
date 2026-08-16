export type MeasureOptions = {
  warmup?: number
  runs?: number
}

export type Measurement = {
  median: number
  samples: number[]
}

export type RatioResult = {
  ratio: number
  a: Measurement
  b: Measurement
}

const DEFAULT_WARMUP = 5
const DEFAULT_RUNS = 25

function median(samples: number[]) {
  const sorted = [...samples].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

export function measure(fn: () => void, options: MeasureOptions = {}): Measurement {
  const { warmup = DEFAULT_WARMUP, runs = DEFAULT_RUNS } = options

  for (let index = 0; index < warmup; index += 1) {
    fn()
  }

  const samples: number[] = []
  for (let index = 0; index < runs; index += 1) {
    const start = performance.now()
    fn()
    samples.push(performance.now() - start)
  }

  return { median: median(samples), samples }
}

export function ratio(a: () => void, b: () => void, options: MeasureOptions = {}): RatioResult {
  const { warmup = DEFAULT_WARMUP, runs = DEFAULT_RUNS } = options

  for (let index = 0; index < warmup; index += 1) {
    a()
    b()
  }

  const samplesA: number[] = []
  const samplesB: number[] = []

  for (let index = 0; index < runs; index += 1) {
    const startA = performance.now()
    a()
    samplesA.push(performance.now() - startA)

    const startB = performance.now()
    b()
    samplesB.push(performance.now() - startB)
  }

  const measurementA = { median: median(samplesA), samples: samplesA }
  const measurementB = { median: median(samplesB), samples: samplesB }

  return {
    ratio: measurementA.median / measurementB.median,
    a: measurementA,
    b: measurementB,
  }
}

export function formatRatio(value: number) {
  return `${value.toFixed(2)}x`
}
