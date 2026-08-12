export type Employee = {
  id: string
  name: string
  role: string
  department: string
  status: 'active' | 'on_leave' | 'terminated'
}
