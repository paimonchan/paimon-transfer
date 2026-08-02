// lib/inAppBrowser.ts — detect embedded browsers that can't save downloads.

const IN_APP_PATTERNS = /Telegram|Instagram|Line\/|FBAN|FBAV|Twitter|WhatsApp|Snapchat|Messenger/i

export function isInAppBrowser(): boolean {
  try {
    return IN_APP_PATTERNS.test(navigator.userAgent)
  } catch {
    return false
  }
}
