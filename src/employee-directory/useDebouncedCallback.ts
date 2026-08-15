import { useEffect, useRef } from 'react'

export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delayMs: number,
): (...args: A) => void {
  const fnRef = useRef(fn)
  fnRef.current = fn

  const delayRef = useRef(delayMs)
  delayRef.current = delayMs

  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current)
  }, [])

  const debouncedRef = useRef((...args: A) => {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => fnRef.current(...args), delayRef.current)
  })

  return debouncedRef.current
}
