import { createBrowserRouter } from 'react-router'
import { PageLoader } from '@/components/PageLoader'

export const router = createBrowserRouter([
  {
    path: '/',
    HydrateFallback: PageLoader,
    lazy: () => import('./routes/home'),
  },
])
