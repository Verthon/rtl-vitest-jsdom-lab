import { describe, expect, it } from 'vitest'
import { typecheckMock } from './typecheckMock'

const original = `
export type BadgeProps = { label: string; tone: 'ok' | 'warn' }
export function Badge({ label, tone }: BadgeProps) {
  return <span data-tone={tone}>{label}</span>
}
`

const renamed = `
export type BadgeProps = { text: string; tone: 'ok' | 'warn' }
export function Badge({ text, tone }: BadgeProps) {
  return <span data-tone={tone}>{text}</span>
}
`

const widened = `
export type BadgeProps = { label: string; tone: 'ok' | 'warn'; icon: string }
export function Badge({ label, tone, icon }: BadgeProps) {
  return <span data-tone={tone} data-icon={icon}>{label}</span>
}
`

const untypedMock = `
import type { BadgeProps } from './component'
export const Badge = ({ label }: { label: string }) => <span>{label}</span>
export type Unused = BadgeProps
`

const typedMock = `
import type { BadgeProps } from './component'
export const Badge = ({ label }: BadgeProps) => <span>{label}</span>
`

describe('a component mock drifts from the component it replaces', () => {
  it('compiles either way while the props still match', () => {
    expect(typecheckMock({ component: original, mock: untypedMock })).toStrictEqual([])
    expect(typecheckMock({ component: original, mock: typedMock })).toStrictEqual([])
  })

  it('leaves an inline-typed mock green after the real prop is renamed', () => {
    expect(typecheckMock({ component: renamed, mock: untypedMock })).toStrictEqual([])
  })

  it('reddens a mock typed against the real props when that prop is renamed', () => {
    expect(typecheckMock({ component: renamed, mock: typedMock })).toStrictEqual([
      "error TS2339: Property 'label' does not exist on type 'BadgeProps'.",
    ])
  })

  it('stays green in both forms when the real component gains a required prop', () => {
    expect(typecheckMock({ component: widened, mock: untypedMock })).toStrictEqual([])
    expect(typecheckMock({ component: widened, mock: typedMock })).toStrictEqual([])
  })
})
