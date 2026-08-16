import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { employeesQueryOptions, PER_PAGE } from './api'
import { useDebouncedCallback } from '@/lib/useDebouncedCallback'

function parseSearchParams(searchParams: URLSearchParams) {
  const rawPage = Number(searchParams.get('page'))
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1
  const q = searchParams.get('q') || undefined
  return { page, q }
}

export function EmployeesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { page, q } = parseSearchParams(searchParams)
  const [rawQuery, setRawQuery] = useState(q ?? '')
  const { data, isPending, isError, error, isPlaceholderData } = useQuery(
    employeesQueryOptions(page, q),
  )

  const commitQuery = useDebouncedCallback((next: string) => {
    setSearchParams((current) => {
      const params = new URLSearchParams(current)
      if (next) {
        params.set('q', next)
      } else {
        params.delete('q')
      }
      params.delete('page')
      return params
    })
  }, 300)

  function goToPage(nextPage: number) {
    setSearchParams((current) => {
      const params = new URLSearchParams(current)
      if (nextPage <= 1) {
        params.delete('page')
      } else {
        params.set('page', String(nextPage))
      }
      return params
    })
  }

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex min-h-svh items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Failed to load employees</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'An unexpected error occurred.'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const { total } = data
  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE))
  const rangeStart = total === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const rangeEnd = Math.min(page * PER_PAGE, total)
  const isEmpty = data.data.length === 0

  return (
    <section className="p-4">
      <h1 className="text-lg font-medium">Employees</h1>

      <div className="mt-4 flex flex-col gap-1.5">
        <Label htmlFor="employee-name-filter">Filter by name</Label>
        <Input
          id="employee-name-filter"
          className="max-w-xs"
          value={rawQuery}
          onChange={(event) => {
            setRawQuery(event.target.value)
            commitQuery(event.target.value)
          }}
        />
      </div>

      {isEmpty ? (
        <Empty className="mt-4">
          <EmptyHeader>
            <EmptyTitle>No employees found.</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>{employee.role}</TableCell>
                  <TableCell>{employee.department}</TableCell>
                  <TableCell>{employee.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <p className="mt-2 text-sm text-muted-foreground">
            Showing {rangeStart}-{rangeEnd} of {total}
          </p>
        </>
      )}

      <Pagination className="mt-2">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              disabled={page === 1 || isPlaceholderData}
              onClick={() => goToPage(page - 1)}
            />
          </PaginationItem>
          {Array.from({ length: lastPage }, (_, index) => index + 1).map((pageNumber) => (
            <PaginationItem key={pageNumber}>
              <PaginationLink
                isActive={pageNumber === page}
                disabled={isPlaceholderData}
                onClick={() => goToPage(pageNumber)}
              >
                {pageNumber}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              disabled={page >= lastPage || isPlaceholderData}
              onClick={() => goToPage(page + 1)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </section>
  )
}
