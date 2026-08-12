import { QueryCache, QueryClient } from '@tanstack/react-query'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
    // Suppress the cache's default onError console logging so tests that
    // exercise a query's error path don't spam stderr.
    queryCache: new QueryCache({
      onError: () => null,
    }),
  })
}
