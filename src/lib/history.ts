// lib/history.ts — localStorage transfer history (last 12 entries).

const KEY = 'pt-history'

export interface HistoryEntry {
  id: string
  name: string
  size: number
  direction: 'send' | 'receive'
  peer: string
  at: number
  ok: boolean
}

const MAX_ENTRIES = 12

export function addHistory(entry: HistoryEntry): void {
  try {
    const cur = getHistory().filter((e) => e.id !== entry.id)
    cur.unshift(entry)
    localStorage.setItem(KEY, JSON.stringify(cur.slice(0, MAX_ENTRIES)))
  } catch {
    // storage unavailable — history is best-effort
  }
}

export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : []
  } catch {
    return []
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
