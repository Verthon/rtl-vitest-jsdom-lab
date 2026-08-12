import { http, HttpResponse, type HttpHandler } from 'msw'
import type { Employee } from './types'

export const mockEmployees: Employee[] = [
  { id: '1', name: 'Grace Hopper', role: 'Engineering Manager', department: 'Platform', status: 'active' },
  { id: '2', name: 'Ada Lovelace', role: 'Software Engineer', department: 'Platform', status: 'active' },
  { id: '3', name: 'Alan Turing', role: 'Research Scientist', department: 'R&D', status: 'on_leave' },
  { id: '4', name: 'Katherine Johnson', role: 'Data Analyst', department: 'Analytics', status: 'active' },
  { id: '5', name: 'Margaret Hamilton', role: 'Principal Engineer', department: 'Platform', status: 'active' },
  { id: '6', name: 'Barbara Liskov', role: 'Software Architect', department: 'Platform', status: 'active' },
  { id: '7', name: 'Radia Perlman', role: 'Network Engineer', department: 'Infrastructure', status: 'active' },
  { id: '8', name: 'Tim Berners-Lee', role: 'Software Engineer', department: 'Platform', status: 'terminated' },
  { id: '9', name: 'Donald Knuth', role: 'Research Scientist', department: 'R&D', status: 'active' },
  { id: '10', name: 'Edsger Dijkstra', role: 'Research Scientist', department: 'R&D', status: 'not_started' },
  { id: '11', name: 'John Backus', role: 'Software Engineer', department: 'Platform', status: 'active' },
  { id: '12', name: 'Frances Allen', role: 'Compiler Engineer', department: 'Platform', status: 'active' },
  { id: '13', name: 'Vinton Cerf', role: 'Network Architect', department: 'Infrastructure', status: 'active' },
  { id: '14', name: 'Whitfield Diffie', role: 'Security Engineer', department: 'Security', status: 'active' },
  { id: '15', name: 'Shafi Goldwasser', role: 'Security Researcher', department: 'Security', status: 'on_leave' },
  { id: '16', name: 'Leslie Lamport', role: 'Distributed Systems Engineer', department: 'Infrastructure', status: 'active' },
  { id: '17', name: 'Ken Thompson', role: 'Systems Engineer', department: 'Infrastructure', status: 'not_started' },
  { id: '18', name: 'Dennis Ritchie', role: 'Systems Engineer', department: 'Infrastructure', status: 'terminated' },
  { id: '19', name: 'Brian Kernighan', role: 'Technical Writer', department: 'Documentation', status: 'active' },
  { id: '20', name: 'Anita Borg', role: 'Engineering Director', department: 'Platform', status: 'active' },
  { id: '21', name: 'Steve Wozniak', role: 'Hardware Engineer', department: 'Hardware', status: 'active' },
  { id: '22', name: 'Hedy Lamarr', role: 'Research Scientist', department: 'R&D', status: 'active' },
  { id: '23', name: 'Mary Allen Wilkes', role: 'Software Engineer', department: 'Platform', status: 'on_leave' },
  { id: '24', name: 'Jean Bartik', role: 'Software Engineer', department: 'Platform', status: 'active' },
  { id: '25', name: 'Betty Holberton', role: 'Software Engineer', department: 'Platform', status: 'active' },
  { id: '26', name: 'Adele Goldberg', role: 'Software Engineer', department: 'Platform', status: 'active' },
  { id: '27', name: 'Lynn Conway', role: 'Hardware Engineer', department: 'Hardware', status: 'active' },
  { id: '28', name: 'Erna Schneider Hoover', role: 'Systems Engineer', department: 'Infrastructure', status: 'not_started' },
  { id: '29', name: 'Evelyn Berezin', role: 'Hardware Engineer', department: 'Hardware', status: 'terminated' },
  { id: '30', name: 'Jean Sammet', role: 'Compiler Engineer', department: 'Platform', status: 'active' },
  { id: '31', name: 'Marissa Mayer', role: 'Product Manager', department: 'Product', status: 'active' },
  { id: '32', name: 'Sheryl Sandberg', role: 'Operations Director', department: 'Operations', status: 'active' },
  { id: '33', name: 'Susan Wojcicki', role: 'Product Manager', department: 'Product', status: 'active' },
  { id: '34', name: 'Ginni Rometty', role: 'Engineering Director', department: 'Platform', status: 'on_leave' },
  { id: '35', name: 'Safra Catz', role: 'Finance Director', department: 'Finance', status: 'active' },
  { id: '36', name: 'Reshma Saujani', role: 'Program Manager', department: 'Product', status: 'active' },
  { id: '37', name: 'Fei-Fei Li', role: 'Research Scientist', department: 'R&D', status: 'active' },
  { id: '38', name: 'Andrew Ng', role: 'Research Scientist', department: 'R&D', status: 'not_started' },
  { id: '39', name: 'Yann LeCun', role: 'Research Scientist', department: 'R&D', status: 'active' },
  { id: '40', name: 'Geoffrey Hinton', role: 'Research Scientist', department: 'R&D', status: 'active' },
  { id: '41', name: 'Yoshua Bengio', role: 'Research Scientist', department: 'R&D', status: 'terminated' },
  { id: '42', name: 'Cynthia Breazeal', role: 'Robotics Engineer', department: 'Hardware', status: 'active' },
  { id: '43', name: 'Rodney Brooks', role: 'Robotics Engineer', department: 'Hardware', status: 'active' },
  { id: '44', name: 'Daphne Koller', role: 'Research Scientist', department: 'R&D', status: 'on_leave' },
  { id: '45', name: 'Sebastian Thrun', role: 'Research Scientist', department: 'R&D', status: 'active' },
  { id: '46', name: 'Peter Norvig', role: 'Research Director', department: 'R&D', status: 'active' },
  { id: '47', name: 'Ada Yonath', role: 'Research Scientist', department: 'R&D', status: 'not_started' },
]

export function createEmployeesHandlerMocks(baseUrl: string): HttpHandler[] {
  return [
    http.get(`${baseUrl}/employees`, ({ request }) => {
      const url = new URL(request.url)
      const page = Number(url.searchParams.get('page') ?? 1)
      const perPage = Number(url.searchParams.get('perPage') ?? 10)
      const start = (page - 1) * perPage
      return HttpResponse.json({
        data: mockEmployees.slice(start, start + perPage),
        page,
        perPage,
        total: mockEmployees.length,
      })
    }),
  ]
}
