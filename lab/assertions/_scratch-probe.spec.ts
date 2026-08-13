import { describe, expect, it } from 'vitest'
import { lintTestRules } from './lintTestRules'

const tl = [
  'testing-library/no-node-access',
  'testing-library/prefer-presence-queries',
  'testing-library/await-async-queries',
  'testing-library/no-wait-for-multiple-assertions',
  'testing-library/prefer-screen-queries',
]

const rtlImport = "import { screen, waitFor } from '@testing-library/react'"

const candidates: [string, string][] = [
  ['container.querySelector', 'expect(container.querySelector(".row")).toBeInTheDocument()'],
  ['parentElement', 'expect(screen.getByText("Ada").parentElement).toHaveClass("row")'],
  ['queryBy truthy', 'expect(screen.queryByRole("alert")).toBeTruthy()'],
  ['queryBy inTheDocument', 'expect(screen.queryByRole("alert")).toBeInTheDocument()'],
  ['getBy inTheDocument', 'expect(screen.getByRole("row")).toBeInTheDocument()'],
  ['getBy toBeDefined', 'expect(screen.getByRole("row")).toBeDefined()'],
  ['getAllBy length', 'expect(screen.getAllByRole("row")).toHaveLength(4)'],
  ['innerHTML', 'expect(row.innerHTML).toContain("Ada")'],
  ['unawaited findBy', 'const row = screen.findByRole("row")\nexpect(row).toBeDefined()'],
  [
    'waitFor multiple',
    'await waitFor(() => {\n  expect(screen.getByRole("row")).toBeInTheDocument()\n  expect(screen.getByRole("table")).toBeInTheDocument()\n})',
  ],
]

describe('scratch dom probe', () => {
  it('prints bare vs imported, rules enabled', { timeout: 120_000 }, () => {
    const rows = candidates.map(([label, snippet]) => {
      const bare = lintTestRules(snippet, { enable: tl })
      const imported = lintTestRules(snippet, { enable: tl, imports: rtlImport })

      return `${label}\n  bare:     ${bare.join(', ') || '(silent)'}\n  imported: ${imported.join(', ') || '(silent)'}`
    })

    console.log(`\n${rows.join('\n')}\n`)

    expect(rows).not.toHaveLength(0)
  })
})
