import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { QrCode, Copy, ArrowLeft, Send } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { t, type Lang } from '../lib/strings'
import { formatBytes } from '../lib/format'
import { detectQuotaState } from '../lib/quota'
import { saveBlob } from '../lib/download'
import { isInAppBrowser } from '../lib/inAppBrowser'
import {
  countActiveSends,
  createTransfer,
  maxBytes,
  MAX_ACTIVE_SENDS,
  MAX_QUEUE_FILES,
  nextQueuedSend,
  smoothSpeed,
} from '../engine/transfer'
import type { Peer, QuotaState, RoomId, Transfer } from '../engine/types'
import { connectRoom, type RoomConnection } from '../net/room'
import { PeerList } from './PeerList'
import { TransferItem } from './TransferItem'
import { Dropzone } from './Dropzone'
import { Toasts, type Toast } from './Toast'

interface RoomProps {
  code: RoomId
  nickname: string
  device: Peer['device']
  lang: Lang
  onLeave: () => void
}

const OFFER_TIMEOUT_MS = 60_000
const QUOTA_PROBE_DELAY_MS = 2_500

export function Room({ code, nickname, device, lang, onLeave }: RoomProps) {
  const [peers, setPeers] = useState<Record<string, Peer>>({})
  const [quotaByPeer, setQuotaByPeer] = useState<Record<string, QuotaState>>({})
  const [transfers, setTransfers] = useState<Record<string, Transfer>>({})
  const [connectState, setConnectState] = useState<'connecting' | 'ready'>('connecting')
  const [copied, setCopied] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  const connRef = useRef<RoomConnection | null>(null)
  const fileRefs = useRef(new Map<string, File>())
  const speedRefs = useRef(new Map<string, { lastPct: number; lastTs: number }>())
  const offerTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const toastId = useRef(0)
  const [inApp] = useState(isInAppBrowser)

  const pushToast = useCallback((kind: Toast['kind'], text: string) => {
    const id = ++toastId.current
    setToasts((prev) => {
      const next = [...prev, { id, kind, text }]
      return next.length > 3 ? next.slice(next.length - 3) : next
    })
    if (kind !== 'error') {
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4_000)
    }
  }, [])

  const updateTransfer = useCallback(
    (id: string, patch: Partial<Transfer>) => {
      setTransfers((prev) => {
        const t = prev[id]
        if (!t) return prev
        return { ...prev, [id]: { ...t, ...patch } }
      })
    },
    [],
  )

  const peerName = useCallback(
    (peerId: string) => peers[peerId]?.name || t('unknown_peer', lang, { id: peerId.slice(0, 6) }),
    [peers, lang],
  )

  // --- quota probing ---------------------------------------------------------

  const probeQuota = useCallback((peerId: string) => {
    const pc = connRef.current?.getPeers()[peerId]
    if (!pc) return
    void detectQuotaState(pc).then((q) => {
      if (q !== 'unknown') setQuotaByPeer((prev) => ({ ...prev, [peerId]: q }))
    })
  }, [])

  // --- transfer pump (concurrency cap: MAX_ACTIVE_SENDS) ---------------------

  const pump = useCallback(() => {
    setTransfers((prev) => {
      const conn = connRef.current
      if (!conn) return prev
      let changed = false
      let next = prev
      while (countActiveSends(next) < MAX_ACTIVE_SENDS) {
        const queued = nextQueuedSend(next)
        if (!queued) break
        changed = true
        next = { ...next, [queued.id]: { ...queued, status: 'offered' } }
        const peerId = queued.peerId
        conn.sendOffer(peerId, { id: queued.id, file: queued.file })
        const timer = setTimeout(() => {
          setTransfers((cur) => {
            const t = cur[queued.id]
            if (t && t.status === 'offered') {
              conn.sendCancel(peerId, queued.id, 'timeout')
              return { ...cur, [queued.id]: { ...t, status: 'cancelled' } }
            }
            return cur
          })
        }, OFFER_TIMEOUT_MS)
        offerTimers.current.set(queued.id, timer)
      }
      return changed ? next : prev
    })
  }, [])

  const cancelTransfer = useCallback(
    (id: string) => {
      const conn = connRef.current
      const timer = offerTimers.current.get(id)
      if (timer) {
        clearTimeout(timer)
        offerTimers.current.delete(id)
      }
      setTransfers((prev) => {
        const t = prev[id]
        if (!t) return prev
        if (conn) conn.sendCancel(t.peerId, id)
        return { ...prev, [id]: { ...t, status: 'cancelled' } }
      })
      pump()
    },
    [pump],
  )

  const retryTransfer = useCallback(
    (id: string) => {
      setTransfers((prev) => {
        const t = prev[id]
        if (!t || t.direction !== 'send') return prev
        return { ...prev, [id]: { ...t, status: 'queued', progress: 0, speedBps: 0, error: undefined } }
      })
      pump()
    },
    [pump],
  )

  // --- trystero wiring -------------------------------------------------------

  const handlersRef = useRef({ peers, transfers })
  handlersRef.current = { peers, transfers }

  useEffect(() => {
    const conn = connectRoom(code, {
      onPeerJoin: (peerId) => {
        setConnectState('ready')
        setPeers((prev) => ({
          ...prev,
          [peerId]: { id: peerId, name: '', device: 'desktop', joinedAt: Date.now(), online: true },
        }))
        conn.sendHello({ name: nickname, device })
        setTimeout(() => probeQuota(peerId), QUOTA_PROBE_DELAY_MS)
      },
      onPeerLeave: (peerId) => {
        setPeers((prev) => {
          const p = prev[peerId]
          if (!p) return prev
          return { ...prev, [peerId]: { ...p, online: false } }
        })
        setTransfers((prev) => {
          let changed = false
          const next = { ...prev }
          for (const [id, t] of Object.entries(prev)) {
            if (t.peerId === peerId && (t.status === 'offered' || t.status === 'accepted' || t.status === 'streaming')) {
              next[id] = { ...t, status: 'failed', error: 'peer_left' }
              changed = true
            }
          }
          return changed ? next : prev
        })
      },
      onHello: (meta, peerId) => {
        setPeers((prev) => {
          const p = prev[peerId]
          if (!p) return prev
          return { ...prev, [peerId]: { ...p, name: meta.name, device: meta.device } }
        })
      },
      onOffer: (offer, peerId) => {
        setTransfers((prev) => {
          if (prev[offer.id]) return prev
          return {
            ...prev,
            [offer.id]: createTransfer(
              {
                id: offer.id,
                direction: 'receive',
                file: { name: offer.file.name, size: offer.file.size, mime: offer.file.mime },
                peerId,
              },
              'offered',
            ),
          }
        })
      },
      onAccept: (accept, peerId) => {
        setTransfers((prev) => {
          const t = prev[accept.id]
          if (!t || t.direction !== 'send' || t.status !== 'offered') return prev
          return { ...prev, [accept.id]: { ...t, status: 'accepted' } }
        })
        // begin streaming the file data
        void (async () => {
          const file = fileRefs.current.get(accept.id)
          if (!file) return
          updateTransfer(accept.id, { status: 'streaming' })
          const buf = await file.arrayBuffer()
          const conn = connRef.current
          if (!conn) return
          const speedRef = speedRefs.current
          speedRef.set(accept.id, { lastPct: 0, lastTs: performance.now() })
          conn.sendData(peerId, buf, accept.id, (percent) => {
            const now = performance.now()
            const prevState = speedRef.get(accept.id)
            const size = file.size
            let speed = 0
            if (prevState && now > prevState.lastTs) {
              const deltaPct = percent - prevState.lastPct
              const inst = (deltaPct * size) / ((now - prevState.lastTs) / 1000)
              setTransfers((cur) => {
                const curT = cur[accept.id]
                const prevSpeed = curT?.speedBps ?? 0
                speed = smoothSpeed(prevSpeed, inst)
                return curT ? { ...cur, [accept.id]: { ...curT, progress: percent, speedBps: speed } } : cur
              })
              speedRef.set(accept.id, { lastPct: percent, lastTs: now })
            }
          })
        })()
      },
      onDecline: (decline) => {
        setTransfers((prev) => {
          const t = prev[decline.id]
          if (!t) return prev
          const timer = offerTimers.current.get(decline.id)
          if (timer) {
            clearTimeout(timer)
            offerTimers.current.delete(decline.id)
          }
          return { ...prev, [decline.id]: { ...t, status: 'declined' } }
        })
        pump()
      },
      onDone: (done) => {
        setTransfers((prev) => {
          const t = prev[done.id]
          if (!t) return prev
          const timer = offerTimers.current.get(done.id)
          if (timer) {
            clearTimeout(timer)
            offerTimers.current.delete(done.id)
          }
          return { ...prev, [done.id]: { ...t, status: 'done', progress: 1 } }
        })
        pump()
      },
      onCancel: (cancel) => {
        setTransfers((prev) => {
          const t = prev[cancel.id]
          if (!t) return prev
          const timer = offerTimers.current.get(cancel.id)
          if (timer) {
            clearTimeout(timer)
            offerTimers.current.delete(cancel.id)
          }
          return { ...prev, [cancel.id]: { ...t, status: 'cancelled' } }
        })
        pump()
      },
      onData: (payload, id, peerId) => {
        setTransfers((prev) => {
          const t = prev[id]
          if (!t || t.direction !== 'receive') return prev
          const expected = t.file.size
          if (payload.byteLength !== expected) {
            conn.sendCancel(peerId, id, 'size_mismatch')
            return { ...prev, [id]: { ...t, status: 'failed', error: 'size_mismatch' } }
          }
          const blob = new Blob([payload], { type: t.file.mime || undefined })
          saveBlob(blob, t.file.name)
          conn.sendDone(peerId, id, expected)
          return { ...prev, [id]: { ...t, status: 'done', progress: 1 } }
        })
      },
      onDataProgress: (percent, id, peerId) => {
        if (!id) return
        setTransfers((prev) => {
          const t = prev[id]
          if (!t || t.direction !== 'receive') return prev
          const now = performance.now()
          const prevState = speedRefs.current.get(id)
          let speed = t.speedBps
          if (prevState && now > prevState.lastTs) {
            const deltaPct = percent - prevState.lastPct
            const inst = (deltaPct * t.file.size) / ((now - prevState.lastTs) / 1000)
            speed = smoothSpeed(t.speedBps, inst)
          }
          speedRefs.current.set(id, { lastPct: percent, lastTs: now })
          void peerId
          return { ...prev, [id]: { ...t, progress: percent, speedBps: speed } }
        })
      },
    })
    connRef.current = conn
    setConnectState('connecting')

    return () => {
      for (const timer of offerTimers.current.values()) clearTimeout(timer)
      offerTimers.current.clear()
      conn.leave()
      connRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  // --- file intake -----------------------------------------------------------

  const addFiles = useCallback(
    (files: File[]) => {
      const conn = connRef.current
      const firstPeer = Object.values(peers).find((p) => p.online)
      if (!conn || !firstPeer) {
        pushToast('error', t('waiting_peer', lang))
        return
      }
      const cap = maxBytes()
      const allowed = files.filter((f) => f.size <= cap)
      const over = files.length - allowed.length
      if (over > 0) pushToast('error', t('file_too_big', lang, { max: formatBytes(cap) }))
      if (allowed.length === 0) return
      const existing = Object.keys(transfers).length
      if (existing + allowed.length > MAX_QUEUE_FILES) {
        pushToast('error', t('files_too_many', lang, { n: MAX_QUEUE_FILES }))
        return
      }
      setTransfers((prev) => {
        const next = { ...prev }
        for (const f of allowed) {
          const id = crypto.randomUUID()
          fileRefs.current.set(id, f)
          next[id] = createTransfer({
            id,
            direction: 'send',
            file: { name: f.name, size: f.size, mime: f.type || 'application/octet-stream' },
            peerId: firstPeer.id,
          })
        }
        return next
      })
      // NOTE: no pump() here — files queue up; user triggers send via the Send button.
    },
    [peers, transfers.length, pushToast, lang],
  )

  // --- ui --------------------------------------------------------------------

  const roomUrl = `${location.origin}${location.pathname}#${code}`
  const sendable = Object.values(transfers).filter((t) => t.direction === 'send' && (t.status === 'queued' || t.status === 'failed'))
  const firstPeer = Object.values(peers).find((p) => p.online)

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable — non-fatal
    }
  }

  const transferList = useMemo(() => Object.values(transfers), [transfers])

  return (
    <div className="shell">
      <header className="shell__header">
        <button type="button" className="btn btn--ghost" aria-label={t('back', lang)} onClick={onLeave}>
          <ArrowLeft size={18} aria-hidden />
        </button>
        <span className="mono" style={{ fontSize: 18, fontWeight: 500 }}>
          {code}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn--ghost" aria-label={t('copy', lang)} onClick={copyCode}>
            <Copy size={18} aria-hidden />
            {copied ? t('copied', lang) : null}
          </button>
          <button type="button" className="btn btn--ghost" aria-label={t('qr_title', lang)} onClick={() => setQrOpen(true)}>
            <QrCode size={18} aria-hidden />
          </button>
        </div>
      </header>

      {inApp ? (
        <div className="banner" role="status">
          {t('inapp_banner', lang)}
        </div>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <span className="live-dot" aria-hidden />
        <span className="badge">{t('peers', lang, { n: Object.values(peers).filter((p) => p.online).length })}</span>
        <span className="badge">{t('trust_e2e', lang)}</span>
      </div>

      {connectState === 'connecting' && Object.keys(peers).length === 0 ? (
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
      ) : null}

      {Object.keys(peers).length > 0 ? (
        <>
          <PeerList peers={peers} quotaByPeer={quotaByPeer} lang={lang} />
          <Dropzone lang={lang} onFiles={addFiles} />

          {transferList.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {transferList.map((tr) => (
                <TransferItem
                  key={tr.id}
                  transfer={tr}
                  peerName={peerName(tr.peerId)}
                  lang={lang}
                  onAccept={(id) => {
                    const conn = connRef.current
                    setTransfers((prev) => {
                      const t = prev[id]
                      if (!t) return prev
                      if (conn) conn.sendAccept(t.peerId, id)
                      return { ...prev, [id]: { ...t, status: 'accepted' } }
                    })
                  }}
                  onDecline={(id) => {
                    const conn = connRef.current
                    setTransfers((prev) => {
                      const t = prev[id]
                      if (!t) return prev
                      if (conn) conn.sendDecline(t.peerId, id)
                      return { ...prev, [id]: { ...t, status: 'declined' } }
                    })
                  }}
                  onCancel={cancelTransfer}
                  onRetry={retryTransfer}
                />
              ))}
            </div>
          ) : null}

          {sendable.length > 0 && firstPeer ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => pump()}
              disabled={!sendable.some((t) => t.status === 'queued')}
              style={{ fontSize: 16 }}
            >
              <Send size={18} aria-hidden />
              {t('send_files', lang, { n: sendable.filter((t) => t.status === 'queued').length, peer: firstPeer.name || peerName(firstPeer.id) })}
            </button>
          ) : null}
        </>
      ) : null}

      {qrOpen ? (
        <div className="scrim" role="dialog" aria-modal="true" aria-label={t('qr_title', lang)} onClick={() => setQrOpen(false)}>
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

      <Toasts toasts={toasts} />
    </div>
  )
}
