import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Field, FieldLabel } from '@/components/ui/field'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { StartDate } from '../types'

const MIN_START_DATE = new Date(2026, 0, 1)

function isWeekend(date: Date) {
  const day = date.getDay()
  return day === 0 || day === 6
}

function parseDate(value: string | undefined) {
  if (!value) return undefined
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function StartDateStep({
  answers,
  onChange,
  onNext,
  onBack,
}: {
  answers: StartDate
  onChange: (next: StartDate) => void
  onNext: () => void
  onBack: () => void
}) {
  const selected = parseDate(answers.date)

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-medium">Start date</h2>

      <Field>
        <FieldLabel htmlFor="onboarding-start-date">Start date</FieldLabel>
        <Popover>
          <PopoverTrigger
            render={
              <Button id="onboarding-start-date" variant="outline">
                {selected ? formatDate(selected) : 'Choose a date'}
              </Button>
            }
          />
          <PopoverContent>
            <Calendar
              mode="single"
              selected={selected}
              defaultMonth={selected ?? MIN_START_DATE}
              onSelect={(date) => onChange({ date: date ? formatDate(date) : undefined })}
              disabled={[{ before: MIN_START_DATE }, isWeekend]}
            />
          </PopoverContent>
        </Popover>
      </Field>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!answers.date}>
          Next
        </Button>
      </div>
    </div>
  )
}
