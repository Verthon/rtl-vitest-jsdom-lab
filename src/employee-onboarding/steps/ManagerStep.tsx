import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { useDebouncedCallback } from '@/lib/useDebouncedCallback'
import { onboardingManagersQueryOptions } from '../api'
import type { Manager } from '../types'

export function ManagerStep({
  answers,
  onChange,
  onNext,
  onBack,
}: {
  answers: Manager | undefined
  onChange: (next: Manager | undefined) => void
  onNext: () => void
  onBack: () => void
}) {
  const [query, setQuery] = useState(answers?.name ?? '')
  const [debouncedQuery, setDebouncedQuery] = useState(answers?.name ?? '')
  const commitQuery = useDebouncedCallback(setDebouncedQuery, 300)
  const { data, isFetching } = useQuery(onboardingManagersQueryOptions(debouncedQuery))

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-medium">Manager</h2>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="onboarding-manager">Search for a manager</FieldLabel>
          <Combobox<Manager>
            items={data ?? []}
            value={answers ?? null}
            onValueChange={(manager) => onChange(manager ?? undefined)}
            itemToStringLabel={(manager) => manager.name}
            inputValue={query}
            onInputValueChange={(value) => {
              setQuery(value)
              commitQuery(value)
            }}
          >
            <ComboboxInput id="onboarding-manager" placeholder="Type a name" />
            <ComboboxContent>
              <ComboboxEmpty>{isFetching ? 'Searching…' : 'No managers found.'}</ComboboxEmpty>
              <ComboboxList>
                {(manager: Manager) => (
                  <ComboboxItem key={manager.id} value={manager}>
                    {manager.name} — {manager.title}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </Field>
      </FieldGroup>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!answers}>
          Next
        </Button>
      </div>
    </div>
  )
}
