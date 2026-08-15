import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

type OxlintReport = {
  diagnostics: { code: string; severity: string }[]
}

type OxlintConfig = {
  jsPlugins?: string[]
  rules?: Record<string, unknown>
}

type ProbeOptions = {
  imports?: string
  enable?: string[]
}

const testPlugins = ['vitest', 'jest', 'testing-library']

function probeSource(assertions: string, imports: string): string {
  const body = assertions
    .trim()
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n')

  const header = imports === '' ? '' : `${imports.trim()}\n\n`

  return `${header}describe('probe', () => {\n  it('probe', async () => {\n${body}\n  })\n})\n`
}

function configFor(enable: string[], directory: string): string {
  const path = join(process.cwd(), '.oxlintrc.json')

  if (enable.length === 0) {
    return path
  }

  const config = JSON.parse(readFileSync(path, 'utf8')) as OxlintConfig

  const namespaces = enable.map((rule) => rule.split('/')[0])

  const relocated = {
    ...config,
    jsPlugins: (config.jsPlugins ?? [])
      .filter((plugin) => namespaces.some((namespace) => plugin.includes(namespace)))
      .map((plugin) => join(process.cwd(), 'node_modules', plugin)),
    rules: {
      ...config.rules,
      ...Object.fromEntries(enable.map((rule) => [rule, 'error'])),
    },
  }

  const relocatedPath = join(directory, 'oxlintrc.json')
  writeFileSync(relocatedPath, JSON.stringify(relocated))

  return relocatedPath
}

export function lintTestRules(assertions: string, options: ProbeOptions = {}): string[] {
  const { imports = '', enable = [] } = options

  const directory = mkdtempSync(join(tmpdir(), 'assertion-probe-'))
  const file = join(directory, 'probe.spec.ts')

  try {
    writeFileSync(file, probeSource(assertions, imports))

    const result = spawnSync(
      join(process.cwd(), 'node_modules/.bin/oxlint'),
      ['-c', configFor(enable, directory), '-f', 'json', file],
      { encoding: 'utf8' },
    )

    const report = JSON.parse(result.stdout) as OxlintReport

    const rules = report.diagnostics
      .map((diagnostic) => diagnostic.code.replace(/^(\w[\w-]*)\((.+)\)$/, '$1/$2'))
      .filter((rule) => testPlugins.includes(rule.split('/')[0]))

    return [...new Set(rules)].sort()
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}
