// lib/download.ts — save Blob to disk with platform fallbacks.
// iOS Safari ignores `download` attr for blob URLs → open in new tab.
// In-app browsers (Telegram/IG/etc.) can't save at all → UI banner handles that.
//
// Downloads are serialized through a small queue (400ms gap): Chromium drops
// programmatic download clicks that fire back-to-back (verified in e2e, Aug 2026).

let saveChain: Promise<void> = Promise.resolve()

function enqueue(fn: () => void): void {
  saveChain = saveChain
    .then(() => new Promise((r) => setTimeout(r, 400)))
    .then(fn)
    .catch(() => {
      // a failed save must not break the queue for later saves
    })
}

export function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  enqueue(() => {
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
  })
}
