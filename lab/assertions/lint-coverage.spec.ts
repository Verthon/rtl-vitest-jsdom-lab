import { describe, expect, it } from 'vitest'
import { lintTestRules } from './lintTestRules'

describe('lint coverage of coarse assertions', () => {
  describe('oxlint already rejects these', () => {
    it('flags a length routed through a number matcher', () => {
      expect(lintTestRules('expect(employees.length).toBe(4)')).toStrictEqual([
        'vitest/prefer-to-have-length',
      ])
    })

    it('flags membership reduced by includes()', () => {
      expect(lintTestRules('expect(names.includes("Marie Curie")).toBe(true)')).toStrictEqual([
        'vitest/prefer-to-contain',
      ])
    })

    it('flags a comparison performed inside expect()', () => {
      expect(lintTestRules('expect(pagination.totalPages > 1).toBe(true)')).toStrictEqual([
        'vitest/prefer-comparison-matcher',
      ])
    })

    it('flags an equality check performed inside expect()', () => {
      expect(lintTestRules('expect(pagination.page === 2).toBe(true)')).toStrictEqual([
        'vitest/prefer-equality-matcher',
      ])
    })

    it('flags a spy asserted without its arguments', () => {
      expect(lintTestRules('expect(fetchSpy).toHaveBeenCalled()')).toStrictEqual([
        'vitest/prefer-called-with',
      ])
    })

    it('flags toThrow() with no expected message', () => {
      expect(lintTestRules('expect(() => parsePage(missing)).toThrow()')).toStrictEqual([
        'vitest/require-to-throw-message',
      ])
    })

    it('flags loose object equality', () => {
      expect(lintTestRules('expect(row).toEqual({ id: "emp-1" })')).toStrictEqual([
        'vitest/prefer-strict-equal',
      ])
    })

    it('flags an expectation reached only through a catch block', () => {
      const assertions = `try {
  await loadEmployees()
} catch (error) {
  expect(error.message).toBe("Failed to load employees")
}`

      expect(lintTestRules(assertions)).toStrictEqual(['vitest/no-conditional-expect'])
    })

    it('flags aliased matchers', () => {
      expect(lintTestRules('expect(fetchSpy).toBeCalledWith("/employees?page=2")')).toStrictEqual([
        'vitest/no-alias-methods',
      ])
    })
  })

  describe('oxlint has nothing to say about these', () => {
    it('says nothing about reading a spy call by index', () => {
      const assertion = 'expect(fetchSpy.mock.calls[0][0]).toBe("/employees?page=2")'

      expect(lintTestRules(assertion)).toStrictEqual([])
    })

    it('says nothing about asserting one field of a record', () => {
      expect(lintTestRules('expect(employee.name).toBe("Ada Lovelace")')).toStrictEqual([])
    })

    it('says nothing about toBeFalsy standing in for toBeNull', () => {
      expect(lintTestRules('expect(selectedId).toBeFalsy()')).toStrictEqual([])
    })

    it('says nothing about toBeDefined standing in for a value', () => {
      expect(lintTestRules('expect(response.total).toBeDefined()')).toStrictEqual([])
    })

    it('says nothing about Set membership reduced by has()', () => {
      expect(lintTestRules('expect(activeIds.has("emp-4")).toBe(true)')).toStrictEqual([])
    })

    it('says nothing about a Map lookup flattened by get()', () => {
      expect(lintTestRules('expect(rolesById.get("emp-4")).toBe("engineer")')).toStrictEqual([])
    })

    it('says nothing about comparing Dates as epoch numbers', () => {
      const assertion = 'expect(updatedAt.getTime()).toBe(expectedUpdatedAt.getTime())'

      expect(lintTestRules(assertion)).toStrictEqual([])
    })

    it('says nothing about exact equality on a float', () => {
      expect(lintTestRules('expect(averageTenure).toBe(3.3)')).toStrictEqual([])
    })

    it('is satisfied by toHaveLength, which still prints a truncated array', () => {
      expect(lintTestRules('expect(employees).toHaveLength(4)')).toStrictEqual([])
    })
  })
})
