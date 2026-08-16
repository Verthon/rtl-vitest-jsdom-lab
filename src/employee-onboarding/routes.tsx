import type { RouteObject } from 'react-router'
import { PageLoader } from '@/components/PageLoader'

export const onboardingRoutes: RouteObject[] = [
  {
    path: '/onboarding',
    HydrateFallback: PageLoader,
    lazy: async () => ({
      Component: (await import('./OnboardingRedirect')).OnboardingRedirect,
    }),
  },
  {
    path: '/onboarding/:step',
    HydrateFallback: PageLoader,
    lazy: async () => ({ Component: (await import('./OnboardingPage')).OnboardingPage }),
  },
]
