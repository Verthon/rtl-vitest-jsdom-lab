import { useState, type ComponentProps, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { createTestQueryClient } from './queryClient'

type TestAppProvidersProps = {
  children: ReactNode
  routerProps?: ComponentProps<typeof MemoryRouter>
  queryClient?: QueryClient
}

export function TestAppProviders({ children, routerProps, queryClient }: TestAppProvidersProps) {
  const [client] = useState(() => queryClient ?? createTestQueryClient())

  return (
    <QueryClientProvider client={client}>
      <MemoryRouter {...routerProps}>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}
