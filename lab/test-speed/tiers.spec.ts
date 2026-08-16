import { countTestIds, profileOf, renderTier, TIER_NAMES, tierReady, type TierName } from './tiers'

const EXPECTED: Record<TierName, { nodes: number; interactive: number; roles: Record<string, number> }> = {
  small: {
    nodes: 87,
    interactive: 8,
    roles: { heading: 1, table: 1, row: 11, columnheader: 4, cell: 40, button: 7, textbox: 1 },
  },
  medium: {
    nodes: 62,
    interactive: 15,
    roles: { heading: 12, tab: 10, textbox: 4, button: 1, tablist: 1 },
  },
  huge: {
    nodes: 88,
    interactive: 12,
    roles: { heading: 21, tab: 10, paragraph: 11, button: 2, tablist: 1 },
  },
}

const NODE_BAND = 0.25

describe('tiers', () => {
  it.each(TIER_NAMES)(
    "pins the %s tier's node count and role histogram",
    async (name) => {
      const view = await renderTier(name, tierReady[name])
      const profile = profileOf(view.container)
      const expected = EXPECTED[name]

      console.log(
        `[tier ${name}] nodes=${profile.nodes} interactive=${profile.interactive} roles=${JSON.stringify(profile.roles)}`,
      )

      expect(profile.nodes).toBeGreaterThanOrEqual(Math.floor(expected.nodes * (1 - NODE_BAND)))
      expect(profile.nodes).toBeLessThanOrEqual(Math.ceil(expected.nodes * (1 + NODE_BAND)))

      expect(profile.interactive).toBeGreaterThanOrEqual(
        Math.floor(expected.interactive * (1 - NODE_BAND)),
      )
      expect(profile.interactive).toBeLessThanOrEqual(
        Math.ceil(expected.interactive * (1 + NODE_BAND)),
      )

      for (const [role, count] of Object.entries(expected.roles)) {
        expect(profile.roles[role], `role "${role}" in tier ${name}`).toBe(count)
      }

      view.cleanup()
    },
    30000,
  )

  it('renders each tier deterministically across repeated renders', async () => {
    for (const name of TIER_NAMES) {
      const view = await renderTier(name, tierReady[name])
      const firstProfile = profileOf(view.container)
      view.cleanup()

      const utils = await renderTier(name, tierReady[name])
      const secondProfile = profileOf(utils.container)
      utils.cleanup()

      expect(secondProfile.nodes, `tier ${name} node count drifted between renders`).toBe(
        firstProfile.nodes,
      )
      expect(secondProfile.roles).toStrictEqual(firstProfile.roles)
    }
  }, 30000)

  it('shows the three tiers differ in shape far more than in size', async () => {
    const profiles: Record<string, ReturnType<typeof profileOf>> = {}

    for (const name of TIER_NAMES) {
      const view = await renderTier(name, tierReady[name])
      profiles[name] = profileOf(view.container)
      view.cleanup()
    }

    const counts = TIER_NAMES.map((name) => profiles[name].nodes)
    const sizeSpread = Math.max(...counts) / Math.min(...counts)

    console.log(`[tiers] node-count spread across all three tiers: ${sizeSpread.toFixed(2)}x`)

    expect(
      sizeSpread,
      'the tiers were designed as three sizes; if this exceeds 2x the COSTS.md scaling note is stale',
    ).toBeLessThan(2)

    expect(profiles.small.roles.cell).toBeGreaterThan(20)
    expect(profiles.medium.roles.textbox).toBeGreaterThan(3)
    expect(profiles.huge.roles.heading).toBeGreaterThan(profiles.small.roles.heading)
  }, 30000)

  it('renders no data-testid in any tier — the lab owns its own', async () => {
    for (const name of TIER_NAMES) {
      const view = await renderTier(name, tierReady[name])
      expect(countTestIds(view.container)).toBe(0)
      view.cleanup()
    }
  }, 30000)
})
