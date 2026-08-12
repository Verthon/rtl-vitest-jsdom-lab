import { http, HttpResponse, type HttpHandler } from 'msw'
import type { Employee } from './types'

export const mockEmployees: Employee[] = [
  { id: '1', name: 'Ada Lovelace', role: 'Engineer', department: 'Platform', status: 'active' },
  { id: '2', name: 'Grace Hopper', role: 'Engineering Manager', department: 'Platform', status: 'active' },
  { id: '3', name: 'Alan Turing', role: 'Researcher', department: 'R&D', status: 'on_leave' },
]

export function createEmployeesHandlerMocks(baseUrl: string): HttpHandler[] {
  return [
    http.get(`${baseUrl}/employees`, () => HttpResponse.json(mockEmployees)),
  ]
}
