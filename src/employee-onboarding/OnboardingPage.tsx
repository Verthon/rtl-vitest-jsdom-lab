import { useState } from 'react'
import { StepperProgress } from './StepperProgress'
import { useUrlStepper } from './useUrlStepper'
import { onboardingWizard } from './wizard'
import { createDefaultDraft } from './defaultDraft'
import { PersonalDetailsStep } from './steps/PersonalDetailsStep'
import { ContactStep } from './steps/ContactStep'
import { AddressStep } from './steps/AddressStep'
import { RoleDepartmentStep } from './steps/RoleDepartmentStep'
import { ManagerStep } from './steps/ManagerStep'
import { StartDateStep } from './steps/StartDateStep'
import { EquipmentStep } from './steps/EquipmentStep'
import { AccessStep } from './steps/AccessStep'
import { DocumentsStep } from './steps/DocumentsStep'
import { ReviewStep } from './steps/ReviewStep'
import type { CreateEmployeeResponse, OnboardingDraft } from './types'

export function OnboardingPage() {
  const [draft, setDraft] = useState<OnboardingDraft>(createDefaultDraft)
  const [submitted, setSubmitted] = useState<CreateEmployeeResponse | undefined>(undefined)
  const urlStepper = useUrlStepper(onboardingWizard, '/onboarding')
  const { stepper } = urlStepper

  function updateDraft<Key extends keyof OnboardingDraft>(key: Key, value: OnboardingDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  if (submitted) {
    return (
      <section className="mx-auto max-w-2xl p-4">
        <h1 className="text-lg font-medium">Welcome aboard, {submitted.firstName}!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {submitted.firstName} {submitted.lastName}'s onboarding is complete. Start date:{' '}
          {submitted.startDate}.
        </p>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-2xl p-4">
      <h1 className="text-lg font-medium">Employee onboarding</h1>

      <StepperProgress wizard={onboardingWizard} urlStepper={urlStepper} />

      <div className="mt-4">
        {stepper.match({
          'personal-details': () => (
            <PersonalDetailsStep
              answers={draft.personalDetails}
              onChange={(value) => updateDraft('personalDetails', value)}
              onNext={() => stepper.next()}
            />
          ),
          contact: () => (
            <ContactStep
              answers={draft.contacts}
              onChange={(value) => updateDraft('contacts', value)}
              onNext={() => stepper.next()}
              onBack={() => stepper.prev()}
            />
          ),
          address: () => (
            <AddressStep
              answers={draft.address}
              onChange={(value) => updateDraft('address', value)}
              onNext={() => stepper.next()}
              onBack={() => stepper.prev()}
            />
          ),
          'role-department': () => (
            <RoleDepartmentStep
              answers={draft.roleAndDepartment}
              onChange={(value) => updateDraft('roleAndDepartment', value)}
              onNext={() => stepper.next()}
              onBack={() => stepper.prev()}
            />
          ),
          manager: () => (
            <ManagerStep
              answers={draft.manager}
              onChange={(value) => updateDraft('manager', value)}
              onNext={() => stepper.next()}
              onBack={() => stepper.prev()}
            />
          ),
          'start-date': () => (
            <StartDateStep
              answers={draft.startDate}
              onChange={(value) => updateDraft('startDate', value)}
              onNext={() => stepper.next()}
              onBack={() => stepper.prev()}
            />
          ),
          equipment: () => (
            <EquipmentStep
              answers={draft.equipment}
              onChange={(value) => updateDraft('equipment', value)}
              onNext={() => stepper.next()}
              onBack={() => stepper.prev()}
            />
          ),
          access: () => (
            <AccessStep
              answers={draft.access}
              onChange={(value) => updateDraft('access', value)}
              onNext={() => stepper.next()}
              onBack={() => stepper.prev()}
            />
          ),
          documents: () => (
            <DocumentsStep
              answers={draft.documents}
              onChange={(value) => updateDraft('documents', value)}
              onNext={() => stepper.next()}
              onBack={() => stepper.prev()}
            />
          ),
          review: () => (
            <ReviewStep draft={draft} onBack={() => stepper.prev()} onSubmitted={setSubmitted} />
          ),
        })}
      </div>
    </section>
  )
}
