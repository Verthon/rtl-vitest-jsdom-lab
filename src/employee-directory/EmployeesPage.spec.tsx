import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestAppProviders } from '@/testsConfig/TestAppProviders'
import { mockNetworkError, mockResponse } from '@/testsConfig/mockResponse'
import { server } from '@/mocks/server'
import { EmployeesPage } from './EmployeesPage'
import { mockEmployees } from './mocks'

function renderPage() {
  return render(<EmployeesPage />, { wrapper: TestAppProviders })
}

function dataRows() {
  const [, ...rows] = screen.getAllByRole('row')
  return rows
}

async function findRowByName(name: string) {
  return (await screen.findByRole('cell', { name })).closest('tr')
}

function setupFakeTimerUser() {
  vi.useFakeTimers()
  Object.assign(globalThis, { jest: { advanceTimersByTime: vi.advanceTimersByTime } })
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
}

describe('EmployeesPage', () => {
  afterEach(() => {
    vi.useRealTimers()
    Reflect.deleteProperty(globalThis, 'jest')
  })

  it('shows the first page of employees', async () => {
    renderPage()

    await findRowByName(mockEmployees[0].name)

    expect(dataRows()).toHaveLength(10)
    expect(screen.getByText('Showing 1–10 of 47')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go to previous page' })).toBeDisabled()
  })

  it('shows a middle page of employees', async () => {
    const user = userEvent.setup()
    renderPage()

    await findRowByName(mockEmployees[0].name)
    await user.click(screen.getByRole('button', { name: '3' }))
    await findRowByName(mockEmployees[20].name)

    expect(dataRows()).toHaveLength(10)
    expect(screen.getByText('Showing 21–30 of 47')).toBeInTheDocument()
  })

  it('shows the partial last page', async () => {
    const user = userEvent.setup()
    renderPage()

    await findRowByName(mockEmployees[0].name)
    await user.click(screen.getByRole('button', { name: '5' }))
    await findRowByName(mockEmployees[40].name)

    expect(dataRows()).toHaveLength(7)
    expect(screen.getByText('Showing 41–47 of 47')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go to next page' })).toBeDisabled()
  })

  it('offers both directions on a middle page', async () => {
    const user = userEvent.setup()
    renderPage()

    await findRowByName(mockEmployees[0].name)
    await user.click(screen.getByRole('button', { name: '3' }))
    await findRowByName(mockEmployees[20].name)

    expect(screen.getByRole('button', { name: 'Go to previous page' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Go to next page' })).toBeEnabled()
  })

  it('offers one link per page of employees', async () => {
    renderPage()

    await findRowByName(mockEmployees[0].name)

    expect(screen.getAllByRole('button', { name: /^[0-9]+$/ })).toHaveLength(5)
  })

  it('steps forward and back through the pages', async () => {
    const user = userEvent.setup()
    renderPage()

    await findRowByName(mockEmployees[0].name)

    await user.click(screen.getByRole('button', { name: 'Go to next page' }))
    await findRowByName(mockEmployees[10].name)
    expect(screen.getByText('Showing 11–20 of 47')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Go to previous page' }))
    await findRowByName(mockEmployees[0].name)
    expect(screen.getByText('Showing 1–10 of 47')).toBeInTheDocument()
  })

  it('reports a server error', async () => {
    server.use(mockResponse('employees', { status: 500 }))
    renderPage()

    expect(await screen.findByText('Failed to load employees')).toBeInTheDocument()
    expect(screen.getByText(/500/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('reports an unauthorized response', async () => {
    server.use(mockResponse('employees', { status: 401 }))
    renderPage()

    expect(await screen.findByText('Failed to load employees')).toBeInTheDocument()
    expect(screen.getByText(/401/)).toBeInTheDocument()
  })

  it('reports a network failure', async () => {
    server.use(mockNetworkError('employees'))
    renderPage()

    expect(await screen.findByText('Failed to load employees')).toBeInTheDocument()
  })

  it('shows what the user typed in the filter field', async () => {
    const user = userEvent.setup()
    renderPage()

    await findRowByName(mockEmployees[0].name)
    const filterField = screen.getByRole('textbox', { name: /name/i })
    await user.type(filterField, 'Ada')

    expect(filterField).toHaveValue('Ada')
  })

  it('filters the table by name after the debounce elapses', async () => {
    renderPage()
    await findRowByName(mockEmployees[0].name)

    const user = setupFakeTimerUser()
    const filterField = screen.getByRole('textbox', { name: /name/i })
    await user.type(filterField, 'grace hopper')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    await findRowByName('Grace Hopper')
    expect(dataRows()).toHaveLength(1)
  })

  it('does not refetch until typing stops', async () => {
    renderPage()
    await findRowByName(mockEmployees[0].name)

    const requests: Array<string | null> = []
    const onRequest = ({ request }: { request: Request }) => {
      requests.push(new URL(request.url).searchParams.get('q'))
    }
    server.events.on('request:start', onRequest)

    const user = setupFakeTimerUser()
    const filterField = screen.getByRole('textbox', { name: /name/i })

    for (const char of 'Grace Hopper') {
      await user.type(filterField, char)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })
    }

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    server.events.removeListener('request:start', onRequest)

    const filteredRequests = requests.filter(Boolean)
    expect(filteredRequests).toStrictEqual(['Grace Hopper'])
  })

  it('returns to the first page when the filter changes', async () => {
    const clickUser = userEvent.setup()
    renderPage()

    await findRowByName(mockEmployees[0].name)
    await clickUser.click(screen.getByRole('button', { name: '3' }))
    await findRowByName(mockEmployees[20].name)

    const user = setupFakeTimerUser()
    const filterField = screen.getByRole('textbox', { name: /name/i })
    await user.type(filterField, 'an')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    await screen.findByText('Showing 1–10 of 13')
    expect(screen.getByRole('button', { name: 'Go to previous page' })).toBeDisabled()
  })

  it('shows the empty state when no employee matches', async () => {
    renderPage()
    await findRowByName(mockEmployees[0].name)

    const user = setupFakeTimerUser()
    const filterField = screen.getByRole('textbox', { name: /name/i })
    await user.type(filterField, 'Zzz')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    await screen.findByText('No employees found.')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows the loading state until a delayed response arrives', async () => {
    server.use(
      mockResponse('employees', {
        delay: 100,
        body: { data: [], page: 1, perPage: 10, total: 0 },
      }),
    )
    renderPage()

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.getByRole('status')).toBeInTheDocument()

    expect(await screen.findByText('No employees found.')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
