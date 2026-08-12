import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from './components/ErrorBoundary'

function Bomb(): never {
  throw new Error('Boom: this component always throws')
}

describe('app', () => {
  it('renders the error boundary fallback when a component throws while rendering', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(
      screen.getByText('Boom: this component always throws'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
