import { describe, expect, it } from 'vitest'
import { lintTestRules } from './lintTestRules'

const rtlImport = "import { render, screen, waitFor, fireEvent } from '@testing-library/react'"

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

    it('flags a queryBy asserted for presence', () => {
      const assertion = 'expect(screen.queryByRole("alert")).toBeInTheDocument()'

      expect(lintTestRules(assertion, { imports: rtlImport })).toStrictEqual([
        'testing-library/prefer-presence-queries',
      ])
    })

    it('flags a queryBy reduced to a truthiness check', () => {
      const assertion = 'expect(screen.queryByRole("alert")).toBeTruthy()'

      expect(lintTestRules(assertion, { imports: rtlImport })).toStrictEqual([
        'testing-library/prefer-presence-queries',
      ])
    })

    it('flags a node reached through querySelector', () => {
      const assertion = 'expect(container.querySelector(".row")).toBeInTheDocument()'

      expect(lintTestRules(assertion, { imports: rtlImport })).toStrictEqual([
        'testing-library/no-node-access',
      ])
    })

    it('flags a node reached through parentElement', () => {
      const assertion = 'expect(screen.getByText("Ada").parentElement).toBeInTheDocument()'

      expect(lintTestRules(assertion, { imports: rtlImport })).toStrictEqual([
        'testing-library/no-node-access',
      ])
    })

    it('flags an unawaited findBy', () => {
      const assertions = 'const row = screen.findByRole("row")\nexpect(row).toBeDefined()'

      expect(lintTestRules(assertions, { imports: rtlImport })).toStrictEqual([
        'testing-library/await-async-queries',
      ])
    })

    it('flags queries destructured from render', () => {
      const assertions =
        'const { getByRole } = render(element)\nexpect(getByRole("row")).toBeInTheDocument()'

      expect(lintTestRules(assertions, { imports: rtlImport })).toStrictEqual([
        'testing-library/prefer-screen-queries',
      ])
    })

    it('flags fireEvent standing in for userEvent', () => {
      const assertion = 'fireEvent.click(screen.getByRole("button"))'

      expect(lintTestRules(assertion, { imports: rtlImport })).toStrictEqual([
        'testing-library/prefer-user-event',
        'vitest/expect-expect',
      ])
    })

    it('flags a side effect performed inside waitFor', () => {
      const assertions = `await waitFor(() => {
  fireEvent.click(screen.getByRole("button"))
  expect(screen.getByText("Ada")).toBeInTheDocument()
})`

      expect(lintTestRules(assertions, { imports: rtlImport })).toStrictEqual([
        'testing-library/no-wait-for-side-effects',
        'testing-library/prefer-user-event',
      ])
    })

    it('flags a waitFor wrapping a single getBy, which findBy expresses directly', () => {
      const assertion = 'await waitFor(() => expect(screen.getByRole("row")).toBeInTheDocument())'

      expect(lintTestRules(assertion, { imports: rtlImport })).toStrictEqual([
        'testing-library/prefer-find-by',
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

  describe('oxlint has nothing to say about these DOM forms', () => {
    it('says nothing about asserting a getBy result exists', () => {
      const assertion = 'expect(screen.getByRole("row")).toBeInTheDocument()'

      expect(lintTestRules(assertion, { imports: rtlImport })).toStrictEqual([])
    })

    it('says nothing about toBeDefined on a getBy result', () => {
      const assertion = 'expect(screen.getByRole("row")).toBeDefined()'

      expect(lintTestRules(assertion, { imports: rtlImport })).toStrictEqual([])
    })

    it('says nothing about reading checked instead of toBeChecked', () => {
      const assertion = 'expect(screen.getByRole("checkbox").checked).toBe(true)'

      expect(lintTestRules(assertion, { imports: rtlImport })).toStrictEqual([])
    })

    it('says nothing about reading disabled instead of toBeDisabled', () => {
      const assertion = 'expect(screen.getByRole("button").disabled).toBe(true)'

      expect(lintTestRules(assertion, { imports: rtlImport })).toStrictEqual([])
    })

    it('says nothing about reading value instead of toHaveValue', () => {
      const assertion = 'expect(screen.getByRole("textbox").value).toBe("Ada")'

      expect(lintTestRules(assertion, { imports: rtlImport })).toStrictEqual([])
    })

    it('says nothing about getAttribute instead of toHaveAttribute', () => {
      const assertion = 'expect(screen.getByRole("link").getAttribute("href")).toBe("/employees")'

      expect(lintTestRules(assertion, { imports: rtlImport })).toStrictEqual([])
    })

    it('says nothing about reading textContent instead of toHaveTextContent', () => {
      const assertion = 'expect(screen.getByRole("row").textContent).toBe("Ada Lovelace")'

      expect(lintTestRules(assertion, { imports: rtlImport })).toStrictEqual([])
    })

    it('says nothing about asserting against innerHTML', () => {
      const assertion = 'expect(screen.getByRole("row").innerHTML).toContain("Ada")'

      expect(lintTestRules(assertion, { imports: rtlImport })).toStrictEqual([])
    })

    it('says nothing about classList.contains instead of toHaveClass', () => {
      const assertion = 'expect(screen.getByRole("row").classList.contains("active")).toBe(true)'

      expect(lintTestRules(assertion, { imports: rtlImport })).toStrictEqual([])
    })

    it('says nothing about counting rows instead of naming them', () => {
      const assertion = 'expect(screen.getAllByRole("row")).toHaveLength(4)'

      expect(lintTestRules(assertion, { imports: rtlImport })).toStrictEqual([])
    })

    it('says nothing about toBeInTheDocument where toBeVisible was meant', () => {
      const assertion = 'expect(screen.getByRole("dialog")).toBeInTheDocument()'

      expect(lintTestRules(assertion, { imports: rtlImport })).toStrictEqual([])
    })

    it('says nothing about several assertions inside one waitFor', () => {
      const assertions = `await waitFor(() => {
  expect(screen.getByRole("row")).toBeInTheDocument()
  expect(screen.getByText("Ada")).toBeInTheDocument()
})`

      expect(lintTestRules(assertions, { imports: rtlImport })).toStrictEqual([])
    })
  })

  describe('correct forms the skill must not flag', () => {
    it('says nothing about a queryBy asserted for absence', () => {
      const assertion = 'expect(screen.queryByRole("alert")).not.toBeInTheDocument()'

      expect(lintTestRules(assertion, { imports: rtlImport })).toStrictEqual([])
    })

    it('says nothing about toBeVisible', () => {
      const assertion = 'expect(screen.getByRole("dialog")).toBeVisible()'

      expect(lintTestRules(assertion, { imports: rtlImport })).toStrictEqual([])
    })
  })
})
