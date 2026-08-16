import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { countries, regionsByCountry } from '../addressRegions'
import type { Address } from '../types'

export function AddressStep({
  answers,
  onChange,
  onNext,
  onBack,
}: {
  answers: Address
  onChange: (next: Address) => void
  onNext: () => void
  onBack: () => void
}) {
  const regions = regionsByCountry[answers.country] ?? []

  function setCountry(country: string | null) {
    onChange({ ...answers, country: country ?? '', region: '' })
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-medium">Address</h2>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="onboarding-street">Street</FieldLabel>
          <Input
            id="onboarding-street"
            value={answers.street}
            onChange={(event) => onChange({ ...answers, street: event.target.value })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="onboarding-city">City</FieldLabel>
          <Input
            id="onboarding-city"
            value={answers.city}
            onChange={(event) => onChange({ ...answers, city: event.target.value })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="onboarding-country">Country</FieldLabel>
          <Select value={answers.country || undefined} onValueChange={setCountry}>
            <SelectTrigger id="onboarding-country">
              <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {countries.map((country) => (
                  <SelectItem key={country.id} value={country.id}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="onboarding-region">State / region</FieldLabel>
          <Select
            value={answers.region || undefined}
            onValueChange={(region) => onChange({ ...answers, region: region ?? '' })}
            disabled={regions.length === 0}
          >
            <SelectTrigger id="onboarding-region">
              <SelectValue placeholder="Select a region" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {regions.map((region) => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="onboarding-postal-code">Postal code</FieldLabel>
          <Input
            id="onboarding-postal-code"
            value={answers.postalCode}
            onChange={(event) => onChange({ ...answers, postalCode: event.target.value })}
          />
        </Field>
      </FieldGroup>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext}>Next</Button>
      </div>
    </div>
  )
}
