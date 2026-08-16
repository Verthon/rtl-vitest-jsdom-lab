import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation, useNavigate, type RouteObject } from 'react-router'
import { defineStepper } from '@stepperize/react'
import { TestAppProviders } from '@/testsConfig/TestAppProviders'
import { useUrlStepper } from './useUrlStepper'
import { StepperProgress } from './StepperProgress'

const fixtureWizard = defineStepper([
  { id: 'step-1', title: 'Step 1' },
  { id: 'step-2', title: 'Step 2' },
  { id: 'step-3', title: 'Step 3' },
])

function FixtureWizardPage() {
  const urlStepper = useUrlStepper(fixtureWizard, '/fixture')
  const { stepper } = urlStepper

  return (
    <div>
      <StepperProgress wizard={fixtureWizard} urlStepper={urlStepper} />
      <div>{stepper.current.id}</div>
      <button onClick={() => stepper.prev()} disabled={!stepper.canPrev}>
        Back
      </button>
      <button onClick={() => stepper.next()} disabled={!stepper.canNext}>
        Next
      </button>
      {stepper.isLast && <button>Finish</button>}
    </div>
  )
}

function LocationProbe() {
  const { pathname } = useLocation()
  return <output aria-label="current URL path">{pathname}</output>
}

function NavigateBackButton() {
  const navigate = useNavigate()
  return (
    <button onClick={() => navigate(-1)} aria-label="browser back">
      Browser back
    </button>
  )
}

const fixtureRoutes: RouteObject[] = [
  {
    path: '/fixture/:step',
    element: (
      <>
        <FixtureWizardPage />
        <LocationProbe />
        <NavigateBackButton />
      </>
    ),
  },
]

function renderFixture(initialEntries: string[]) {
  return render(
    <TestAppProviders routes={fixtureRoutes} routerProps={{ initialEntries }} />,
  )
}

function currentPath() {
  return screen.getByRole('status', { name: 'current URL path' })
}

describe('useUrlStepper', () => {
  it('lands on the step named in the URL, not the default', () => {
    renderFixture(['/fixture/step-2'])

    expect(screen.getByText('step-2')).toBeInTheDocument()
  })

  it('changes the URL when next() is called', async () => {
    const user = userEvent.setup()
    renderFixture(['/fixture/step-1'])

    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByText('step-2')).toBeInTheDocument()
    expect(currentPath()).toHaveTextContent('/fixture/step-2')
  })

  it('changes the URL when a stepper trigger is clicked', async () => {
    const user = userEvent.setup()
    renderFixture(['/fixture/step-1'])

    await user.click(screen.getByRole('tab', { name: 'Step 3' }))

    expect(screen.getByText('step-3')).toBeInTheDocument()
    expect(currentPath()).toHaveTextContent('/fixture/step-3')
  })

  it('reflects browser back navigation in the rendered step', async () => {
    const user = userEvent.setup()
    renderFixture(['/fixture/step-1', '/fixture/step-2'])

    expect(screen.getByText('step-2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'browser back' }))

    expect(screen.getByText('step-1')).toBeInTheDocument()
    expect(currentPath()).toHaveTextContent('/fixture/step-1')
  })

  it('redirects an invalid step to the first step via replace, not push', async () => {
    renderFixture(['/fixture/step-2', '/fixture/nonexistent'])

    expect(await screen.findByText('step-1')).toBeInTheDocument()
    expect(currentPath()).toHaveTextContent('/fixture/step-1')

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'browser back' }))

    // A `push` redirect would leave the invalid entry in history, landing
    // back there; `replace` collapses it, so back goes straight to step-2.
    expect(await screen.findByText('step-2')).toBeInTheDocument()
    expect(currentPath()).toHaveTextContent('/fixture/step-2')
  })

  it('disables prev on the first step and enables it after moving forward', async () => {
    const user = userEvent.setup()
    renderFixture(['/fixture/step-1'])

    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled()
  })

  it('reports isLast and disables next on the last step', () => {
    renderFixture(['/fixture/step-3'])

    expect(screen.getByText('step-3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Finish' })).toBeInTheDocument()
  })

  it('does not render the Finish affordance before the last step', () => {
    renderFixture(['/fixture/step-1'])

    expect(screen.queryByRole('button', { name: 'Finish' })).not.toBeInTheDocument()
  })
})
