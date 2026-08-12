import ky from 'ky'
import { env } from './env'

export const apiClient = ky.create({
  prefix: env.VITE_API_BASE_URL,
})

type SearchParams = Record<string, string | number | boolean | undefined>

export function apiGet<T>(url: string, searchParams?: SearchParams): Promise<T> {
  return apiClient.get(url, { searchParams }).json<T>()
}

export function apiPost<T>(url: string, json?: unknown): Promise<T> {
  return apiClient.post(url, { json }).json<T>()
}

export function apiPatch<T>(url: string, json?: unknown): Promise<T> {
  return apiClient.patch(url, { json }).json<T>()
}

export function apiDelete<T>(url: string): Promise<T> {
  return apiClient.delete(url).json<T>()
}
