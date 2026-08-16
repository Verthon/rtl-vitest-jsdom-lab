import type { OnboardingDraft } from './types'

export function createDefaultDraft(): OnboardingDraft {
  return {
    personalDetails: { firstName: '', lastName: '', email: '', phone: '' },
    contacts: [],
    address: { street: '', city: '', region: '', postalCode: '', country: '' },
    roleAndDepartment: { roleId: '', departmentId: '' },
    manager: undefined,
    startDate: { date: undefined },
    equipment: { equipmentIds: [] },
    access: { permissionIds: [] },
    documents: { uploads: [] },
  }
}
