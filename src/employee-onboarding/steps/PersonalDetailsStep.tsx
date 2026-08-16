import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { PersonalDetails } from '../types'

type Errors = Partial<Record<keyof PersonalDetails, string>>

function validate(answers: PersonalDetails): Errors {
  const errors: Errors = {}
  if (!answers.firstName.trim()) errors.firstName = 'First name is required.'
  if (!answers.lastName.trim()) errors.lastName = 'Last name is required.'
  if (!answers.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!answers.email.includes('@')) {
    errors.email = 'Enter a valid email address.'
  }
  if (!answers.phone.trim()) errors.phone = 'Phone number is required.'
  return errors
}

export function PersonalDetailsStep({
  answers,
  onChange,
  onNext,
}: {
  answers: PersonalDetails
  onChange: (next: PersonalDetails) => void
  onNext: () => void
}) {
  const [submitted, setSubmitted] = useState(false)
  const errors = validate(answers)
  const hasErrors = Object.keys(errors).length > 0

  function handleNext() {
    setSubmitted(true)
    if (!hasErrors) {
      onNext()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-medium">Personal details</h2>

      <FieldGroup>
        <Field data-invalid={submitted && !!errors.firstName}>
          <FieldLabel htmlFor="onboarding-first-name">First name</FieldLabel>
          <Input
            id="onboarding-first-name"
            value={answers.firstName}
            aria-invalid={submitted && !!errors.firstName}
            onChange={(event) => onChange({ ...answers, firstName: event.target.value })}
          />
          {submitted && errors.firstName && <FieldError>{errors.firstName}</FieldError>}
        </Field>

        <Field data-invalid={submitted && !!errors.lastName}>
          <FieldLabel htmlFor="onboarding-last-name">Last name</FieldLabel>
          <Input
            id="onboarding-last-name"
            value={answers.lastName}
            aria-invalid={submitted && !!errors.lastName}
            onChange={(event) => onChange({ ...answers, lastName: event.target.value })}
          />
          {submitted && errors.lastName && <FieldError>{errors.lastName}</FieldError>}
        </Field>

        <Field data-invalid={submitted && !!errors.email}>
          <FieldLabel htmlFor="onboarding-email">Email</FieldLabel>
          <Input
            id="onboarding-email"
            type="email"
            value={answers.email}
            aria-invalid={submitted && !!errors.email}
            onChange={(event) => onChange({ ...answers, email: event.target.value })}
          />
          {submitted && errors.email && <FieldError>{errors.email}</FieldError>}
        </Field>

        <Field data-invalid={submitted && !!errors.phone}>
          <FieldLabel htmlFor="onboarding-phone">Phone</FieldLabel>
          <Input
            id="onboarding-phone"
            type="tel"
            value={answers.phone}
            aria-invalid={submitted && !!errors.phone}
            onChange={(event) => onChange({ ...answers, phone: event.target.value })}
          />
          {submitted && errors.phone && <FieldError>{errors.phone}</FieldError>}
        </Field>
      </FieldGroup>

      <div>
        <Button onClick={handleNext} disabled={submitted && hasErrors}>
          Next
        </Button>
      </div>
    </div>
  )
}
