import type { HttpHandler } from 'msw'
import { createExampleHandlerMocks } from './example.handlers'
import { createEmployeesHandlerMocks } from '@/employee-directory/mocks'
import { createOnboardingHandlerMocks } from '@/employee-onboarding/mocks'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

export const handlers: HttpHandler[] = [
  createExampleHandlerMocks(baseUrl),
  createEmployeesHandlerMocks(baseUrl),
  createOnboardingHandlerMocks(baseUrl),
].flat()
