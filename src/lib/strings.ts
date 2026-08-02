// lib/strings.ts — i18n catalog (DESIGN.md §11). Keys from day 1; EN/ID values.
// UI text must NEVER be inline-hardcoded — always via t().

export type Lang = 'en' | 'id'

const strings: Record<string, { en: string; id: string }> = {
  app_name: { en: 'Paimon Transfer', id: 'Paimon Transfer' },
  onboarding_title: { en: 'How it works', id: 'Cara pakai' },
  onboarding_steps: {
    en: 'Open on 2 devices → scan QR → files go straight, e2e encrypted',
    id: 'Buka di 2 perangkat → scan QR → file langsung terkirim, terenkripsi e2e',
  },
  got_it: { en: 'Got it', id: 'Ngerti' },
  create_room: { en: 'Create a room', id: 'Buat room' },
  join_room: { en: 'Join room', id: 'Gabung room' },
  room_code_placeholder: { en: 'PT-______', id: 'PT-______' },
  trust_e2e: {
    en: 'E2E encrypted · files never touch a server',
    id: 'Terenkripsi e2e · file tidak pernah lewat server',
  },
  trust_lan: {
    en: 'Same WiFi usually = LAN transfer → 0 internet quota',
    id: 'WiFi sama biasanya = transfer LAN → 0 kuota internet',
  },
  back: { en: 'Back', id: 'Kembali' },
  copy: { en: 'Copy', id: 'Salin' },
  copied: { en: 'Copied', id: 'Tersalin' },
  qr_title: { en: 'Scan to join', id: 'Scan untuk gabung' },
  share_room: { en: 'Share the code or QR above', id: 'Bagikan kode atau QR di atas' },
  waiting_peer: { en: 'Waiting for peer…', id: 'Menunggu peer bergabung…' },
  connecting: { en: 'Connecting…', id: 'Menghubungkan…' },
  no_peer_yet: {
    en: 'No one here yet — is the sender waiting in this room?',
    id: 'Belum ada siapa pun — apakah pengirim sudah menunggu di room ini?',
  },
  quota_lan: { en: 'LAN direct · 0 internet quota', id: 'LAN langsung · 0 kuota internet' },
  quota_internet: {
    en: 'Internet · uses ~{size} quota on each side',
    id: 'Internet · menghabiskan ±{size} kuota di tiap perangkat',
  },
  quota_unknown: { en: 'Direct connection', id: 'Koneksi langsung' },
  nickname_title: { en: 'What should others call you?', id: 'Orang lain memanggilmu apa?' },
  nickname_placeholder: { en: 'Your name', id: 'Namamu' },
  continue: { en: 'Continue', id: 'Lanjut' },
  invalid_code: {
    en: 'Room code not recognized — use PT-XXXXXX',
    id: 'Kode room tidak dikenali — gunakan PT-XXXXXX',
  },
  room_live: { en: 'room open', id: 'room terbuka' },
}

export function t(key: string, lang: Lang, vars?: Record<string, string | number>): string {
  const entry = strings[key]
  if (!entry) return key
  let out = entry[lang]
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(`{${k}}`, String(v))
    }
  }
  return out
}

export function detectLang(): Lang {
  try {
    const nav = navigator.language ?? 'en'
    return nav.toLowerCase().startsWith('id') ? 'id' : 'en'
  } catch {
    return 'en'
  }
}
