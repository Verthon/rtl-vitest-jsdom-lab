import type { HttpHandler } from 'msw'
import { createExampleHandlerMocks } from './example.handlers'
import { createEmployeesHandlerMocks } from '@/features/employees/mocks'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

export const handlers: HttpHandler[] = [
  createExampleHandlerMocks(baseUrl),
  createEmployeesHandlerMocks(baseUrl),
].flat()
