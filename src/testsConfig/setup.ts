import { afterAll, afterEach, beforeAll } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { resetViewport } from './viewport'
import { server } from '@/mocks/server'

resetViewport()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  resetViewport()
  server.resetHandlers()
})

afterAll(() => server.close())
