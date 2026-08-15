import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

type MockProbe = {
  component: string
  mock: string
}

const tsconfig = {
  compilerOptions: {
    target: 'es2023',
    lib: ['ES2023', 'DOM'],
    jsx: 'react-jsx',
    module: 'esnext',
    moduleResolution: 'bundler',
    types: [],
    skipLibCheck: true,
    strict: true,
    noEmit: true,
    paths: {
      react: [join(process.cwd(), 'node_modules/@types/react/index.d.ts')],
      'react/jsx-runtime': [
        join(process.cwd(), 'node_modules/@types/react/jsx-runtime.d.ts'),
      ],
    },
  },
  include: ['./component.tsx', './mock.tsx'],
}

export function typecheckMock({ component, mock }: MockProbe): string[] {
  const directory = mkdtempSync(join(tmpdir(), 'component-mock-probe-'))

  try {
    writeFileSync(join(directory, 'component.tsx'), component)
    writeFileSync(join(directory, 'mock.tsx'), mock)
    writeFileSync(join(directory, 'tsconfig.json'), JSON.stringify(tsconfig))

    const result = spawnSync(
      join(process.cwd(), 'node_modules/.bin/tsc'),
      ['-p', join(directory, 'tsconfig.json')],
      { encoding: 'utf8' },
    )

    return result.stdout
      .split('\n')
      .filter((line) => line.includes('error TS'))
      .map((line) => line.replace(/^.*?(error TS\d+)/, '$1').trim())
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}
