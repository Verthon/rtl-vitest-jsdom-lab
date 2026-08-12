import { createBrowserRouter } from 'react-router'
import { homeRoutes } from '@/home/routes'
import { employeesRoutes } from '@/employee-directory/routes'

export const router = createBrowserRouter([...homeRoutes, ...employeesRoutes])
