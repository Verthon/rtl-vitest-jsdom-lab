export const countries = [
  { id: 'US', name: 'United States' },
  { id: 'CA', name: 'Canada' },
  { id: 'GB', name: 'United Kingdom' },
] as const

export const regionsByCountry: Record<string, { id: string; name: string }[]> = {
  US: [
    { id: 'CA', name: 'California' },
    { id: 'NY', name: 'New York' },
    { id: 'TX', name: 'Texas' },
    { id: 'WA', name: 'Washington' },
  ],
  CA: [
    { id: 'ON', name: 'Ontario' },
    { id: 'BC', name: 'British Columbia' },
    { id: 'QC', name: 'Quebec' },
  ],
  GB: [
    { id: 'ENG', name: 'England' },
    { id: 'SCT', name: 'Scotland' },
    { id: 'WLS', name: 'Wales' },
  ],
}
