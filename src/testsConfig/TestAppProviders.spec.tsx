import { renderHook } from '@testing-library/react'
import { useLocation } from 'react-router'
import { TestAppProviders } from './TestAppProviders'

describe('TestAppProviders', () => {
  it('gives hooks access to router context', () => {
    const { result } = renderHook(() => useLocation(), {
      wrapper: TestAppProviders,
    })

    expect(result.current.pathname).toBe('/')
  })

  it('forwards routerProps to MemoryRouter', () => {
    const { result } = renderHook(() => useLocation(), {
      wrapper: ({ children }) => (
        <TestAppProviders routerProps={{ initialEntries: ['/about'] }}>
          {children}
        </TestAppProviders>
      ),
    })

    expect(result.current.pathname).toBe('/about')
  })
})
