import { renderHook, waitFor } from '@testing-library/react'
import { useLocation } from 'react-router'
import { useQuery } from '@tanstack/react-query'
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

  it('gives hooks access to a query client', async () => {
    const { result } = renderHook(
      () => useQuery({ queryKey: ['greeting'], queryFn: () => Promise.resolve('hello') }),
      { wrapper: TestAppProviders },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe('hello')
  })
})
