import { afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { resetViewport } from './viewport'

resetViewport()

afterEach(() => {
  resetViewport()
})
