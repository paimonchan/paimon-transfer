import { History, Trash2, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { t, type Lang } from '../lib/strings'
import { formatBytes } from '../lib/format'
import type { HistoryEntry } from '../lib/history'
import { FileIcon } from './FileIcon'

interface HistoryListProps {
  lang: Lang
  entries: HistoryEntry[]
  onClear: () => void
}

export function HistoryList({ lang, entries, onClear }: HistoryListProps) {
  if (entries.length === 0) return null
  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
          <History size={16} aria-hidden />
          {t('recent', lang)}
        </span>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClear}>
          <Trash2 size={13} aria-hidden />
          {t('clear', lang)}
        </button>
      </div>
      <ul className="history-list">
        {entries.map((e) => (
          <li key={e.id} className="history-list__item">
            <span className="transfer-card__icon" aria-hidden>
              <FileIcon name={e.name} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="transfer-card__name" title={e.name}>
                {e.name}
              </span>
              <span className="transfer-card__meta">
                {formatBytes(e.size)} · {e.peer || '—'}
              </span>
            </span>
            {e.direction === 'send' ? (
              <ArrowUpRight size={15} aria-hidden style={{ color: 'var(--text-faint)' }} />
            ) : (
              <ArrowDownLeft size={15} aria-hidden style={{ color: 'var(--text-faint)' }} />
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
