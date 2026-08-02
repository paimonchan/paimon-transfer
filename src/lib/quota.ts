// lib/quota.ts — QuotaState detection from the selected ICE candidate pair.
// Source of truth: RTCPeerConnection.getStats() → 'candidate-pair' (succeeded)
// → candidate type. host = LAN (0 internet quota); srflx/prflx/relay = internet;
// anything unreadable (Safari hides candidateType) → 'unknown' (neutral label).

import type { QuotaState } from '../engine/types'

export async function detectQuotaState(pc: RTCPeerConnection): Promise<QuotaState> {
  try {
    const stats = await pc.getStats()
    let pair: RTCStats | null = null
    stats.forEach((r) => {
      if (!pair && r.type === 'candidate-pair' && r.state === 'succeeded') pair = r
    })
    if (!pair) return 'unknown'
    const local = stats.get((pair as RTCStats & { localCandidateId: string }).localCandidateId)
    const remote = stats.get((pair as RTCStats & { remoteCandidateId: string }).remoteCandidateId)
    const types = [local, remote]
      .map((c) => (c as RTCStats & { candidateType?: string } | undefined)?.candidateType)
      .filter(Boolean) as string[]
    if (types.includes('relay') || types.includes('srflx') || types.includes('prflx')) return 'internet'
    if (types.includes('host')) return 'lan'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}
