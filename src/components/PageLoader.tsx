import { Spinner } from "@/components/ui/spinner"

export function PageLoader() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <Spinner className="size-8 text-muted-foreground" />
    </div>
  )
}
