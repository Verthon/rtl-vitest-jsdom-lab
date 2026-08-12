import type { RouteObject } from 'react-router'
import { PageLoader } from '@/components/PageLoader'

export const homeRoutes: RouteObject[] = [
  {
    path: '/',
    HydrateFallback: PageLoader,
    lazy: async () => ({ Component: (await import('./HomePage')).HomePage }),
  },
]
