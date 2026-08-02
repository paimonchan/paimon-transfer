// engine/roomCode.ts — pure room code logic. No React, no browser API.

import type { RoomId } from './types'

// Typo-safe alphabet: no 0/O, 1/I/L. 32 chars → 32^6 ≈ 1.07B combinations.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const CODE_LEN = 6

export function generateRoomCode(): RoomId {
  const chars = new Array<string>(CODE_LEN)
  const rand = new Uint32Array(CODE_LEN)
  crypto.getRandomValues(rand)
  for (let i = 0; i < CODE_LEN; i++) {
    chars[i] = ALPHABET[rand[i] % ALPHABET.length]
  }
  return `PT-${chars.join('')}`
}

export function isValidRoomCode(input: string): boolean {
  return /^PT-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/.test(input.trim().toUpperCase())
}

export function normalizeRoomInput(input: string): string {
  // Accepts "pt-7k3f9a", "PT7K3F9A", "7K3F9A" → "PT-7K3F9A"
  const t = input.trim().toUpperCase().replace(/^PT[- ]?/, '')
  if (t.length !== CODE_LEN) return input.trim().toUpperCase()
  return `PT-${t}`
}
