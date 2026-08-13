import { describe, expect, it, vi } from 'vitest'
import { failureOf } from './failureOf'

describe('assertion precision', () => {
  describe('array', () => {
    const employees = [
      { id: 'emp-1', name: 'Ada Lovelace', role: 'engineer' },
      { id: 'emp-2', name: 'Grace Hopper', role: 'engineer' },
      { id: 'emp-3', name: 'Katherine Johnson', role: 'analyst' },
    ]

    it('comparing length through toBe prints two numbers and nothing about the rows', async () => {
      const report = await failureOf(() => {
        // oxlint-disable-next-line vitest/prefer-to-have-length -- the coarse form is the subject
        expect(employees.length).toBe(4)
      })

      expect(report).not.toContain('emp-1')
    })

    it('toHaveLength previews the array, but truncates it after the first entry', async () => {
      const report = await failureOf(() => {
        expect(employees).toHaveLength(4)
      })

      expect(report).toContain('emp-1')
      expect(report).not.toContain('Katherine Johnson')
    })

    it('asserting on the projected rows is the only form that names the missing one', async () => {
      const names = employees.map((employee) => employee.name)

      const report = await failureOf(() => {
        expect(names).toStrictEqual([
          'Ada Lovelace',
          'Grace Hopper',
          'Katherine Johnson',
          'Marie Curie',
        ])
      })

      expect(report).toContain('Katherine Johnson')
      expect(report).toContain('Marie Curie')
    })

    it('includes() reduces membership to a boolean before the matcher sees it', async () => {
      const names = employees.map((employee) => employee.name)

      const report = await failureOf(() => {
        // oxlint-disable-next-line vitest/prefer-to-contain -- the coarse form is the subject
        expect(names.includes('Marie Curie')).toBe(true)
      })

      expect(report).not.toContain('Grace Hopper')
    })

    it('toContain prints the list that was searched', async () => {
      const names = employees.map((employee) => employee.name)

      const report = await failureOf(() => {
        expect(names).toContain('Marie Curie')
      })

      expect(report).toContain('Grace Hopper')
    })
  })

  describe('string', () => {
    const banner = 'Showing 3 of 3 employees'

    it('includes() on a string reports true vs false, not the text', async () => {
      const report = await failureOf(() => {
        // oxlint-disable-next-line vitest/prefer-to-contain -- the coarse form is the subject
        expect(banner.includes('of 4 employees')).toBe(true)
      })

      expect(report).not.toContain('Showing 3 of 3 employees')
    })

    it('toContain prints the string that was searched', async () => {
      const report = await failureOf(() => {
        expect(banner).toContain('of 4 employees')
      })

      expect(report).toContain('Showing 3 of 3 employees')
    })
  })

  describe('number', () => {
    const pagination = { page: 1, totalPages: 1 }

    it('a comparison inside expect() reports the verdict, not the number', async () => {
      const report = await failureOf(() => {
        // oxlint-disable-next-line vitest/prefer-comparison-matcher -- the coarse form is the subject
        expect(pagination.totalPages > 1).toBe(true)
      })

      expect(report).toContain('true')
      expect(report).not.toContain('1')
    })

    it('toBeGreaterThan prints the number that failed the comparison', async () => {
      const report = await failureOf(() => {
        expect(pagination.totalPages).toBeGreaterThan(1)
      })

      expect(report).toContain('1')
    })

    it('toBe on a float fails on a value that is correct to ten decimal places', async () => {
      const averageTenure = 0.1 + 3.2

      const report = await failureOf(() => {
        expect(averageTenure).toBe(3.3)
      })

      expect(report).toContain('3.3000000000000003')
    })

    it('toBeCloseTo states the precision the domain actually needs', async () => {
      const averageTenure = 0.1 + 3.2

      const report = await failureOf(() => {
        expect(averageTenure).toBeCloseTo(3.3, 10)
      })

      expect(report).toBeNull()
    })

    it('toBeDefined passes on NaN, which is what a broken total looks like', async () => {
      const response = { total: Number.NaN }

      const report = await failureOf(() => {
        expect(response.total).toBeDefined()
      })

      expect(report).toBeNull()
    })

    it('toBe names the total that was expected', async () => {
      const response = { total: Number.NaN }

      const report = await failureOf(() => {
        expect(response.total).toBe(4)
      })

      expect(report).toContain('NaN')
    })
  })

  describe('object', () => {
    const employee = { id: 'emp-1', name: 'Ada Lovelace', role: 'viewer' }

    it('checking one field passes while a sibling field is wrong', async () => {
      const report = await failureOf(() => {
        expect(employee.name).toBe('Ada Lovelace')
      })

      expect(report).toBeNull()
    })

    it('asserting the whole record names the field that regressed', async () => {
      const report = await failureOf(() => {
        expect(employee).toStrictEqual({ id: 'emp-1', name: 'Ada Lovelace', role: 'engineer' })
      })

      expect(report).toContain('viewer')
    })

    it('toEqual passes on a key whose value is undefined', async () => {
      const row = { id: 'emp-1', name: 'Ada Lovelace', role: undefined }

      const report = await failureOf(() => {
        // oxlint-disable-next-line vitest/prefer-strict-equal -- the loose form is the subject
        expect(row).toEqual({ id: 'emp-1', name: 'Ada Lovelace' })
      })

      expect(report).toBeNull()
    })

    it('toStrictEqual reports the undefined key that toEqual ignored', async () => {
      const row = { id: 'emp-1', name: 'Ada Lovelace', role: undefined }

      const report = await failureOf(() => {
        expect(row).toStrictEqual({ id: 'emp-1', name: 'Ada Lovelace' })
      })

      expect(report).toContain('role')
    })
  })

  describe('set and map', () => {
    const activeIds = new Set(['emp-1', 'emp-2', 'emp-3'])
    const rolesById = new Map([
      ['emp-1', 'engineer'],
      ['emp-2', 'engineer'],
      ['emp-3', 'analyst'],
    ])

    it('has() reduces the whole set to a boolean', async () => {
      const report = await failureOf(() => {
        expect(activeIds.has('emp-4')).toBe(true)
      })

      expect(report).not.toContain('emp-2')
    })

    it('toContain prints the members the set does hold', async () => {
      const report = await failureOf(() => {
        expect(activeIds).toContain('emp-4')
      })

      expect(report).toContain('emp-2')
    })

    it('get() on a missing key reports undefined without naming the key', async () => {
      const report = await failureOf(() => {
        expect(rolesById.get('emp-4')).toBe('engineer')
      })

      expect(report).not.toContain('emp-4')
    })

    it('asserting the whole map prints every entry it does hold', async () => {
      const report = await failureOf(() => {
        expect(rolesById).toStrictEqual(
          new Map([
            ['emp-1', 'engineer'],
            ['emp-2', 'engineer'],
            ['emp-3', 'analyst'],
            ['emp-4', 'engineer'],
          ]),
        )
      })

      expect(report).toContain('emp-4')
    })
  })

  describe('date', () => {
    const updatedAt = new Date('2026-08-13T09:15:00.000Z')
    const expectedUpdatedAt = new Date('2026-08-13T09:00:00.000Z')

    it('comparing getTime() prints two epoch numbers', async () => {
      const report = await failureOf(() => {
        expect(updatedAt.getTime()).toBe(expectedUpdatedAt.getTime())
      })

      expect(report).not.toContain('2026-08-13T09:00:00.000Z')
    })

    it('asserting the Date itself prints both instants in a readable form', async () => {
      const report = await failureOf(() => {
        expect(updatedAt).toStrictEqual(expectedUpdatedAt)
      })

      expect(report).toContain('2026-08-13T09:00:00.000Z')
    })
  })

  describe('null and undefined', () => {
    it('toBeFalsy passes on an empty string when null was the contract', async () => {
      const selectedId: string | null = ''

      const report = await failureOf(() => {
        expect(selectedId).toBeFalsy()
      })

      expect(report).toBeNull()
    })

    it('toBeNull separates "cleared" from "empty"', async () => {
      const selectedId: string | null = ''

      const report = await failureOf(() => {
        expect(selectedId).toBeNull()
      })

      expect(report).toContain('null')
    })
  })

  describe('spy', () => {
    function trackedFetch() {
      const spy = vi.fn<(url: string) => void>()

      spy('/employees?page=1')
      spy('/employees?page=3')

      return spy
    }

    it('reading a recorded call by index hides every other call', async () => {
      const spy = trackedFetch()

      const report = await failureOf(() => {
        expect(spy.mock.calls[0][0]).toBe('/employees?page=2')
      })

      expect(report).not.toContain('page=3')
    })

    it('toHaveBeenCalledWith prints the calls the spy did receive', async () => {
      const spy = trackedFetch()

      const report = await failureOf(() => {
        expect(spy).toHaveBeenCalledWith('/employees?page=2')
      })

      expect(report).toContain('page=3')
    })

    it('toHaveBeenCalled passes although page 2 was never requested', async () => {
      const spy = trackedFetch()

      const report = await failureOf(() => {
        // oxlint-disable-next-line vitest/prefer-called-with -- the coarse form is the subject
        expect(spy).toHaveBeenCalled()
      })

      expect(report).toBeNull()
    })
  })

  describe('error', () => {
    function parsePage(raw: string): number {
      const parsed = Number.parseInt(raw.trim(), 10)

      if (Number.isNaN(parsed) || parsed < 1) {
        throw new RangeError('page must be a positive integer')
      }

      return parsed
    }

    const missingParam = null as unknown as string

    it('toThrow with no argument passes on an error the code was not supposed to throw', async () => {
      const report = await failureOf(() => {
        // oxlint-disable-next-line vitest/require-to-throw-message -- the coarse form is the subject
        expect(() => parsePage(missingParam)).toThrow()
      })

      expect(report).toBeNull()
    })

    it('toThrow with the expected message prints the error that actually escaped', async () => {
      const report = await failureOf(() => {
        expect(() => parsePage(missingParam)).toThrow('page must be a positive integer')
      })

      expect(report).toContain('trim')
    })
  })

  describe('promise', () => {
    async function loadEmployees(): Promise<string[]> {
      return []
    }

    it('expect inside catch passes when the promise never rejects', async () => {
      const report = await failureOf(async () => {
        try {
          await loadEmployees()
        } catch (error) {
          // oxlint-disable-next-line vitest/no-conditional-expect -- the coarse form is the subject
          expect((error as Error).message).toBe('Failed to load employees')
        }
      })

      expect(report).toBeNull()
    })

    it('rejects.toThrow reports that the promise resolved instead', async () => {
      const report = await failureOf(async () => {
        await expect(loadEmployees()).rejects.toThrow('Failed to load employees')
      })

      expect(report).toContain('resolved')
    })
  })
})
