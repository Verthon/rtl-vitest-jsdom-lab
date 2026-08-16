import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet, useLocation, type RouteObject } from 'react-router'
import { TestAppProviders } from '@/testsConfig/TestAppProviders'
import { server } from '@/mocks/server'
import { onboardingRoutes } from './routes'
import { mockDepartments, mockRoles } from './mocks'

function LocationProbe() {
  const { pathname } = useLocation()
  return <output aria-label="current URL path">{pathname}</output>
}

const routesWithProbe: RouteObject[] = [
  {
    element: (
      <>
        <Outlet />
        <LocationProbe />
      </>
    ),
    children: onboardingRoutes,
  },
]

// The onboarding route pulls in ten step modules plus the combobox/calendar
// chain; vitest's on-demand transform of that graph can take longer than
// RTL's default 1000ms `findBy*` timeout the first time a test touches it.
const FIRST_RENDER_TIMEOUT = 10000

function findStepHeading(name: string) {
  return screen.findByRole('heading', { level: 2, name }, { timeout: FIRST_RENDER_TIMEOUT })
}

async function renderOnboarding(initialEntries: string[], heading: string) {
  render(<TestAppProviders routes={onboardingRoutes} routerProps={{ initialEntries }} />)
  await findStepHeading(heading)
}

function currentPath() {
  return screen.getByRole('status', { name: 'current URL path' })
}

function expectPath(path: string) {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  expect(currentPath()).toHaveTextContent(new RegExp(`^${escaped}$`))
}

async function fillPersonalDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('First name'), 'Ada')
  await user.type(screen.getByLabelText('Last name'), 'Lovelace')
  await user.type(screen.getByLabelText('Email'), 'ada@example.com')
  await user.type(screen.getByLabelText('Phone'), '555-0100')
  await user.click(screen.getByRole('button', { name: 'Next' }))
}

async function selectComboboxOption(
  user: ReturnType<typeof userEvent.setup>,
  inputName: RegExp | string,
  optionName: string,
) {
  const input = screen.getByRole('combobox', { name: inputName })
  await user.click(input)
  await user.click(await screen.findByRole('option', { name: optionName }))
}

describe('OnboardingPage', () => {
  it(
    'redirects a bare /onboarding to the first step',
    async () => {
      render(<TestAppProviders routes={onboardingRoutes} routerProps={{ initialEntries: ['/onboarding'] }} />)

      expect(await findStepHeading('Personal details')).toBeInTheDocument()
    },
    FIRST_RENDER_TIMEOUT + 1000,
  )

  describe('journey', () => {
    it(
      'walks the wizard forward, preserves an earlier answer on back, and submits',
      async () => {
      const user = userEvent.setup()
      render(
        <TestAppProviders
          routes={routesWithProbe}
          routerProps={{ initialEntries: ['/onboarding/personal-details'] }}
        />,
      )
      await findStepHeading('Personal details')

      expectPath('/onboarding/personal-details')

      await fillPersonalDetails(user)
      await findStepHeading('Emergency contacts')
      expectPath('/onboarding/contact')

      await user.click(screen.getByRole('button', { name: 'Add another contact' }))
      await user.type(screen.getByLabelText('Name'), 'Grace Hopper')
      await user.type(screen.getByLabelText('Relationship'), 'Colleague')
      await user.type(screen.getByLabelText('Phone'), '555-0101')
      await user.click(screen.getByRole('button', { name: 'Next' }))
      await findStepHeading('Address')
      expectPath('/onboarding/address')

      await user.type(screen.getByLabelText('Street'), '1 Infinite Loop')
      await user.type(screen.getByLabelText('City'), 'Cupertino')
      await user.click(screen.getByRole('button', { name: 'Next' }))
      await findStepHeading('Role & department')
      expectPath('/onboarding/role-department')

      await selectComboboxOption(user, 'Role', mockRoles[0].name)
      await selectComboboxOption(user, 'Department', mockDepartments[0].name)
      await user.click(screen.getByRole('button', { name: 'Next' }))
      await findStepHeading('Manager')
      expectPath('/onboarding/manager')

      await user.type(screen.getByRole('combobox', { name: 'Search for a manager' }), 'Grace')
      await user.click(await screen.findByRole('option', { name: /Grace Hopper/ }))
      await user.click(screen.getByRole('button', { name: 'Next' }))
      await findStepHeading('Start date')
      expectPath('/onboarding/start-date')

      // Go back to personal-details and confirm the earlier answer survived.
      await user.click(screen.getByRole('tab', { name: 'Personal details' }))
      await findStepHeading('Personal details')
      expectPath('/onboarding/personal-details')
      expect(screen.getByLabelText('First name')).toHaveValue('Ada')

      // Forward again to where we left off.
      await user.click(screen.getByRole('tab', { name: 'Start date' }))
      await findStepHeading('Start date')
      expectPath('/onboarding/start-date')

      await user.click(screen.getByRole('button', { name: 'Start date' }))
      await user.click(screen.getByRole('button', { name: 'Monday, January 12th, 2026' }))
      await user.click(screen.getByRole('button', { name: 'Next' }))
      await findStepHeading('Equipment')
      expectPath('/onboarding/equipment')

      await user.click(screen.getByRole('checkbox', { name: 'Laptop' }))
      await user.click(screen.getByRole('button', { name: 'Next' }))
      await findStepHeading('Access & permissions')
      expectPath('/onboarding/access')

      await user.click(screen.getByRole('checkbox', { name: 'Source control' }))
      await user.click(screen.getByRole('button', { name: 'Next' }))
      await findStepHeading('Documents')
      expectPath('/onboarding/documents')

      await user.click(screen.getByRole('button', { name: 'Next' }))
      await findStepHeading('Review & submit')
      expectPath('/onboarding/review')

      expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
      expect(screen.getByText('ada@example.com')).toBeInTheDocument()
      expect(screen.getByText(/Grace Hopper \(Colleague\)/)).toBeInTheDocument()
      expect(screen.getByText(new RegExp(mockRoles[0].name))).toBeInTheDocument()

      let submittedBody: unknown
      server.events.on('request:match', async ({ request }) => {
        if (request.method === 'POST') {
          submittedBody = await request.clone().json()
        }
      })

      await user.click(screen.getByRole('button', { name: 'Submit' }))

      expect(await screen.findByText('Welcome aboard, Ada!')).toBeInTheDocument()
      expect(submittedBody).toMatchObject({
        personalDetails: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
          phone: '555-0100',
        },
        roleId: mockRoles[0].id,
        departmentId: mockDepartments[0].id,
        managerId: 'mgr-1',
        equipmentIds: ['equip-laptop'],
        permissionIds: ['source-control'],
      })
      },
      FIRST_RENDER_TIMEOUT + 5000,
    )
  })

  describe('per-step', () => {
    it('shows required-field errors on personal details without walking the journey', async () => {
      const user = userEvent.setup()
      await renderOnboarding(['/onboarding/personal-details'], 'Personal details')

      await user.click(screen.getByRole('button', { name: 'Next' }))

      expect(screen.getByText('First name is required.')).toBeInTheDocument()
      expect(screen.getByText('Last name is required.')).toBeInTheDocument()
      expect(screen.getByText('Email is required.')).toBeInTheDocument()
      expect(screen.getByText('Phone number is required.')).toBeInTheDocument()
    })

    it('rejects an email without an @ on personal details', async () => {
      const user = userEvent.setup()
      await renderOnboarding(['/onboarding/personal-details'], 'Personal details')

      await user.type(screen.getByLabelText('Email'), 'not-an-email')
      await user.click(screen.getByRole('button', { name: 'Next' }))

      expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    })

    it('adds and removes a repeatable contact', async () => {
      const user = userEvent.setup()
      await renderOnboarding(['/onboarding/contact'], 'Emergency contacts')

      await user.click(screen.getByRole('button', { name: 'Add another contact' }))
      await user.type(screen.getAllByLabelText('Name')[0], 'Grace')
      await user.click(screen.getByRole('button', { name: 'Add another contact' }))
      await user.type(screen.getAllByLabelText('Name')[1], 'Alan')

      await user.click(screen.getByRole('button', { name: 'Remove contact 1' }))

      expect(screen.getAllByLabelText('Name')).toHaveLength(1)
      expect(screen.getByLabelText('Name')).toHaveValue('Alan')
    })

    it('populates region options after a country is selected on the address step', async () => {
      const user = userEvent.setup()
      await renderOnboarding(['/onboarding/address'], 'Address')

      expect(screen.getByLabelText('State / region')).toBeDisabled()

      await user.click(screen.getByRole('combobox', { name: 'Country' }))
      await user.click(await screen.findByRole('option', { name: 'United States' }))

      expect(screen.getByLabelText('State / region')).toBeEnabled()

      await user.click(screen.getByRole('combobox', { name: 'State / region' }))
      expect(await screen.findByRole('option', { name: 'California' })).toBeInTheDocument()
    })

    it('disables Next until a role and department are selected', async () => {
      const user = userEvent.setup()
      await renderOnboarding(['/onboarding/role-department'], 'Role & department')

      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()

      await selectComboboxOption(user, 'Role', mockRoles[0].name)
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()

      await selectComboboxOption(user, 'Department', mockDepartments[0].name)
      expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
    })

    it('filters manager search results by the typed query', async () => {
      const user = userEvent.setup()
      await renderOnboarding(['/onboarding/manager'], 'Manager')

      const searchField = screen.getByRole('combobox', { name: 'Search for a manager' })
      await user.type(searchField, 'Turing')

      expect(await screen.findByRole('option', { name: /Alan Turing/ })).toBeInTheDocument()
      expect(screen.queryByRole('option', { name: /Grace Hopper/ })).not.toBeInTheDocument()
    })

    it('disables weekend dates on the start-date calendar', async () => {
      const user = userEvent.setup()
      await renderOnboarding(['/onboarding/start-date'], 'Start date')

      await user.click(screen.getByRole('button', { name: 'Start date' }))

      // 2026-01-10 is a Saturday.
      expect(screen.getByRole('button', { name: 'Saturday, January 10th, 2026' })).toBeDisabled()
    })

    it('disables Next until a start date is chosen', async () => {
      await renderOnboarding(['/onboarding/start-date'], 'Start date')

      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    })

    it('toggles an equipment checkbox', async () => {
      const user = userEvent.setup()
      await renderOnboarding(['/onboarding/equipment'], 'Equipment')

      const laptop = await screen.findByRole('checkbox', { name: 'Laptop' })
      await user.click(laptop)

      expect(laptop).toBeChecked()
    })

    it('marks a permission group indeterminate when only some children are checked', async () => {
      const user = userEvent.setup()
      await renderOnboarding(['/onboarding/access'], 'Access & permissions')

      const engineeringGroup = await screen.findByRole('checkbox', { name: 'Engineering' })
      expect(engineeringGroup).not.toBeChecked()

      await user.click(screen.getByRole('checkbox', { name: 'Source control' }))

      expect(engineeringGroup).toHaveAttribute('aria-checked', 'mixed')

      await user.click(screen.getByRole('checkbox', { name: 'CI/CD' }))
      await user.click(screen.getByRole('checkbox', { name: 'Cloud console' }))

      expect(engineeringGroup).toHaveAttribute('aria-checked', 'true')
    })

    it('checking the group parent checks every child permission', async () => {
      const user = userEvent.setup()
      await renderOnboarding(['/onboarding/access'], 'Access & permissions')

      const engineeringGroup = await screen.findByRole('checkbox', { name: 'Engineering' })
      await user.click(engineeringGroup)

      expect(screen.getByRole('checkbox', { name: 'Source control' })).toBeChecked()
      expect(screen.getByRole('checkbox', { name: 'CI/CD' })).toBeChecked()
      expect(screen.getByRole('checkbox', { name: 'Cloud console' })).toBeChecked()
    })

    it('adds an uploaded document to the list', async () => {
      const user = userEvent.setup()
      await renderOnboarding(['/onboarding/documents'], 'Documents')

      expect(screen.getByText('No documents uploaded yet.')).toBeInTheDocument()

      const file = new File(['contents'], 'passport.pdf', { type: 'application/pdf' })
      await user.upload(screen.getByLabelText('Upload documents'), file)

      expect(screen.getByText('passport.pdf')).toBeInTheDocument()
      expect(screen.queryByText('No documents uploaded yet.')).not.toBeInTheDocument()
    })

    it('puts the current step in the URL for a direct link', async () => {
      await renderOnboarding(['/onboarding/equipment'], 'Equipment')

      const stepper = within(screen.getByRole('tablist'))
      expect(stepper.getByRole('tab', { name: 'Equipment', selected: true })).toBeInTheDocument()
    })
  })
})
