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

export interface TransferFile {
  name: string
  size: number // bytes
  mime: string
}

export interface Transfer {
  id: string // crypto.randomUUID()
  direction: 'send' | 'receive'
  file: TransferFile
  status: TransferStatus
  progress: number // 0..1
  speedBps: number // EMA-smoothed
  peerId: string
  quota: QuotaState
  error?: string // copy-deck key
}

export interface RoomState {
  code: RoomId
  selfName: string
  peers: Record<string, Peer>
  transfers: Record<string, Transfer>
  connectState: 'connecting' | 'ready' | 'relay-slow' | 'failed'
}

// net/room.ts — trystero wiring (API verified from trystero v0.25.3, Aug 2 2026)
//   joinRoom({appId: 'paimon_transfer'}, roomId)   — appId REQUIRED, namespaces rooms globally
//   const action = room.makeAction('file')         — returns { send, onReceiveProgress }
//   action.send(payload, { target: [peerIds], metadata, onProgress })
//   action.onReceiveProgress = (percent, {peerId, metadata}) => …
export interface FileOffer {
  id: string
  file: TransferFile
}
export interface FileAccept {
  id: string
}
export interface FileDecline {
  id: string
}
export interface FileDone {
  id: string
  size: number
}
export interface FileCancel {
  id: string
  reason?: string
}
// file:chunk — binary payload + metadata { id } (trystero auto-chunks at 16 KiB, emits progress)
