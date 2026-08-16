import { useMutation, useQuery } from '@tanstack/react-query'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { onboardingOptionsQueryOptions, submitOnboarding } from '../api'
import type { CreateEmployeeRequest, CreateEmployeeResponse, OnboardingDraft } from '../types'

function buildRequest(draft: OnboardingDraft): CreateEmployeeRequest {
  return {
    personalDetails: draft.personalDetails,
    contacts: draft.contacts,
    address: draft.address,
    roleId: draft.roleAndDepartment.roleId,
    departmentId: draft.roleAndDepartment.departmentId,
    managerId: draft.manager?.id ?? '',
    startDate: draft.startDate.date ?? '',
    equipmentIds: draft.equipment.equipmentIds,
    permissionIds: draft.access.permissionIds,
    documentFileNames: draft.documents.uploads.map((upload) => upload.fileName),
  }
}

export function ReviewStep({
  draft,
  onBack,
  onSubmitted,
}: {
  draft: OnboardingDraft
  onBack: () => void
  onSubmitted: (response: CreateEmployeeResponse) => void
}) {
  const { data: options, isPending, isError } = useQuery(onboardingOptionsQueryOptions())
  const mutation = useMutation({
    mutationFn: submitOnboarding,
    onSuccess: onSubmitted,
  })

  if (isPending) {
    return <Spinner className="size-6 text-muted-foreground" />
  }

  if (isError) {
    return <p className="text-sm text-destructive">Failed to load review options.</p>
  }

  const role = options.roles.find((candidate) => candidate.id === draft.roleAndDepartment.roleId)
  const department = options.departments.find(
    (candidate) => candidate.id === draft.roleAndDepartment.departmentId,
  )
  const equipmentNames = draft.equipment.equipmentIds.map(
    (id) => options.equipment.find((candidate) => candidate.id === id)?.name ?? id,
  )
  const permissionNames = draft.access.permissionIds.map(
    (id) => options.accessPermissions.find((candidate) => candidate.id === id)?.name ?? id,
  )

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-medium">Review & submit</h2>

      <Card>
        <CardContent className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">Personal details</h3>
          <p className="text-sm text-muted-foreground">
            {draft.personalDetails.firstName} {draft.personalDetails.lastName}
          </p>
          <p className="text-sm text-muted-foreground">{draft.personalDetails.email}</p>
          <p className="text-sm text-muted-foreground">{draft.personalDetails.phone}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">Emergency contacts</h3>
          {draft.contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">None added.</p>
          ) : (
            draft.contacts.map((contact) => (
              <p key={contact.id} className="text-sm text-muted-foreground">
                {contact.name} ({contact.relationship}) — {contact.phone}
              </p>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">Address</h3>
          <p className="text-sm text-muted-foreground">
            {draft.address.street}, {draft.address.city}, {draft.address.region}{' '}
            {draft.address.postalCode}, {draft.address.country}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">Role & department</h3>
          <p className="text-sm text-muted-foreground">
            {role?.name ?? 'Not selected'} — {department?.name ?? 'Not selected'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">Manager</h3>
          <p className="text-sm text-muted-foreground">
            {draft.manager ? `${draft.manager.name} — ${draft.manager.title}` : 'Not selected'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">Start date</h3>
          <p className="text-sm text-muted-foreground">{draft.startDate.date ?? 'Not selected'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">Equipment</h3>
          <p className="text-sm text-muted-foreground">
            {equipmentNames.length > 0 ? equipmentNames.join(', ') : 'None selected'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">Access & permissions</h3>
          <p className="text-sm text-muted-foreground">
            {permissionNames.length > 0 ? permissionNames.join(', ') : 'None selected'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">Documents</h3>
          {draft.documents.uploads.length === 0 ? (
            <p className="text-sm text-muted-foreground">None uploaded.</p>
          ) : (
            draft.documents.uploads.map((upload) => (
              <p key={upload.id} className="text-sm text-muted-foreground">
                {upload.fileName}
              </p>
            ))
          )}
        </CardContent>
      </Card>

      {mutation.isError && (
        <Alert variant="destructive">
          <AlertTitle>Failed to submit</AlertTitle>
          <AlertDescription>
            {mutation.error instanceof Error ? mutation.error.message : 'An unexpected error occurred.'}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} disabled={mutation.isPending}>
          Back
        </Button>
        <Button
          onClick={() => mutation.mutate(buildRequest(draft))}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <Spinner className="size-4" /> : 'Submit'}
        </Button>
      </div>
    </div>
  )
}
