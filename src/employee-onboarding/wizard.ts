import { defineStepper } from '@stepperize/react'

export const onboardingWizard = defineStepper([
  { id: 'personal-details', title: 'Personal details' },
  { id: 'contact', title: 'Contact' },
  { id: 'address', title: 'Address' },
  { id: 'role-department', title: 'Role & department' },
  { id: 'manager', title: 'Manager' },
  { id: 'start-date', title: 'Start date' },
  { id: 'equipment', title: 'Equipment' },
  { id: 'access', title: 'Access & permissions' },
  { id: 'documents', title: 'Documents' },
  { id: 'review', title: 'Review & submit' },
])
