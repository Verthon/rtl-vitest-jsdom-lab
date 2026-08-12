import { renderHook, waitFor } from '@testing-library/react'
import { useQuery } from '@tanstack/react-query'
import { TestAppProviders } from '@/testsConfig/TestAppProviders'
import { employeesQueryOptions } from './api'
import { mockEmployees } from './mocks'

describe('employeesQueryOptions', () => {
  it('fetches employees from the API', async () => {
    const { result } = renderHook(() => useQuery(employeesQueryOptions), {
      wrapper: TestAppProviders,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toStrictEqual(mockEmployees)
  })
})
