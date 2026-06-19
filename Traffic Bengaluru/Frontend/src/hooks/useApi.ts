import { useState, useEffect, useCallback, useRef } from 'react'

// ─── useApi ───────────────────────────────────────────────────────────────────
// Generic async data-fetching hook with loading, error, and refresh support.
// Usage:
//   const { data, loading, error, refetch } = useApi(fetchOverview)

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): UseApiState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcherRef.current()
      setData(result)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Request failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, refetch: load }
}

// ─── useApiWithParams ─────────────────────────────────────────────────────────
// Variant that accepts params and re-fetches when params change.
// Usage:
//   const { data, loading, error } = useApiWithParams(fetchHotspots, { limit: 75 })

export function useApiWithParams<T, P>(
  fetcher: (params: P) => Promise<T>,
  params: P
): UseApiState<T> {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useApi(() => fetcher(params), [JSON.stringify(params)])
}

// ─── useInterval ──────────────────────────────────────────────────────────────
// Safely runs a callback on a repeating interval, cleaning up on unmount.
// Usage:
//   useInterval(refetch, 30_000)  // poll every 30 seconds

export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback)
  savedCallback.current = callback

  useEffect(() => {
    if (delay === null) return
    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}

// ─── usePollingApi ────────────────────────────────────────────────────────────
// Combines useApi + useInterval for auto-refreshing data.
// Usage:
//   const { data, loading } = usePollingApi(fetchOverview, 30_000)

export function usePollingApi<T>(
  fetcher: () => Promise<T>,
  intervalMs: number
): UseApiState<T> {
  const state = useApi(fetcher)
  useInterval(state.refetch, intervalMs)
  return state
}
