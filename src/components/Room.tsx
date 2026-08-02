import { useState } from 'react'
import { QrCode, Copy, ArrowLeft } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { t, type Lang } from '../lib/strings'
import type { RoomId } from '../engine/types'

interface RoomProps {
  code: RoomId
  lang: Lang
  onLeave: () => void
}

export function Room({ code, lang, onLeave }: RoomProps) {
  const [copied, setCopied] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)

  const roomUrl = `${location.origin}${location.pathname}#${code}`

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable — non-fatal
    }
  }

  return (
    <div className="shell">
      <header className="shell__header">
        <button
          type="button"
          className="btn btn--ghost"
          aria-label={t('back', lang)}
          onClick={onLeave}
        >
          <ArrowLeft size={18} aria-hidden />
        </button>
        <span className="mono" style={{ fontSize: 18, fontWeight: 500 }}>
          {code}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn--ghost"
            aria-label={t('copy', lang)}
            onClick={copyCode}
          >
            <Copy size={18} aria-hidden />
            {copied ? t('copied', lang) : null}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            aria-label={t('qr_title', lang)}
            onClick={() => setQrOpen(true)}
          >
            <QrCode size={18} aria-hidden />
          </button>
        </div>
      </header>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
        <div className="qr-chip">
          <QRCodeSVG value={roomUrl} size={184} level="H" />
        </div>
        <div className="mono" style={{ fontSize: 24, fontWeight: 500 }}>
          {code}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 14 }}>
          <span className="spinner" aria-hidden />
          {t('waiting_peer', lang)}
        </div>
        <div className="trust-line">{t('share_room', lang)}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <span className="live-dot" aria-hidden />
        <span className="badge">{t('room_live', lang)}</span>
        <span className="badge">{t('trust_e2e', lang)}</span>
      </div>

      {qrOpen ? (
        <div
          className="scrim"
          role="dialog"
          aria-modal="true"
          aria-label={t('qr_title', lang)}
          onClick={() => setQrOpen(false)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setQrOpen(false)
            }}
          >
            <div className="qr-chip">
              <QRCodeSVG value={roomUrl} size={224} level="H" />
            </div>
            <div className="mono" style={{ textAlign: 'center', fontSize: 18 }}>
              {code}
            </div>
            <button type="button" className="btn btn--primary" onClick={copyCode}>
              <Copy size={18} aria-hidden />
              {copied ? t('copied', lang) : t('copy', lang)}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setQrOpen(false)}>
              {t('back', lang)}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
