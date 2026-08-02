// lib/download.ts — save Blob to disk with platform fallbacks.
// iOS Safari ignores `download` attr for blob URLs → open in new tab.
// In-app browsers (Telegram/IG/etc.) can't save at all → UI banner handles that.

export function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
  if (isIos) {
    window.open(url, '_blank')
  } else {
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
