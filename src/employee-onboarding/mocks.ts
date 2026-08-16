import { http, HttpResponse, type HttpHandler } from 'msw'
import type {
  AccessGroup,
  AccessPermission,
  CreateEmployeeRequest,
  CreateEmployeeResponse,
  Department,
  EquipmentOption,
  Manager,
  OnboardingOptions,
  Role,
} from './types'

export const mockRoles: Role[] = [
  { id: 'role-swe', name: 'Software Engineer' },
  { id: 'role-sre', name: 'Site Reliability Engineer' },
  { id: 'role-pm', name: 'Product Manager' },
  { id: 'role-designer', name: 'Product Designer' },
  { id: 'role-analyst', name: 'Data Analyst' },
  { id: 'role-recruiter', name: 'Recruiter' },
]

export const mockDepartments: Department[] = [
  { id: 'dept-platform', name: 'Platform' },
  { id: 'dept-rnd', name: 'R&D' },
  { id: 'dept-product', name: 'Product' },
  { id: 'dept-people', name: 'People' },
  { id: 'dept-finance', name: 'Finance' },
]

export const mockEquipment: EquipmentOption[] = [
  { id: 'equip-laptop', name: 'Laptop' },
  { id: 'equip-monitor', name: 'External monitor' },
  { id: 'equip-keyboard', name: 'Keyboard' },
  { id: 'equip-mouse', name: 'Mouse' },
  { id: 'equip-headset', name: 'Headset' },
  { id: 'equip-dock', name: 'Docking station' },
  { id: 'equip-phone', name: 'Company phone' },
  { id: 'equip-badge', name: 'Building badge' },
]

export const mockAccessGroups: AccessGroup[] = [
  { id: 'engineering', name: 'Engineering' },
  { id: 'finance', name: 'Finance' },
  { id: 'people', name: 'People' },
]

export const mockAccessPermissions: AccessPermission[] = [
  { id: 'source-control', groupId: 'engineering', name: 'Source control' },
  { id: 'ci-cd', groupId: 'engineering', name: 'CI/CD' },
  { id: 'cloud-console', groupId: 'engineering', name: 'Cloud console' },
  { id: 'expense-reports', groupId: 'finance', name: 'Expense reports' },
  { id: 'payroll-admin', groupId: 'finance', name: 'Payroll admin' },
  { id: 'directory-read', groupId: 'people', name: 'Directory (read)' },
  { id: 'directory-write', groupId: 'people', name: 'Directory (write)' },
]

export const mockManagers: Manager[] = [
  { id: 'mgr-1', name: 'Grace Hopper', title: 'Engineering Manager' },
  { id: 'mgr-2', name: 'Ada Lovelace', title: 'Director of Engineering' },
  { id: 'mgr-3', name: 'Alan Turing', title: 'Head of Research' },
  { id: 'mgr-4', name: 'Katherine Johnson', title: 'Analytics Manager' },
  { id: 'mgr-5', name: 'Margaret Hamilton', title: 'Principal Engineering Manager' },
  { id: 'mgr-6', name: 'Barbara Liskov', title: 'Software Architecture Lead' },
  { id: 'mgr-7', name: 'Radia Perlman', title: 'Network Engineering Manager' },
  { id: 'mgr-8', name: 'Tim Berners-Lee', title: 'Platform Manager' },
  { id: 'mgr-9', name: 'Donald Knuth', title: 'Research Manager' },
  { id: 'mgr-10', name: 'Edsger Dijkstra', title: 'Research Manager' },
  { id: 'mgr-11', name: 'John Backus', title: 'Engineering Manager' },
  { id: 'mgr-12', name: 'Frances Allen', title: 'Compiler Team Lead' },
  { id: 'mgr-13', name: 'Vinton Cerf', title: 'Network Architecture Manager' },
  { id: 'mgr-14', name: 'Whitfield Diffie', title: 'Security Manager' },
  { id: 'mgr-15', name: 'Shafi Goldwasser', title: 'Security Research Manager' },
  { id: 'mgr-16', name: 'Leslie Lamport', title: 'Distributed Systems Manager' },
  { id: 'mgr-17', name: 'Ken Thompson', title: 'Systems Engineering Manager' },
  { id: 'mgr-18', name: 'Dennis Ritchie', title: 'Systems Engineering Manager' },
  { id: 'mgr-19', name: 'Brian Kernighan', title: 'Documentation Manager' },
  { id: 'mgr-20', name: 'Anita Borg', title: 'Engineering Director' },
  { id: 'mgr-21', name: 'Steve Wozniak', title: 'Hardware Engineering Manager' },
  { id: 'mgr-22', name: 'Hedy Lamarr', title: 'Research Manager' },
  { id: 'mgr-23', name: 'Mary Allen Wilkes', title: 'Engineering Manager' },
  { id: 'mgr-24', name: 'Jean Bartik', title: 'Engineering Manager' },
  { id: 'mgr-25', name: 'Betty Holberton', title: 'Engineering Manager' },
  { id: 'mgr-26', name: 'Adele Goldberg', title: 'Engineering Manager' },
  { id: 'mgr-27', name: 'Lynn Conway', title: 'Hardware Engineering Manager' },
  { id: 'mgr-28', name: 'Erna Schneider Hoover', title: 'Systems Engineering Manager' },
  { id: 'mgr-29', name: 'Evelyn Berezin', title: 'Hardware Engineering Manager' },
  { id: 'mgr-30', name: 'Jean Sammet', title: 'Compiler Team Lead' },
  { id: 'mgr-31', name: 'Marissa Mayer', title: 'Product Manager' },
  { id: 'mgr-32', name: 'Sheryl Sandberg', title: 'Operations Director' },
  { id: 'mgr-33', name: 'Susan Wojcicki', title: 'Product Manager' },
  { id: 'mgr-34', name: 'Ginni Rometty', title: 'Engineering Director' },
  { id: 'mgr-35', name: 'Safra Catz', title: 'Finance Director' },
  { id: 'mgr-36', name: 'Reshma Saujani', title: 'Program Manager' },
  { id: 'mgr-37', name: 'Fei-Fei Li', title: 'Research Manager' },
  { id: 'mgr-38', name: 'Andrew Ng', title: 'Research Manager' },
  { id: 'mgr-39', name: 'Yann LeCun', title: 'Research Manager' },
  { id: 'mgr-40', name: 'Geoffrey Hinton', title: 'Research Manager' },
  { id: 'mgr-41', name: 'Yoshua Bengio', title: 'Research Manager' },
  { id: 'mgr-42', name: 'Cynthia Breazeal', title: 'Robotics Engineering Manager' },
  { id: 'mgr-43', name: 'Rodney Brooks', title: 'Robotics Engineering Manager' },
  { id: 'mgr-44', name: 'Daphne Koller', title: 'Research Manager' },
  { id: 'mgr-45', name: 'Sebastian Thrun', title: 'Research Manager' },
  { id: 'mgr-46', name: 'Peter Norvig', title: 'Research Director' },
  { id: 'mgr-47', name: 'Ada Yonath', title: 'Research Manager' },
  { id: 'mgr-48', name: 'Marissa Coleman', title: 'People Operations Manager' },
  { id: 'mgr-49', name: 'Priya Natarajan', title: 'Engineering Manager' },
  { id: 'mgr-50', name: 'Oscar Delgado', title: 'Finance Manager' },
]

export function createOnboardingHandlerMocks(baseUrl: string): HttpHandler[] {
  return [
    http.get(`${baseUrl}/onboarding/options`, () => {
      const payload: OnboardingOptions = {
        roles: mockRoles,
        departments: mockDepartments,
        equipment: mockEquipment,
        accessGroups: mockAccessGroups,
        accessPermissions: mockAccessPermissions,
      }
      return HttpResponse.json(payload)
    }),

    http.get(`${baseUrl}/onboarding/managers`, ({ request }) => {
      const url = new URL(request.url)
      const q = url.searchParams.get('q')?.toLowerCase() ?? ''
      const filtered = q
        ? mockManagers.filter((manager) => manager.name.toLowerCase().includes(q))
        : mockManagers
      const payload: Manager[] = filtered.slice(0, 10)
      return HttpResponse.json(payload)
    }),

    http.post(`${baseUrl}/onboarding`, async ({ request }) => {
      const body = (await request.json()) as CreateEmployeeRequest
      const payload: CreateEmployeeResponse = {
        id: 'new-employee-1',
        firstName: body.personalDetails.firstName,
        lastName: body.personalDetails.lastName,
        email: body.personalDetails.email,
        startDate: body.startDate,
      }
      return HttpResponse.json(payload)
    }),
  ]
}
