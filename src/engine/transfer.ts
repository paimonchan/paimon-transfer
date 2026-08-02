// engine/transfer.ts — pure transfer helpers + caps. No React, no browser API
// beyond navigator (device detection is a pure function of UA).

import type { Transfer, TransferFile } from './types'

export const MAX_ACTIVE_SENDS = 3
export const MAX_QUEUE_FILES = 100
export const DESKTOP_MAX_BYTES = 2 * 1024 ** 3
export const MOBILE_MAX_BYTES = 1 * 1024 ** 3

export function maxBytes(): number {
  return isMobileDevice() ? MOBILE_MAX_BYTES : DESKTOP_MAX_BYTES
}

export function isMobileDevice(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    (navigator.maxTouchPoints > 0 || /Mobi|Android|iPhone/i.test(navigator.userAgent))
  )
}

export function createTransfer(
  input: {
    id: string
    direction: 'send' | 'receive'
    file: TransferFile
    peerId: string
    batchId?: string
  },
  status: Transfer['status'] = 'queued',
): Transfer {
  return {
    ...input,
    status,
    progress: 0,
    speedBps: 0,
    quota: 'unknown',
  }
}

export function isActiveStatus(status: Transfer['status']): boolean {
  return status === 'offered' || status === 'accepted' || status === 'streaming'
}

// Files currently occupying a concurrency slot (sender side)
export function countActiveSends(transfers: Record<string, Transfer>): number {
  let n = 0
  for (const t of Object.values(transfers)) {
    if (t.direction === 'send' && isActiveStatus(t.status)) n++
  }
  return n
}

export function nextQueuedSend(transfers: Record<string, Transfer>): Transfer | null {
  for (const t of Object.values(transfers)) {
    if (t.direction === 'send' && t.status === 'queued') return t
  }
  return null
}

// EMA-smoothed speed from progress deltas (α = 0.3)
export function smoothSpeed(prevBps: number, instBps: number): number {
  if (!Number.isFinite(instBps) || instBps <= 0) return prevBps
  return prevBps === 0 ? instBps : 0.3 * instBps + 0.7 * prevBps
}
