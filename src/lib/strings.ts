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
  peers: { en: 'Peers: {n}', id: 'Peer: {n}' },
  unknown_peer: { en: 'Peer {id}', id: 'Peer {id}' },
  dropzone_hint: { en: 'Drop files here or browse', id: 'Letakkan file di sini atau pilih' },
  send_files: { en: 'Send {n} file(s) → {peer}', id: 'Kirim {n} file → {peer}' },
  no_files: { en: 'Add files to send', id: 'Tambahkan file untuk dikirim' },
  send: { en: 'Send', id: 'Kirim' },
  accept: { en: 'Accept', id: 'Terima' },
  decline: { en: 'Decline', id: 'Tolak' },
  cancel: { en: 'Cancel', id: 'Batalkan' },
  offer_incoming: {
    en: '{name} · {size} from {peer}',
    id: '{name} · {size} dari {peer}',
  },
  sending: { en: 'Sending', id: 'Mengirim' },
  receiving: { en: 'Receiving', id: 'Menerima' },
  transfer_done: { en: 'Saved · {size}', id: 'Tersimpan · {size}' },
  transfer_failed: { en: 'Transfer failed', id: 'Transfer gagal' },
  peer_left: {
    en: 'Peer left — transfer interrupted',
    id: 'Peer keluar — transfer terputus',
  },
  size_mismatch: {
    en: 'Size mismatch — please resend',
    id: 'Ukuran tidak cocok — kirim ulang',
  },
  timeout: { en: 'No response — cancelled', id: 'Tidak ada respons — dibatalkan' },
  file_too_big: { en: 'Too large — max {max}', id: 'Terlalu besar — maks {max}' },
  files_too_many: { en: 'Max {n} files per batch', id: 'Maks {n} file per batch' },
  inapp_banner: {
    en: 'Open in Safari/Chrome to save files',
    id: 'Buka di Safari/Chrome untuk menyimpan file',
  },
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
