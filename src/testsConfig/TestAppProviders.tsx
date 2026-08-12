import type { ComponentProps, ReactNode } from 'react'
import { MemoryRouter } from 'react-router'

type TestAppProvidersProps = {
  children: ReactNode
  routerProps?: ComponentProps<typeof MemoryRouter>
}

export function TestAppProviders({ children, routerProps }: TestAppProvidersProps) {
  return <MemoryRouter {...routerProps}>{children}</MemoryRouter>
}
