import { queryOptions } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api-client'
import type { CreateEmployeeRequest, CreateEmployeeResponse, Manager, OnboardingOptions } from './types'

export function onboardingOptionsQueryOptions() {
  return queryOptions({
    queryKey: ['onboarding', 'options'] as const,
    queryFn: () => apiGet<OnboardingOptions>('onboarding/options'),
    staleTime: Infinity,
  })
}

export function onboardingManagersQueryOptions(q: string) {
  return queryOptions({
    queryKey: ['onboarding', 'managers', q] as const,
    queryFn: () => apiGet<Manager[]>('onboarding/managers', { q }),
    enabled: q.length > 0,
  })
}

export function submitOnboarding(request: CreateEmployeeRequest) {
  return apiPost<CreateEmployeeResponse>('onboarding', request)
}
