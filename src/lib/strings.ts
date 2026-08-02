// lib/strings.ts — i18n catalog (DESIGN.md §11). Keys from day 1; EN/ID values.
// UI text must NEVER be inline-hardcoded — always via t().

export type Lang = 'en' | 'id'

const strings: Record<string, { en: string; id: string }> = {
  app_name: { en: 'Paimon Transfer', id: 'Paimon Transfer' },
  onboarding_title: { en: 'How it works', id: 'Cara pakai' },
  onboarding_step_1: {
    en: 'Open this page on both devices',
    id: 'Buka halaman ini di kedua perangkat',
  },
  onboarding_step_2: {
    en: 'One creates a room, the other joins via QR or code',
    id: 'Satu perangkat buat room, lainnya gabung via QR atau kode',
  },
  onboarding_step_3: {
    en: 'Files go straight between devices — nothing is stored',
    id: 'File terkirim langsung antar perangkat — tidak ada yang disimpan',
  },
  got_it: { en: 'Got it', id: 'Ngerti' },
  create_room: { en: 'Create a room', id: 'Buat room' },
  join_room: { en: 'Join room', id: 'Gabung room' },
  room_code_placeholder: { en: 'PT-A1B2C3', id: 'PT-A1B2C3' },
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
  dropzone_title: { en: 'Drop files here', id: 'Letakkan file di sini' },
  dropzone_sub: {
    en: 'or tap to browse from this device',
    id: 'atau ketuk untuk pilih dari perangkat ini',
  },
  copy_code: { en: 'Copy room code', id: 'Salin kode room' },
  copy_link: { en: 'Copy invite link', id: 'Salin tautan undangan' },
  appearing_as: { en: 'Appearing as', id: 'Tampil sebagai' },
  edit: { en: 'Edit', id: 'Ubah' },
  close: { en: 'Close', id: 'Tutup' },
  section_profile: { en: 'Profile', id: 'Profil' },
  section_network: { en: 'Network', id: 'Jaringan' },
  peer_left_room: { en: 'Left the room', id: 'Keluar room' },
  sent_to: { en: 'Sent to {peer}', id: 'Terkirim ke {peer}' },
  waiting_peer_alt: {
    en: 'Files go straight between devices — nothing is stored',
    id: 'File langsung antar perangkat — tidak ada yang disimpan',
  },
  passphrase_show: { en: 'Show passphrase', id: 'Lihat frasa sandi' },
  passphrase_hide: { en: 'Hide passphrase', id: 'Sembunyikan frasa sandi' },
  send_files: { en: 'Send {n} files → {peer}', id: 'Kirim {n} file → {peer}' },
  send_files_one: { en: 'Send {n} file → {peer}', id: 'Kirim {n} file → {peer}' },
  send_files_multi: { en: 'Send {n} files to {m} peers', id: 'Kirim {n} file ke {m} peer' },
  queued: { en: 'Queued', id: 'Antre' },
  batch_progress: {
    en: '{done}/{total} files · {transferred} / {totalSize}',
    id: '{done}/{total} file · {transferred} / {totalSize}',
  },
  batch_queued: {
    en: '{done}/{total} files · {totalSize} total',
    id: '{done}/{total} file · {totalSize} total',
  },
  zip_saved: { en: 'Saved · {n} files (.zip)', id: 'Tersimpan · {n} file (.zip)' },
  switching_signal: { en: 'Switching signaling…', id: 'Mengganti sinyal…' },
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
  sending_to: { en: 'Sending to {peer}', id: 'Mengirim ke {peer}' },
  receiving_from: { en: 'Receiving from {peer}', id: 'Menerima dari {peer}' },
  handshake: { en: 'Preparing transfer…', id: 'Menyiapkan transfer…' },
  receiving: { en: 'Receiving', id: 'Menerima' },
  transfer_done: { en: 'Saved · {size}', id: 'Tersimpan · {size}' },
  cancelled: { en: 'Cancelled', id: 'Dibatalkan' },
  declined: { en: 'Declined', id: 'Ditolak' },
  relay_slow: { en: 'Relay is slow — still trying…', id: 'Relay lambat — masih mencoba…' },
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
  settings: { en: 'Settings', id: 'Pengaturan' },
  language: { en: 'Language', id: 'Bahasa' },
  strategy: { en: 'Signaling', id: 'Sinyal' },
  strategy_auto: { en: 'Auto', id: 'Otomatis' },
  strategy_nostr: { en: 'Nostr only', id: 'Nostr saja' },
  strategy_mqtt: { en: 'MQTT only', id: 'MQTT saja' },
  relays: { en: 'Nostr relays', id: 'Relay Nostr' },
  relays_hint: {
    en: 'Comma-separated wss:// URLs (advanced)',
    id: 'URL wss:// dipisah koma (lanjutan)',
  },
  save: { en: 'Save', id: 'Simpan' },
  passphrase: { en: 'Passphrase', id: 'Frasa sandi' },
  passphrase_optional: { en: 'Passphrase (optional)', id: 'Frasa sandi (opsional)' },
  passphrase_hint: {
    en: 'Only people with the passphrase can join this room',
    id: 'Hanya yang punya frasa sandi yang bisa gabung room ini',
  },
  room_protected: { en: 'Protected', id: 'Terlindungi' },
  no_peer_hint: {
    en: 'No peer found — the room may be passphrase-protected. Enter the passphrase and retry:',
    id: 'Peer tidak ditemukan — mungkin room dilindungi frasa sandi. Masukkan frasa sandi lalu coba lagi:',
  },
  retry: { en: 'Retry', id: 'Coba lagi' },
  recent: { en: 'Recent transfers', id: 'Transfer terakhir' },
  clear: { en: 'Clear', id: 'Bersihkan' },
  no_history: { en: 'No transfers yet', id: 'Belum ada transfer' },
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
