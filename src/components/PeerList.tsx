import { Smartphone, Laptop, Zap } from 'lucide-react'
import { t, type Lang } from '../lib/strings'
import type { Peer, QuotaState } from '../engine/types'
import { QuotaIndicator } from './QuotaIndicator'

interface PeerListProps {
  peers: Record<string, Peer>
  quotaByPeer: Record<string, QuotaState>
  lang: Lang
}

export function PeerList({ peers, quotaByPeer, lang }: PeerListProps) {
  const list = Object.values(peers)
  if (list.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {list.map((peer) => (
        <div className="card card--peer" key={peer.id}>
          <span className="peer-avatar" aria-hidden>
            {peer.device === 'mobile' ? <Smartphone size={16} /> : <Laptop size={16} />}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{peer.name || t('unknown_peer', lang, { id: peer.id.slice(0, 6) })}</div>
            {quotaByPeer[peer.id] === 'lan' ? (
              <div className="peer-lan">
                <Zap size={12} aria-hidden />
                {t('quota_lan', lang)}
              </div>
            ) : null}
          </div>
          <QuotaIndicator quota={quotaByPeer[peer.id] ?? 'unknown'} lang={lang} />
        </div>
      ))}
    </div>
  )
}
