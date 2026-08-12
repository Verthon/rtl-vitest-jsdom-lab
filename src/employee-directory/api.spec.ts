import { renderHook, waitFor } from '@testing-library/react'
import { useQuery } from '@tanstack/react-query'
import { TestAppProviders } from '@/testsConfig/TestAppProviders'
import { employeesQueryOptions } from './api'
import { mockEmployees } from './mocks'

describe('employeesQueryOptions', () => {
  it('fetches employees from the API', async () => {
    const { result } = renderHook(() => useQuery(employeesQueryOptions(1)), {
      wrapper: TestAppProviders,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toStrictEqual({
      data: mockEmployees.slice(0, 10),
      page: 1,
      perPage: 10,
      total: mockEmployees.length,
    })
  })
})
