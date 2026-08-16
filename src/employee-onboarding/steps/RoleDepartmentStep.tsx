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
import { Spinner } from '@/components/ui/spinner'
import { onboardingOptionsQueryOptions } from '../api'
import type { Department, Role, RoleAndDepartment } from '../types'

export function RoleDepartmentStep({
  answers,
  onChange,
  onNext,
  onBack,
}: {
  answers: RoleAndDepartment
  onChange: (next: RoleAndDepartment) => void
  onNext: () => void
  onBack: () => void
}) {
  const { data, isPending, isError } = useQuery(onboardingOptionsQueryOptions())

  if (isPending) {
    return <Spinner className="size-6 text-muted-foreground" />
  }

  if (isError) {
    return <p className="text-sm text-destructive">Failed to load role and department options.</p>
  }

  const selectedRole = data.roles.find((role) => role.id === answers.roleId) ?? null
  const selectedDepartment =
    data.departments.find((department) => department.id === answers.departmentId) ?? null

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-medium">Role & department</h2>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="onboarding-role">Role</FieldLabel>
          <Combobox<Role>
            items={data.roles}
            value={selectedRole}
            onValueChange={(role) => onChange({ ...answers, roleId: role?.id ?? '' })}
            itemToStringLabel={(role) => role.name}
          >
            <ComboboxInput id="onboarding-role" placeholder="Select a role" />
            <ComboboxContent>
              <ComboboxEmpty>No roles found.</ComboboxEmpty>
              <ComboboxList>
                {(role: Role) => (
                  <ComboboxItem key={role.id} value={role}>
                    {role.name}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </Field>

        <Field>
          <FieldLabel htmlFor="onboarding-department">Department</FieldLabel>
          <Combobox<Department>
            items={data.departments}
            value={selectedDepartment}
            onValueChange={(department) =>
              onChange({ ...answers, departmentId: department?.id ?? '' })
            }
            itemToStringLabel={(department) => department.name}
          >
            <ComboboxInput id="onboarding-department" placeholder="Select a department" />
            <ComboboxContent>
              <ComboboxEmpty>No departments found.</ComboboxEmpty>
              <ComboboxList>
                {(department: Department) => (
                  <ComboboxItem key={department.id} value={department}>
                    {department.name}
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
        <Button onClick={onNext} disabled={!answers.roleId || !answers.departmentId}>
          Next
        </Button>
      </div>
    </div>
  )
}
