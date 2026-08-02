import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { QrCode, Copy, ArrowLeft, Send, Languages, Settings as SettingsIcon, Lock } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import JSZip from 'jszip'
import { t, type Lang } from '../lib/strings'
import { formatBytes } from '../lib/format'
import { detectQuotaState } from '../lib/quota'
import { saveBlob } from '../lib/download'
import { isInAppBrowser } from '../lib/inAppBrowser'
import {
  countActiveSends,
  createTransfer,
  isMobileDevice,
  maxBytes,
  MAX_ACTIVE_SENDS,
  MAX_QUEUE_FILES,
  nextQueuedSend,
  smoothSpeed,
} from '../engine/transfer'
import type { Peer, QuotaState, RoomId, Transfer } from '../engine/types'
import { connectRoom, type RoomConnection, type SignalStrategy } from '../net/room'
import { addHistory } from '../lib/history'
import { PeerList } from './PeerList'
import { TransferItem } from './TransferItem'
import { Dropzone } from './Dropzone'
import { Toasts, type Toast } from './Toast'
import { Settings, type StrategySetting } from './Settings'

interface RoomProps {
  code: RoomId
  nickname: string
  device: Peer['device']
  lang: Lang
  setLang: (l: Lang) => void
  passphrase: string
  onPassphrase: (p: string) => void
  strategySetting: StrategySetting
  relays: string
  onNickname: (name: string) => void
  onStrategy: (s: StrategySetting) => void
  onRelays: (r: string) => void
  onLeave: () => void
}

const OFFER_TIMEOUT_MS = 60_000
const QUOTA_PROBE_DELAY_MS = 2_500
const SLOW_RELAY_MS = 8_000
const FALLBACK_STRATEGY_MS = 15_000
const NO_PEER_GUIDANCE_MS = 10_000
const PASS_HINT_MS = 12_000

export function Room({
  code,
  nickname,
  device,
  lang,
  setLang,
  passphrase,
  onPassphrase,
  strategySetting,
  relays,
  onNickname,
  onStrategy,
  onRelays,
  onLeave,
}: RoomProps) {
  const [peers, setPeers] = useState<Record<string, Peer>>({})
  const [quotaByPeer, setQuotaByPeer] = useState<Record<string, QuotaState>>({})
  const [transfers, setTransfers] = useState<Record<string, Transfer>>({})
  const [connectState, setConnectState] = useState<'connecting' | 'ready' | 'relay-slow'>('connecting')
  const [showNoPeer, setShowNoPeer] = useState(false)
  const [showPassHint, setShowPassHint] = useState(false)
  // effective strategy: URL override ?s= wins, else settings, 'auto' resolves to nostr + fallback
  const [strategy, setStrategy] = useState<SignalStrategy>(() => {
    const s = new URLSearchParams(location.search).get('s')
    if (s === 'nostr' || s === 'mqtt') return s
    return strategySetting === 'auto' ? 'nostr' : strategySetting
  })
  const [copied, setCopied] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  // rotating waiting copy — keeps the empty state alive instead of static text
  const [waitCopy, setWaitCopy] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => setWaitCopy((i) => (i + 1) % 3), 4500)
    return () => clearInterval(iv)
  }, [])

  const connRef = useRef<RoomConnection | null>(null)
  const fileRefs = useRef(new Map<string, File>())
  const speedRefs = useRef(new Map<string, { lastPct: number; lastTs: number }>())
  const offerTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noPeerTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const passHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const historyWritten = useRef(new Set<string>())
  // receiver-side mobile zip bundling: batchId → received blobs (id → {blob, name})
  const batchesRef = useRef(new Map<string, Map<string, { blob: Blob; name: string }>>())
  const toastId = useRef(0)
  const [inApp] = useState(isInAppBrowser)

  const relayUrls = useMemo(
    () =>
      relays
        .split(',')
        .map((s) => s.trim())
        .filter((s) => /^wss?:\/\//.test(s)),
    [relays],
  )

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
        conn.sendOffer(peerId, {
          id: queued.id,
          file: queued.file,
          batchId: queued.batchId ?? '',
        })
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

  // --- mobile zip bundling (DESIGN.md §15-11, altersend pattern) ---------------

  const flushBatch = useCallback(
    (batchId: string) => {
      const blobs = batchesRef.current.get(batchId)
      if (!blobs) return
      batchesRef.current.delete(batchId)
      for (const { blob, name } of blobs.values()) saveBlob(blob, name)
    },
    [],
  )

  const tryBuildZip = useCallback(
    (batchId: string, batchTransfers: Transfer[]) => {
      const blobs = batchesRef.current.get(batchId)
      if (!blobs || blobs.size === 0) return
      const zip = new JSZip()
      for (const x of batchTransfers) {
        const entry = blobs.get(x.id)
        if (entry) zip.file(x.file.name, entry.blob)
      }
      void zip
        .generateAsync({ type: 'blob' })
        .then((out) => {
          saveBlob(out, `${code}-${batchTransfers.length}files.zip`)
          pushToast('ok', t('zip_saved', lang, { n: batchTransfers.length }))
        })
        .finally(() => batchesRef.current.delete(batchId))
    },
    [code, lang, pushToast],
  )

  // --- trystero wiring -------------------------------------------------------

  const handlersRef = useRef({ peers, transfers })
  handlersRef.current = { peers, transfers }

  useEffect(() => {
    const conn = connectRoom(
      code,
      {
        onPeerJoin: (peerId) => {
          setConnectState('ready')
          setShowNoPeer(false)
          if (slowTimer.current) clearTimeout(slowTimer.current)
          if (fallbackTimer.current) clearTimeout(fallbackTimer.current)
          if (noPeerTimer.current) clearTimeout(noPeerTimer.current)
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
                  batchId: offer.batchId,
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
            const connNow = connRef.current
            if (!connNow) return
            const speedRef = speedRefs.current
            speedRef.set(accept.id, { lastPct: 0, lastTs: performance.now() })
            connNow.sendData(peerId, buf, accept.id, (percent) => {
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
          const tr = handlersRef.current.transfers[done.id]
          if (tr && !historyWritten.current.has(done.id)) {
            historyWritten.current.add(done.id)
            const p = handlersRef.current.peers[tr.peerId]
            addHistory({
              id: done.id,
              name: tr.file.name,
              size: tr.file.size,
              direction: 'send',
              peer: p?.name || t('unknown_peer', lang, { id: tr.peerId.slice(0, 6) }),
              at: Date.now(),
              ok: true,
            })
          }
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
            if (t.direction === 'receive' && t.batchId) flushBatch(t.batchId)
            return { ...prev, [cancel.id]: { ...t, status: 'cancelled' } }
          })
          pump()
        },
        onData: (payload, id, peerId) => {
          setTransfers((prev) => {
            const tr = prev[id]
            if (!tr || tr.direction !== 'receive') return prev
            const expected = tr.file.size
            if (payload.byteLength !== expected) {
              conn.sendCancel(peerId, id, 'size_mismatch')
              return { ...prev, [id]: { ...tr, status: 'failed', error: 'size_mismatch' } }
            }
            const blob = new Blob([payload], { type: tr.file.mime || undefined })
            conn.sendDone(peerId, id, expected)
            const next: Record<string, Transfer> = {
              ...prev,
              [id]: { ...tr, status: 'done', progress: 1 },
            }
            const batch = tr.batchId
            if (batch) {
              const batchTransfers = Object.values(next).filter((x) => x.batchId === batch)
              const batchTotal = batchTransfers.reduce((s, x) => s + x.file.size, 0)
              const anyFailed = batchTransfers.some(
                (x) => x.status === 'failed' || x.status === 'cancelled',
              )
              const allDone = batchTransfers.every((x) => x.status === 'done')
            if (isMobileDevice() && batchTotal <= maxBytes() && !anyFailed) {
                const blobs = batchesRef.current.get(batch) ?? new Map()
                blobs.set(id, { blob, name: tr.file.name })
                batchesRef.current.set(batch, blobs)
                if (allDone) tryBuildZip(batch, batchTransfers)
                if (!historyWritten.current.has(id)) {
                  historyWritten.current.add(id)
                  const p = handlersRef.current.peers[peerId]
                  addHistory({
                    id,
                    name: tr.file.name,
                    size: tr.file.size,
                    direction: 'receive',
                    peer: p?.name || t('unknown_peer', lang, { id: peerId.slice(0, 6) }),
                    at: Date.now(),
                    ok: true,
                  })
                }
                return next
              }
              if (anyFailed) flushBatch(batch)
            }
            saveBlob(blob, tr.file.name)
            if (!historyWritten.current.has(id)) {
              historyWritten.current.add(id)
              const p = handlersRef.current.peers[peerId]
              addHistory({
                id,
                name: tr.file.name,
                size: tr.file.size,
                direction: 'receive',
                peer: p?.name || t('unknown_peer', lang, { id: peerId.slice(0, 6) }),
                at: Date.now(),
                ok: true,
              })
            }
            return next
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
      },
      strategy,
      { password: passphrase || undefined, relayUrls },
    )
    connRef.current = conn
    setConnectState('connecting')
    setShowPassHint(false)

    // relay-slow banner after 8s with no peers
    slowTimer.current = setTimeout(() => {
      setConnectState((cur) => (Object.keys(handlersRef.current.peers).length === 0 ? 'relay-slow' : cur))
    }, SLOW_RELAY_MS)
    // no-peer guidance after 10s
    noPeerTimer.current = setTimeout(() => {
      setShowNoPeer(Object.keys(handlersRef.current.peers).length === 0)
    }, NO_PEER_GUIDANCE_MS)
    // passphrase hint after 12s with no peers (room may be protected)
    passHintTimer.current = setTimeout(() => {
      if (Object.keys(handlersRef.current.peers).length === 0) setShowPassHint(true)
    }, PASS_HINT_MS)
    // strategy fallback: nostr → mqtt after 15s with no peers — only when setting
    // is 'auto' AND room has no passphrase (passphrase rooms need stable signaling:
    // the peer may still be typing the passphrase; falling back strands them on
    // different strategies — verified in e2e Aug 2026)
    fallbackTimer.current = setTimeout(() => {
      if (
        Object.keys(handlersRef.current.peers).length === 0 &&
        strategy === 'nostr' &&
        strategySetting === 'auto' &&
        !passphrase
      ) {
        // note: fallback for passphraseless rooms only — a passphrase room's
        // peer may still be typing the passphrase (hint flow ends in a reload,
        // which resets strategy to the initial value anyway)
        pushToast('info', t('switching_signal', lang))
        setStrategy('mqtt')
      }
    }, FALLBACK_STRATEGY_MS)

    return () => {
      for (const timer of offerTimers.current.values()) clearTimeout(timer)
      offerTimers.current.clear()
      if (slowTimer.current) clearTimeout(slowTimer.current)
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current)
      if (noPeerTimer.current) clearTimeout(noPeerTimer.current)
      if (passHintTimer.current) clearTimeout(passHintTimer.current)
      conn.leave()
      connRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, strategy, passphrase, relayUrls])

  // --- file intake -----------------------------------------------------------

  const addFiles = useCallback(
    (files: File[]) => {
      const conn = connRef.current
      const targets = Object.values(peers).filter((p) => p.online)
      if (!conn || targets.length === 0) {
        pushToast('error', t('waiting_peer', lang))
        return
      }
      const cap = maxBytes()
      const allowed = files.filter((f) => f.size <= cap)
      const over = files.length - allowed.length
      if (over > 0) pushToast('error', t('file_too_big', lang, { max: formatBytes(cap) }))
      if (allowed.length === 0) return
      const existing = Object.keys(transfers).length
      if (existing + allowed.length * targets.length > MAX_QUEUE_FILES) {
        pushToast('error', t('files_too_many', lang, { n: MAX_QUEUE_FILES }))
        return
      }
      // one Send click = one batch (mobile receivers bundle batch into a zip)
      const batchId = crypto.randomUUID()
      setTransfers((prev) => {
        const next = { ...prev }
        for (const f of allowed) {
          for (const target of targets) {
            const id = crypto.randomUUID()
            fileRefs.current.set(id, f)
            next[id] = createTransfer({
              id,
              direction: 'send',
              file: { name: f.name, size: f.size, mime: f.type || 'application/octet-stream' },
              peerId: target.id,
              batchId,
            })
          }
        }
        return next
      })
      // NOTE: no pump() here — files queue up; user triggers send via the Send button.
    },
    [peers, transfers.length, pushToast, lang],
  )

  // --- ui --------------------------------------------------------------------

  const roomUrl = `${location.origin}${location.pathname}#${code}`
  const transferList = useMemo(() => Object.values(transfers), [transfers])
  const sendable = Object.values(transfers).filter(
    (t) => t.direction === 'send' && (t.status === 'queued' || t.status === 'failed'),
  )
  const onlinePeers = Object.values(peers).filter((p) => p.online)
  const firstPeer = onlinePeers[0]
  const queuedCount = sendable.filter((t) => t.status === 'queued').length

  // aggregate batch row (DESIGN.md §12 — "3/7 files · 58% overall")
  const doneCount = transferList.filter((t) => t.status === 'done').length
  const totalBytes = transferList.reduce((s, t) => s + t.file.size, 0)
  const doneBytes = transferList.filter((t) => t.status === 'done').reduce((s, t) => s + t.file.size, 0)
  const overallPct = totalBytes ? Math.round((doneBytes / totalBytes) * 100) : 0

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
        <button type="button" className="btn btn--ghost" aria-label={t('back', lang)} onClick={onLeave}>
          <ArrowLeft size={18} aria-hidden />
        </button>
        <span className="mono" style={{ fontSize: 18, fontWeight: 500 }}>
          {code}
          {passphrase ? (
            <span className="badge" style={{ marginLeft: 8, verticalAlign: 'middle' }}>
              <Lock size={11} aria-hidden style={{ verticalAlign: -1 }} /> {t('room_protected', lang)}
            </span>
          ) : null}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn--ghost"
            aria-label={lang === 'en' ? 'Bahasa Indonesia' : 'Switch to English'}
            onClick={() => setLang(lang === 'en' ? 'id' : 'en')}
          >
            <Languages size={18} aria-hidden />
            <span className="btn--lang-label">{lang === 'en' ? 'ID' : 'EN'}</span>
          </button>
          <button type="button" className="btn btn--ghost" aria-label={t('copy', lang)} onClick={copyCode}>
            <Copy size={18} aria-hidden />
            {copied ? t('copied', lang) : null}
          </button>
          <button type="button" className="btn btn--ghost" aria-label={t('qr_title', lang)} onClick={() => setQrOpen(true)}>
            <QrCode size={18} aria-hidden />
          </button>
          <button type="button" className="btn btn--ghost" aria-label={t('settings', lang)} onClick={() => setSettingsOpen(true)}>
            <SettingsIcon size={18} aria-hidden />
          </button>
        </div>
      </header>

      <main className="shell__main">
      {inApp ? (
        <div className="banner" role="status">
          {t('inapp_banner', lang)}
        </div>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <span className={`live-dot${onlinePeers.length > 0 ? '' : ' live-dot--off'}`} aria-hidden />
        <span className="badge">{t('peers', lang, { n: Object.values(peers).filter((p) => p.online).length })}</span>
        <span className="badge">{t('trust_e2e', lang)}</span>
      </div>

      {connectState === 'connecting' && Object.keys(peers).length === 0 ? (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
          <div className="qr-pulse">
            <div className="qr-chip">
              <QRCodeSVG value={roomUrl} size={184} level="H" />
            </div>
          </div>
          <div className="mono" style={{ fontSize: 24, fontWeight: 500 }}>
            {code}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 14 }}>
            <span className="spinner" aria-hidden />
            {[t('waiting_peer', lang), t('share_room', lang), t('waiting_peer_alt', lang)][waitCopy]}
          </div>
        </div>
      ) : null}

      {connectState === 'relay-slow' && Object.keys(peers).length === 0 ? (
        <div className="banner" role="status">
          {t('relay_slow', lang)}
        </div>
      ) : null}

      {strategy === 'mqtt' && Object.keys(peers).length === 0 ? (
        <div className="banner" role="status">
          {t('switching_signal', lang)}
        </div>
      ) : null}

      {showNoPeer && Object.keys(peers).length === 0 ? (
        <div className="card" role="status" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          {t('no_peer_yet', lang)}
        </div>
      ) : null}

      {showPassHint && Object.keys(peers).length === 0 ? (
        <div className="card" role="status" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('no_peer_hint', lang)}</span>
          <form
            style={{ display: 'flex', gap: 8 }}
            onSubmit={(e) => {
              e.preventDefault()
              // read from the form, not state — avoids the stale-closure race
              // when the user submits immediately after typing
              const v = new FormData(e.currentTarget).get('passphrase')
              if (typeof v === 'string' && v.trim()) {
                onPassphrase(v.trim())
                // trystero's leave→rejoin with a new password keeps the failed
                // handshake state from the passphraseless attempt (e2e Aug 2026).
                // Reload: fresh join with the password on first connect.
                setTimeout(() => location.reload(), 100)
              }
            }}
          >
            <input
              className="input"
              type="password"
              name="passphrase"
              defaultValue=""
              maxLength={64}
              placeholder="••••••••"
              aria-label={t('passphrase', lang)}
            />
            <button type="submit" className="btn btn--primary btn--sm">
              <Lock size={13} aria-hidden />
              {t('retry', lang)}
            </button>
          </form>
        </div>
      ) : null}

      {Object.keys(peers).length > 0 ? (
        <>
          <PeerList peers={peers} quotaByPeer={quotaByPeer} lang={lang} />
          <Dropzone lang={lang} onFiles={addFiles} />

          {transferList.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {transferList.length > 1 ? (
                <div className="batch-row">
                  <span className="batch-row__label">
                    {doneBytes > 0
                      ? t('batch_progress', lang, {
                          done: doneCount,
                          total: transferList.length,
                          transferred: formatBytes(doneBytes),
                          totalSize: formatBytes(totalBytes),
                        })
                      : t('batch_queued', lang, {
                          done: doneCount,
                          total: transferList.length,
                          totalSize: formatBytes(totalBytes),
                        })}
                  </span>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ transform: `scaleX(${overallPct / 100})` }} />
                  </div>
                </div>
              ) : null}
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
              disabled={queuedCount === 0}
              style={{ fontSize: 16 }}
            >
              <Send size={18} aria-hidden />
              {onlinePeers.length > 1
                ? t('send_files_multi', lang, { n: queuedCount, m: onlinePeers.length })
                : t('send_files', lang, { n: queuedCount, peer: firstPeer.name || peerName(firstPeer.id) })}
            </button>
          ) : null}
        </>
      ) : null}
      </main>

      {settingsOpen ? (
        <Settings
          lang={lang}
          onLang={setLang}
          nickname={nickname}
          onNickname={onNickname}
          strategy={strategySetting}
          onStrategy={onStrategy}
          relays={relays}
          onRelays={onRelays}
          onClose={() => setSettingsOpen(false)}
        />
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
