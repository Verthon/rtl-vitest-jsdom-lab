import type { RouteObject } from 'react-router'
import { PageLoader } from '@/components/PageLoader'

export const employeesRoutes: RouteObject[] = [
  {
    path: '/employees',
    HydrateFallback: PageLoader,
    lazy: async () => ({ Component: (await import('./EmployeesPage')).EmployeesPage }),
  },
]
