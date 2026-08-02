import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { X } from 'lucide-react'
import { t, type Lang } from '../lib/strings'
import type { SignalStrategy } from '../net/room'

export type StrategySetting = 'auto' | SignalStrategy

interface SettingsProps {
  lang: Lang
  onLang: (l: Lang) => void
  nickname: string
  onNickname: (name: string) => void
  strategy: StrategySetting
  onStrategy: (s: StrategySetting) => void
  relays: string
  onRelays: (r: string) => void
  onClose: () => void
}

// sliding-thumb position driven by CSS vars — no JS measurement needed
function segStyle(count: number, index: number): CSSProperties {
  return { '--seg-count': count, '--seg-index': index } as CSSProperties
}

const STRATEGIES = ['auto', 'nostr', 'mqtt'] as const

export function Settings({
  lang,
  onLang,
  nickname,
  onNickname,
  strategy,
  onStrategy,
  relays,
  onRelays,
  onClose,
}: SettingsProps) {
  const [name, setName] = useState(nickname)
  const [relayInput, setRelayInput] = useState(relays)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function save() {
    onNickname(name.trim().slice(0, 32) || nickname)
    onRelays(relayInput.trim())
    onClose()
  }

  return (
    <div className="scrim" role="dialog" aria-modal="true" aria-label={t('settings', lang)} onClick={onClose}>
      <div className="modal modal--settings" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>{t('settings', lang)}</h2>
          <button type="button" className="btn btn--ghost" aria-label={t('close', lang)} ref={closeRef} onClick={onClose}>
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="modal__body">
        <div className="settings-section" role="group" aria-label={t('section_profile', lang)}>
          <span className="section-label">{t('section_profile', lang)}</span>
          <label className="field-label">
            {t('nickname_title', lang)}
            <input
              className="input"
              value={name}
              maxLength={32}
              onChange={(e) => setName(e.target.value)}
              aria-label={t('nickname_title', lang)}
            />
          </label>
        </div>

        <div className="settings-section" role="group" aria-label={t('language', lang)}>
          <span className="section-label">{t('language', lang)}</span>
          <div className="segmented" role="group" aria-label={t('language', lang)} style={segStyle(2, lang === 'en' ? 0 : 1)}>
            <span className="segmented__thumb" aria-hidden />
            <button
              type="button"
              className={`segmented__btn${lang === 'en' ? ' segmented__btn--on' : ''}`}
              onClick={() => onLang('en')}
            >
              English
            </button>
            <button
              type="button"
              className={`segmented__btn${lang === 'id' ? ' segmented__btn--on' : ''}`}
              onClick={() => onLang('id')}
            >
              Indonesia
            </button>
          </div>
        </div>

        <div className="settings-section" role="group" aria-label={t('section_network', lang)}>
          <span className="section-label">{t('section_network', lang)}</span>
          <label className="field-label">
            {t('strategy', lang)}
            <div
              className="segmented"
              role="group"
              aria-label={t('strategy', lang)}
              style={segStyle(STRATEGIES.length, Math.max(0, STRATEGIES.indexOf(strategy)))}
            >
              <span className="segmented__thumb" aria-hidden />
              {STRATEGIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`segmented__btn${strategy === s ? ' segmented__btn--on' : ''}`}
                  onClick={() => onStrategy(s)}
                >
                  {t(`strategy_${s}` as const, lang)}
                </button>
              ))}
            </div>
          </label>
          <label className="field-label">
            {t('relays', lang)}
            <input
              className="input"
              value={relayInput}
              placeholder="wss://relay.example.com, wss://…"
              onChange={(e) => setRelayInput(e.target.value)}
              aria-label={t('relays', lang)}
            />
            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{t('relays_hint', lang)}</span>
          </label>
        </div>
        </div>

        <button type="button" className="btn btn--primary" onClick={save}>
          {t('save', lang)}
        </button>
      </div>
    </div>
  )
}
