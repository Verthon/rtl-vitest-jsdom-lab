import { useState, type ComponentProps, type ReactNode } from 'react'
import { MemoryRouter, createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { createTestQueryClient } from './queryClient'

type TestAppProvidersProps =
  | {
      children: ReactNode
      routerProps?: ComponentProps<typeof MemoryRouter>
      queryClient?: QueryClient
      routes?: never
    }
  | {
      children?: never
      routes: RouteObject[]
      routerProps?: ComponentProps<typeof MemoryRouter>
      queryClient?: QueryClient
    }

export function TestAppProviders(props: TestAppProvidersProps) {
  const { routerProps, queryClient } = props
  const [client] = useState(() => queryClient ?? createTestQueryClient())

  return (
    <QueryClientProvider client={client}>
      {props.routes ? (
        <RouterProviderWithRoutes routes={props.routes} routerProps={routerProps} />
      ) : (
        <MemoryRouter {...routerProps}>{props.children}</MemoryRouter>
      )}
    </QueryClientProvider>
  )
}

function RouterProviderWithRoutes({
  routes,
  routerProps,
}: {
  routes: RouteObject[]
  routerProps?: ComponentProps<typeof MemoryRouter>
}) {
  const [router] = useState(() =>
    createMemoryRouter(routes, {
      initialEntries: routerProps?.initialEntries,
      initialIndex: routerProps?.initialIndex,
    }),
  )

  return <RouterProvider router={router} />
}
