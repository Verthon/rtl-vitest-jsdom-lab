import { queryOptions, keepPreviousData } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import type { Employee, Paginated } from './types'

export const PER_PAGE = 10

export function employeesQueryOptions(page: number) {
  return queryOptions({
    queryKey: ['employees', page] as const,
    queryFn: () => apiGet<Paginated<Employee>>('employees', { page, perPage: PER_PAGE }),
    placeholderData: keepPreviousData,
  })
}
