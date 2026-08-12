import { useState } from 'react'
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
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { employeesQueryOptions, PER_PAGE } from './api'

export function EmployeesPage() {
  const [page, setPage] = useState(1)
  const { data, isPending, isError, error, isPlaceholderData } = useQuery(
    employeesQueryOptions(page),
  )

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

  const goToPage = (nextPage: number) => {
    if (nextPage < 1) return
    setPage(nextPage)
  }

  return (
    <section className="p-4">
      <h1 className="text-lg font-medium">Employees</h1>

      {data.data.length === 0 ? (
        <>
          <Empty className="mt-4">
            <EmptyHeader>
              <EmptyTitle>No employees found</EmptyTitle>
              <EmptyDescription>No employees found.</EmptyDescription>
            </EmptyHeader>
          </Empty>
          <Pagination className="mt-2">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  aria-disabled={page === 1}
                  onClick={(event) => {
                    event.preventDefault()
                    if (page === 1) return
                    goToPage(page - 1)
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </>
      ) : (
        <>
          <Table className="mt-4" aria-busy={isPlaceholderData}>
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
            Showing {rangeStart}–{rangeEnd} of {total}
          </p>

          <Pagination className={isPlaceholderData ? 'mt-2 opacity-50' : 'mt-2'}>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  aria-disabled={page === 1}
                  onClick={(event) => {
                    event.preventDefault()
                    if (page === 1) return
                    goToPage(page - 1)
                  }}
                />
              </PaginationItem>
              {Array.from({ length: lastPage }, (_, index) => index + 1).map((pageNumber) => (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    href="#"
                    isActive={pageNumber === page}
                    onClick={(event) => {
                      event.preventDefault()
                      goToPage(pageNumber)
                    }}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  aria-disabled={page * PER_PAGE >= total}
                  onClick={(event) => {
                    event.preventDefault()
                    if (page * PER_PAGE >= total) return
                    goToPage(page + 1)
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </>
      )}
    </section>
  )
}
