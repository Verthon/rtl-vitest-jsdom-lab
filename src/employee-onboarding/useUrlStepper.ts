import { useNavigate, useParams } from 'react-router'
import type { Get, Step, StepperDefinition } from '@stepperize/react'

export function useUrlStepper<Steps extends readonly Step[]>(
  wizard: StepperDefinition<Steps>,
  basePath: string,
) {
  const { step: rawStep } = useParams<{ step: string }>()
  const navigate = useNavigate()
  const parsedStep = wizard.parseStep(rawStep)

  function onStepChange(id: Get.Id<Steps>) {
    navigate(`${basePath}/${id}`)
  }

  function onInvalidStep() {
    navigate(`${basePath}/${wizard.steps[0].id}`, { replace: true })
  }

  const stepper = wizard.useStepper({ step: rawStep, onStepChange, onInvalidStep })

  return { stepper, step: parsedStep, onStepChange }
}
