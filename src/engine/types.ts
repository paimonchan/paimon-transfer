// engine/types.ts — pure data model (DESIGN.md §5). No React, no browser API.

export type RoomId = string // "PT-" + 6 chars (alphabet: 23456789ABCDEFGHJKMNPQRSTUVWXYZ)

export type TransferStatus =
  | 'queued'
  | 'offered'
  | 'accepted'
  | 'streaming'
  | 'done'
  | 'declined'
  | 'cancelled'
  | 'failed'

export type QuotaState = 'lan' | 'internet' | 'unknown' // derived from candidate type

export interface Peer {
  id: string
  name: string
  device: 'desktop' | 'mobile' // UA sniff, best-effort
  joinedAt: number
  online: boolean
}

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

// Wire payloads — must satisfy trystero's DataPayload constraint
// ({ [key: string]: JsonValue }), so they are types with index signatures.
export type TransferFile = {
  name: string
  size: number // bytes
  mime: string
} & { [key: string]: JsonValue }

export interface Transfer {
  id: string // crypto.randomUUID()
  direction: 'send' | 'receive'
  file: TransferFile
  status: TransferStatus
  progress: number // 0..1
  speedBps: number // EMA-smoothed
  peerId: string
  quota: QuotaState
  batchId?: string // sender-side group (one Send click = one batch; used for mobile zip bundling)
  error?: string // copy-deck key
}

export interface RoomState {
  code: RoomId
  selfName: string
  peers: Record<string, Peer>
  transfers: Record<string, Transfer>
  connectState: 'connecting' | 'ready' | 'relay-slow' | 'failed'
}

export type FileOffer = {
  id: string
  file: TransferFile
  batchId: string
} & { [key: string]: JsonValue }

export type FileAccept = { id: string } & { [key: string]: JsonValue }
export type FileDecline = { id: string } & { [key: string]: JsonValue }
export type FileDone = { id: string; size: number } & { [key: string]: JsonValue }
export type FileCancel = { id: string; reason: string | null } & { [key: string]: JsonValue }
