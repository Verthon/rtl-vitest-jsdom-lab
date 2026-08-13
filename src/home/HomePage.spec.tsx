import { render, screen } from '@testing-library/react'
import { TestAppProviders } from '@/testsConfig/TestAppProviders'
import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('links to the employee directory', () => {
    render(<HomePage />, { wrapper: TestAppProviders })

    expect(
      screen.getByRole('link', { name: /employee directory/i }),
    ).toHaveAttribute('href', '/employees')
  })

  it('renders the page heading', () => {
    render(<HomePage />, { wrapper: TestAppProviders })

    expect(screen.getByRole('heading', { level: 1, name: 'Directory' })).toBeInTheDocument()
  })
})
