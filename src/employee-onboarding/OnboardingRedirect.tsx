import { Navigate } from 'react-router'
import { onboardingWizard } from './wizard'

export function OnboardingRedirect() {
  return <Navigate to={`/onboarding/${onboardingWizard.steps[0].id}`} replace />
}
