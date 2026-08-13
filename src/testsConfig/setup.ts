import { afterAll, afterEach, beforeAll } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { resetViewport } from './viewport'
import { restoreRealTimers } from './fakeTimers'
import { server } from '@/mocks/server'

resetViewport()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  resetViewport()
  restoreRealTimers()
  server.resetHandlers()
})

afterAll(() => server.close())
