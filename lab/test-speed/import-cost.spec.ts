import { formatRatio } from './measure'

const WIZARD_ENTRY = '@/employee-onboarding/OnboardingPage'
const LEAF_ENTRY = '@/employee-onboarding/steps/StartDateStep'

async function timeImport(load: () => Promise<unknown>) {
  const start = performance.now()
  await load()
  return performance.now() - start
}

// Every bound here is a ratio against something measured in the same process.
// Absolute milliseconds are not usable: this file runs inside a parallel worker
// pool, and under contention a warm registry lookup can take ~80ms while an
// idle machine resolves the same call in ~0.02ms.
const COLD_OVER_WARM = 50

describe('probe 11 — module graph cost', () => {
  it('shows the first dynamic import in a process is genuinely cold, which is the one honest sample a process can give', async () => {
    const wizardCold = await timeImport(() => import('@/employee-onboarding/OnboardingPage'))
    const repeated = await timeImport(() => import('@/employee-onboarding/OnboardingPage'))
    const coldness = wizardCold / repeated

    console.log(
      `[probe11] first dynamic import of ${WIZARD_ENTRY} = ${wizardCold.toFixed(1)}ms; the immediate repeat = ${repeated.toFixed(3)}ms — ${formatRatio(coldness)}`,
    )
    console.log(
      `[probe11] mechanism: this spec imports the module nowhere statically, so Vite has not transformed its graph when the test body runs. The first import() pays transform plus evaluation for the whole transitive graph; every later one is an ES module registry lookup.`,
    )

    expect(
      coldness,
      'the first dynamic import was not dramatically dearer than an immediate repeat, so this process was not cold and the reading is not a cold-import measurement',
    ).toBeGreaterThan(COLD_OVER_WARM)
  }, 60000)

  it('records why the wizard-vs-leaf comparison cannot be made inside one process: whichever is imported first pays for the shared graph', async () => {
    const wizardWarm = await timeImport(() => import('@/employee-onboarding/OnboardingPage'))
    const leafSecond = await timeImport(() => import('@/employee-onboarding/steps/StartDateStep'))
    const leafOverWarm = leafSecond / Math.max(wizardWarm, Number.EPSILON)

    console.log(
      `[probe11] after the wizard is loaded: a repeat wizard import = ${wizardWarm.toFixed(3)}ms, and ${LEAF_ENTRY} = ${leafSecond.toFixed(3)}ms — ${formatRatio(leafOverWarm)}`,
    )
    console.log(
      `[probe11] measured in the other order in an earlier revision of this spec, the leaf cost ~3x the WIZARD, because the leaf was first and paid for React, TanStack Query and the shadcn/Base UI graph the wizard then found warm. A wizard/leaf ratio from one process therefore measures import ORDER, not graph size — the comparison is made out-of-process instead, by import-cost-oop.sh. See COSTS.md, probe 11, outcome (b).`,
    )

    expect(
      leafOverWarm,
      'importing the leaf after the wizard cost far more than a warm lookup, so the wizard graph does not in fact contain the leaf\'s dependencies — the order confound this probe records is not the real explanation and COSTS.md is wrong about why the in-process comparison fails',
    ).toBeLessThan(COLD_OVER_WARM)
  }, 60000)
})
