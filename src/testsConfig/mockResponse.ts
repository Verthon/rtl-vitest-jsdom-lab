import { delay as mswDelay, http, HttpResponse, type HttpHandler } from 'msw'
import { env } from '@/lib/env'

type MockResponseOptions = {
  status?: number
  body?: unknown
  delay?: number
}

export function mockResponse(path: string, options: MockResponseOptions = {}): HttpHandler {
  const { status = 200, body, delay } = options

  return http.get(`${env.VITE_API_BASE_URL}/${path}`, async () => {
    if (delay !== undefined) await mswDelay(delay)

    return body === undefined
      ? new HttpResponse(null, { status })
      : HttpResponse.json(body, { status })
  })
}

export function mockNetworkError(path: string): HttpHandler {
  return http.get(`${env.VITE_API_BASE_URL}/${path}`, () => HttpResponse.error())
}
