export type Employee = {
  id: string
  name: string
  role: string
  department: string
  status: 'active' | 'on_leave' | 'terminated' | 'not_started'
}

export type Paginated<T> = {
  data: T[]
  page: number
  perPage: number
  total: number
}
