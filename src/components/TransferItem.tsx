import {
  CheckCircle2,
  XCircle,
  Ban,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
} from 'lucide-react'
import { t, type Lang } from '../lib/strings'
import { formatBytes, formatSpeed, formatEta } from '../lib/format'
import type { Transfer } from '../engine/types'
import { FileIcon } from './FileIcon'

interface TransferItemProps {
  transfer: Transfer
  peerName: string
  lang: Lang
  onAccept: (id: string) => void
  onDecline: (id: string) => void
  onCancel: (id: string) => void
  onRetry: (id: string) => void
}

// DESIGN.md §12 — status is NEVER color-only: icon + text + color (WCAG 1.4.1).
export function TransferItem({
  transfer,
  peerName,
  lang,
  onAccept,
  onDecline,
  onCancel,
  onRetry,
}: TransferItemProps) {
  const { status, direction, file, progress, speedBps } = transfer
  const DirIcon = direction === 'send' ? ArrowUpRight : ArrowDownLeft
  const pct = Math.round(progress * 100)
  const done = status === 'done'
  const failed = status === 'failed'

  return (
    <div className={`transfer-card pop-in${done ? ' transfer-card--done' : ''}${failed ? ' transfer-card--failed' : ''}`} data-status={status}>
      <div className="transfer-card__row">
        <span className="transfer-card__icon" aria-hidden>
          {done ? <CheckCircle2 size={18} style={{ color: 'var(--ok)' }} /> : <FileIcon name={file.name} mime={file.mime} />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="transfer-card__name" title={file.name}>
            {file.name}
          </div>
          <div className="transfer-card__meta">
            {done ? (
              <>
                <CheckCircle2 size={12} aria-hidden style={{ color: 'var(--ok)' }} />
                {direction === 'send'
                  ? `${t('sent_to', lang, { peer: peerName || t('unknown_peer', lang, { id: '…' }) })} · ${formatBytes(file.size)}`
                  : t('transfer_done', lang, { size: formatBytes(file.size) })}
              </>
            ) : (
              <>
                <DirIcon size={12} aria-hidden />
                {formatBytes(file.size)} ·{' '}
                {direction === 'send'
                  ? t('sending_to', lang, { peer: peerName || t('unknown_peer', lang, { id: '…' }) })
                  : t('receiving_from', lang, { peer: peerName || t('unknown_peer', lang, { id: '…' }) })}
              </>
            )}
          </div>
        </div>
      </div>

      {status === 'streaming' ? (
        <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={file.name}>
          <div className="progress-fill" style={{ transform: `scaleX(${progress})` }} />
        </div>
      ) : null}

      {/* done state needs no status row — the green card + check icon + meta
          line already say everything (avoids duplicated "Saved · 180 KB") */}
      {done ? null : (
      <div className="transfer-card__status">
        {status === 'queued' ? (
          <span className="status-text" data-kind="muted">
            <span className="spinner spinner--sm" aria-hidden />
            {t('queued', lang)}
          </span>
        ) : null}

        {status === 'offered' && direction === 'receive' ? (
          <span style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button type="button" className="btn btn--ghost" onClick={() => onDecline(transfer.id)}>
              {t('decline', lang)}
            </button>
            <button type="button" className="btn btn--primary" onClick={() => onAccept(transfer.id)}>
              {t('accept', lang)}
            </button>
          </span>
        ) : null}

        {status === 'offered' && direction === 'send' ? (
          <span className="status-text" data-kind="muted">
            <span className="spinner spinner--sm" aria-hidden />
            {t('handshake', lang)}
          </span>
        ) : null}

        {status === 'accepted' ? (
          <span className="status-text" data-kind="muted">
            <span className="spinner spinner--sm" aria-hidden />
            {t('handshake', lang)}
          </span>
        ) : null}

        {status === 'streaming' ? (
          <>
            <span className="status-text" data-kind="info">
              {pct}% · {formatSpeed(speedBps)} · ETA {formatEta((file.size * (1 - progress)) / Math.max(speedBps, 1))}
            </span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onCancel(transfer.id)}>
              {t('cancel', lang)}
            </button>
          </>
        ) : null}

        {status === 'declined' ? (
          <span className="status-text" data-kind="muted">
            <Ban size={14} aria-hidden />
            {t('declined', lang)}
          </span>
        ) : null}

        {status === 'cancelled' ? (
          <span className="status-text" data-kind="muted">
            <Ban size={14} aria-hidden />
            {t('cancelled', lang)}
          </span>
        ) : null}

        {status === 'failed' ? (
          <>
            <span className="status-text" data-kind="err">
              <XCircle size={14} aria-hidden />
              {transfer.error ? t(transfer.error, lang) : t('transfer_failed', lang)}
            </span>
            {direction === 'send' ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onRetry(transfer.id)}>
                <RotateCcw size={14} aria-hidden />
                {t('retry', lang)}
              </button>
            ) : null}
          </>
        ) : null}
      </div>
      )}
    </div>
  )
}
