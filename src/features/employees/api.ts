import { queryOptions } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import type { Employee } from './types'

export const employeesQueryOptions = queryOptions({
  queryKey: ['employees'] as const,
  queryFn: () => apiGet<Employee[]>('employees'),
})
