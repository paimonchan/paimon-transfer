import { Smartphone, Laptop } from 'lucide-react'
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
        <div className={`card card--peer pop-in${peer.online ? '' : ' card--peer-offline'}`} key={peer.id}>
          <span className="peer-avatar" aria-hidden>
            {peer.device === 'mobile' ? <Smartphone size={16} /> : <Laptop size={16} />}
            <span className={`peer-avatar__dot${peer.online ? '' : ' peer-avatar__dot--off'}`} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{peer.name || t('unknown_peer', lang, { id: peer.id.slice(0, 6) })}</div>
            {!peer.online ? (
              <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{t('peer_left_room', lang)}</div>
            ) : null}
          </div>
          {peer.online ? <QuotaIndicator quota={quotaByPeer[peer.id] ?? 'unknown'} lang={lang} /> : null}
        </div>
      ))}
    </div>
  )
}
