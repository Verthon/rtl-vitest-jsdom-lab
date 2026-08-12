import type { HttpHandler } from 'msw'
import { createExampleHandlerMocks } from './example.handlers'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

export const handlers: HttpHandler[] = [createExampleHandlerMocks(baseUrl)].flat()
