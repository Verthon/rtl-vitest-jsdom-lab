import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { resetViewport } from './viewport'
import { restoreRealTimers } from './fakeTimers'
import { server } from '@/mocks/server'

resetViewport()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

beforeEach(() => {
  Object.assign(globalThis, { jest: { advanceTimersByTime: vi.advanceTimersByTime } })
})

afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(globalThis, 'jest')
  resetViewport()
  restoreRealTimers()
  server.resetHandlers()
})

afterAll(() => server.close())
