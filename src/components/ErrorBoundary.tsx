import {
  ErrorBoundary as ReactErrorBoundary,
  type FallbackProps,
} from "react-error-boundary"
import { AlertTriangleIcon } from "lucide-react"

import {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertAction,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

function ErrorFallback({ error, resetErrorBoundary }: Readonly<FallbackProps>) {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Alert variant="destructive" className="max-w-md">
        <AlertTriangleIcon />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "An unexpected error occurred."}
        </AlertDescription>
        <AlertAction>
          <Button size="sm" variant="outline" onClick={resetErrorBoundary}>
            Try again
          </Button>
        </AlertAction>
      </Alert>
    </div>
  )
}

export function ErrorBoundary({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ReactErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ReactErrorBoundary>
  )
}
