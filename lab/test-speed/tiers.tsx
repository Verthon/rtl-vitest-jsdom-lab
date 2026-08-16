import { render, cleanup, screen } from '@testing-library/react'
import { TestAppProviders } from '@/testsConfig/TestAppProviders'
import { onboardingRoutes } from '@/employee-onboarding/routes'
import { employeesRoutes } from '@/employee-directory/routes'

export type TierName = 'small' | 'medium' | 'huge'

export type TierProfile = {
  nodes: number
  roles: Record<string, number>
  interactive: number
}

const INTERACTIVE_SELECTOR =
  'a[href], button, input, select, textarea, [role="button"], [role="link"], [role="combobox"], [role="checkbox"], [role="option"], [role="tab"], [contenteditable="true"]'

export function profileOf(container: HTMLElement): TierProfile {
  const all = container.querySelectorAll('*')
  const roles: Record<string, number> = {}

  for (const element of all) {
    const role = explicitOrImplicitRole(element)
    if (role) {
      roles[role] = (roles[role] ?? 0) + 1
    }
  }

  return {
    nodes: all.length,
    roles,
    interactive: container.querySelectorAll(INTERACTIVE_SELECTOR).length,
  }
}

function explicitOrImplicitRole(element: Element): string | undefined {
  const explicit = element.getAttribute('role')
  if (explicit) return explicit

  const tag = element.tagName.toLowerCase()
  switch (tag) {
    case 'button':
      return 'button'
    case 'a':
      return element.hasAttribute('href') ? 'link' : undefined
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return 'heading'
    case 'input': {
      const type = element.getAttribute('type') ?? 'text'
      if (type === 'checkbox') return 'checkbox'
      if (type === 'radio') return 'radio'
      if (type === 'email' || type === 'tel' || type === 'text') return 'textbox'
      return undefined
    }
    case 'textarea':
      return 'textbox'
    case 'table':
      return 'table'
    case 'tr':
      return 'row'
    case 'td':
      return 'cell'
    case 'th':
      return 'columnheader'
    case 'output':
      return 'status'
    case 'p':
      return 'paragraph'
    case 'ul':
    case 'ol':
      return 'list'
    case 'li':
      return 'listitem'
    default:
      return undefined
  }
}

export function enclosingScope(element: HTMLElement, fallback: HTMLElement): HTMLElement {
  return element.closest('div') ?? fallback
}

export function countTestIds(container: HTMLElement) {
  return container.querySelectorAll('[data-testid]').length
}

export type RenderedTier = {
  name: TierName
  container: HTMLElement
  cleanup: () => void
}

const TIER_ROUTES = {
  small: { routes: employeesRoutes, path: '/employees' },
  medium: { routes: onboardingRoutes, path: '/onboarding/personal-details' },
  huge: { routes: onboardingRoutes, path: '/onboarding/review' },
} as const

export async function renderTier(
  name: TierName,
  waitForReady: () => Promise<unknown>,
): Promise<RenderedTier> {
  const { routes, path } = TIER_ROUTES[name]

  const { container } = render(
    <TestAppProviders routes={routes} routerProps={{ initialEntries: [path] }} />,
  )

  await waitForReady()

  return { name, container, cleanup }
}

export const TIER_NAMES: TierName[] = ['small', 'medium', 'huge']

const READY_TIMEOUT = 10000

export const tierReady: Record<TierName, () => Promise<unknown>> = {
  small: () => screen.findByRole('table', {}, { timeout: READY_TIMEOUT }),
  medium: () =>
    screen.findByRole('heading', { level: 2, name: 'Personal details' }, { timeout: READY_TIMEOUT }),
  huge: () =>
    screen.findByRole('heading', { level: 2, name: 'Review & submit' }, { timeout: READY_TIMEOUT }),
}
