import type { Step, StepperDefinition } from '@stepperize/react'
import { cn } from '@/lib/utils'
import type { useUrlStepper } from './useUrlStepper'

export function StepperProgress<Steps extends readonly (Step & { title: string })[]>({
  wizard,
  urlStepper,
}: {
  wizard: StepperDefinition<Steps>
  urlStepper: ReturnType<typeof useUrlStepper<Steps>>
}) {
  const { Stepper } = wizard

  return (
    <Stepper.Root step={urlStepper.step} onStepChange={urlStepper.onStepChange}>
      <Stepper.List className="flex items-center gap-2">
        <Stepper.Items>
          {(step) => (
            <Stepper.Item key={step.id} step={step.id} className="flex items-center gap-2">
              <Stepper.Trigger
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2 py-1 text-sm',
                  'data-[status=active]:font-medium data-[status=active]:text-foreground',
                  'data-[status=previous]:text-muted-foreground',
                  'data-[status=upcoming]:text-muted-foreground/60',
                )}
              >
                <Stepper.Indicator className="flex size-6 items-center justify-center rounded-full border text-xs" />
                <Stepper.Title>{step.title}</Stepper.Title>
              </Stepper.Trigger>
            </Stepper.Item>
          )}
        </Stepper.Items>
      </Stepper.List>
    </Stepper.Root>
  )
}
