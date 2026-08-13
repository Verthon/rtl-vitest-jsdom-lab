import { inspect } from 'node:util'

export async function failureOf(assertion: () => void | Promise<void>): Promise<string | null> {
  try {
    await assertion()
    return null
  } catch (thrown) {
    const error = thrown as Error & { actual?: unknown; expected?: unknown }

    return [
      error.message,
      'actual' in error ? inspect(error.actual, { depth: 6 }) : '',
      'expected' in error ? inspect(error.expected, { depth: 6 }) : '',
    ].join('\n')
  }
}
