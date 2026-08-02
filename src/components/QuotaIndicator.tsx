import { Zap, Globe, Cable } from 'lucide-react'
import { t, type Lang } from '../lib/strings'
import { formatBytes } from '../lib/format'
import type { QuotaState } from '../engine/types'

interface QuotaIndicatorProps {
  quota: QuotaState
  sizeBytes?: number
  lang: Lang
}

// DESIGN.md §13.6 — 3 states; neutral label when unknown (Safari never reports candidate type).
export function QuotaIndicator({ quota, sizeBytes, lang }: QuotaIndicatorProps) {
  if (quota === 'lan') {
    return (
      <span className="quota-badge" data-quota="lan">
        <Zap size={13} aria-hidden />
        {t('quota_lan', lang)}
      </span>
    )
  }
  if (quota === 'internet' && sizeBytes !== undefined) {
    return (
      <span className="quota-badge" data-quota="internet">
        <Globe size={13} aria-hidden />
        {t('quota_internet', lang, { size: formatBytes(sizeBytes) })}
      </span>
    )
  }
  return (
    <span className="quota-badge" data-quota="unknown">
      <Cable size={13} aria-hidden />
      {t('quota_unknown', lang)}
    </span>
  )
}
