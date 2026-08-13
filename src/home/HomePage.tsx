import { Link } from 'react-router'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export function HomePage() {
  return (
    <section className="p-4">
      <h1 className="text-lg font-medium">Directory</h1>
      <p className="mt-1 text-sm text-muted-foreground">Internal tools and records.</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <Link to="/employees" className="flex flex-col gap-(--card-spacing)">
            <CardHeader>
              <CardTitle>Employee Directory</CardTitle>
              <CardDescription>Browse and filter the team roster.</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-sm font-medium text-primary">Open directory</span>
            </CardContent>
          </Link>
        </Card>
      </div>
    </section>
  )
}
