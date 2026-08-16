#!/usr/bin/env bash
# Probe 11, outcome (b) — the out-of-process half.
#
# A cold import can be measured exactly once per process, and whichever module
# is imported first pays for the shared graph (React, TanStack Query, the
# shadcn/Base UI tree). So the wizard-vs-leaf comparison cannot be made inside
# one vitest process — see `import-cost.spec.ts`, which pins that confound.
#
# This script gives each import its own process. `base` imports nothing and
# exists to show the in-process timer starts at zero, i.e. that the wizard and
# leaf numbers below are import cost rather than process startup: startup is
# outside the measured window, not subtracted from it.
#
# Recorded result is in COSTS.md under probe 11. Re-run with:
#   bash lab/test-speed/import-cost-oop.sh [runs]

set -euo pipefail

cd "$(dirname "$0")/../.."

RUNS="${1:-5}"
SCRATCH="lab/test-speed/_oop"

cleanup() {
  rm -f "$SCRATCH-wizard.spec.ts" "$SCRATCH-leaf.spec.ts" "$SCRATCH-base.spec.ts"
}
trap cleanup EXIT

cat > "$SCRATCH-wizard.spec.ts" <<'SPEC'
it('imports the wizard', async () => {
  const t = performance.now()
  await import('@/employee-onboarding/OnboardingPage')
  console.log(`[oop] wizard ${(performance.now() - t).toFixed(1)}`)
  expect(1).toBe(1)
})
SPEC

cat > "$SCRATCH-leaf.spec.ts" <<'SPEC'
it('imports the leaf', async () => {
  const t = performance.now()
  await import('@/employee-onboarding/steps/StartDateStep')
  console.log(`[oop] leaf ${(performance.now() - t).toFixed(1)}`)
  expect(1).toBe(1)
})
SPEC

cat > "$SCRATCH-base.spec.ts" <<'SPEC'
it('imports nothing', async () => {
  const t = performance.now()
  console.log(`[oop] base ${(performance.now() - t).toFixed(1)}`)
  expect(1).toBe(1)
})
SPEC

for _ in $(seq "$RUNS"); do
  for kind in wizard leaf base; do
    npx vitest run "$SCRATCH-$kind.spec.ts" --disable-console-intercept 2>&1 |
      grep -o "\[oop\] $kind [0-9.]*" || echo "[oop] $kind FAILED"
  done
done
