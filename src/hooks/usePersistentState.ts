// hooks/usePersistentState.ts — generic localStorage-backed state (paimon-tools pattern).

import { useEffect, useState } from 'react'

export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // storage full / private mode — non-fatal
    }
  }, [key, value])

  return [value, setValue] as const
}
