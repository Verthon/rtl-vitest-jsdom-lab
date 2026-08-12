import { queryOptions, keepPreviousData } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import type { Employee, Paginated } from './types'

export const PER_PAGE = 10

export function employeesQueryOptions(page: number, q?: string) {
  return queryOptions({
    queryKey: ['employees', page, q] as const,
    queryFn: () => apiGet<Paginated<Employee>>('employees', { page, perPage: PER_PAGE, q }),
    placeholderData: keepPreviousData,
  })
}
