import { CheckboxGroup } from '@base-ui/react/checkbox-group'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldGroup, FieldLabel, FieldSet } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { onboardingOptionsQueryOptions } from '../api'
import type { Access, AccessGroup, AccessPermission, AccessPermissionId } from '../types'

function AccessGroupFields({
  group,
  permissions,
  answers,
  onChange,
}: {
  group: AccessGroup
  permissions: AccessPermission[]
  answers: AccessPermissionId[]
  onChange: (next: AccessPermissionId[]) => void
}) {
  const groupPermissionIds = permissions.map((permission) => permission.id)
  const checkedInGroup = answers.filter((id) => groupPermissionIds.includes(id))

  return (
    <CheckboxGroup
      allValues={groupPermissionIds}
      value={checkedInGroup}
      onValueChange={(nextCheckedInGroup) => {
        const outsideGroup = answers.filter((id) => !groupPermissionIds.includes(id))
        onChange([...outsideGroup, ...(nextCheckedInGroup as AccessPermissionId[])])
      }}
    >
      <Field orientation="horizontal">
        <Checkbox aria-label={group.name} parent />
        <FieldLabel aria-hidden="true">{group.name}</FieldLabel>

        <FieldGroup className="ml-6 basis-full">
          {permissions.map((permission) => (
            <Field key={permission.id} orientation="horizontal">
              <Checkbox aria-label={permission.name} value={permission.id} />
              <FieldLabel aria-hidden="true">{permission.name}</FieldLabel>
            </Field>
          ))}
        </FieldGroup>
      </Field>
    </CheckboxGroup>
  )
}

export function AccessStep({
  answers,
  onChange,
  onNext,
  onBack,
}: {
  answers: Access
  onChange: (next: Access) => void
  onNext: () => void
  onBack: () => void
}) {
  const { data, isPending, isError } = useQuery(onboardingOptionsQueryOptions())

  if (isPending) {
    return <Spinner className="size-6 text-muted-foreground" />
  }

  if (isError) {
    return <p className="text-sm text-destructive">Failed to load access options.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-medium">Access & permissions</h2>

      <FieldSet>
        <FieldGroup>
          {data.accessGroups.map((group) => (
            <AccessGroupFields
              key={group.id}
              group={group}
              permissions={data.accessPermissions.filter(
                (permission) => permission.groupId === group.id,
              )}
              answers={answers.permissionIds}
              onChange={(next) => onChange({ permissionIds: next })}
            />
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
