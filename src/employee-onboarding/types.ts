export type PersonalDetails = {
  firstName: string
  lastName: string
  email: string
  phone: string
}

export type ContactPerson = {
  id: string
  name: string
  relationship: string
  phone: string
}

export type Address = {
  street: string
  city: string
  region: string
  postalCode: string
  country: string
}

export type RoleAndDepartment = {
  roleId: string
  departmentId: string
}

export type Manager = {
  id: string
  name: string
  title: string
}

export type StartDate = {
  date: string | undefined
}

export type Equipment = {
  equipmentIds: string[]
}

export type AccessGroupId = 'engineering' | 'finance' | 'people'

export type AccessPermissionId =
  | 'source-control'
  | 'ci-cd'
  | 'cloud-console'
  | 'expense-reports'
  | 'payroll-admin'
  | 'directory-read'
  | 'directory-write'

export type Access = {
  permissionIds: AccessPermissionId[]
}

export type DocumentUpload = {
  id: string
  fileName: string
}

export type Documents = {
  uploads: DocumentUpload[]
}

export type OnboardingDraft = {
  personalDetails: PersonalDetails
  contacts: ContactPerson[]
  address: Address
  roleAndDepartment: RoleAndDepartment
  manager: Manager | undefined
  startDate: StartDate
  equipment: Equipment
  access: Access
  documents: Documents
}

export type Role = {
  id: string
  name: string
}

export type Department = {
  id: string
  name: string
}

export type EquipmentOption = {
  id: string
  name: string
}

export type AccessPermission = {
  id: AccessPermissionId
  groupId: AccessGroupId
  name: string
}

export type AccessGroup = {
  id: AccessGroupId
  name: string
}

export type OnboardingOptions = {
  roles: Role[]
  departments: Department[]
  equipment: EquipmentOption[]
  accessGroups: AccessGroup[]
  accessPermissions: AccessPermission[]
}

export type CreateEmployeeRequest = {
  personalDetails: PersonalDetails
  contacts: ContactPerson[]
  address: Address
  roleId: string
  departmentId: string
  managerId: string
  startDate: string
  equipmentIds: string[]
  permissionIds: AccessPermissionId[]
  documentFileNames: string[]
}

export type CreateEmployeeResponse = {
  id: string
  firstName: string
  lastName: string
  email: string
  startDate: string
}
