import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldGroup, FieldLabel, FieldSet } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { onboardingOptionsQueryOptions } from '../api'
import type { Equipment } from '../types'

export function EquipmentStep({
  answers,
  onChange,
  onNext,
  onBack,
}: {
  answers: Equipment
  onChange: (next: Equipment) => void
  onNext: () => void
  onBack: () => void
}) {
  const { data, isPending, isError } = useQuery(onboardingOptionsQueryOptions())

  if (isPending) {
    return <Spinner className="size-6 text-muted-foreground" />
  }

  if (isError) {
    return <p className="text-sm text-destructive">Failed to load equipment options.</p>
  }

  function toggle(id: string, checked: boolean) {
    onChange({
      equipmentIds: checked
        ? [...answers.equipmentIds, id]
        : answers.equipmentIds.filter((equipmentId) => equipmentId !== id),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-medium">Equipment</h2>

      <FieldSet>
        <FieldGroup>
          {data.equipment.map((item) => (
            <Field key={item.id} orientation="horizontal">
              <Checkbox
                id={`equipment-${item.id}`}
                checked={answers.equipmentIds.includes(item.id)}
                onCheckedChange={(checked) => toggle(item.id, checked === true)}
              />
              <FieldLabel htmlFor={`equipment-${item.id}`}>{item.name}</FieldLabel>
            </Field>
          ))}
        </FieldGroup>
      </FieldSet>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext}>Next</Button>
      </div>
    </div>
  )
}
