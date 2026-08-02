import { useEffect, useRef, useState } from 'react'
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 17, margin: 0 }}>{t('settings', lang)}</h2>
          <button type="button" className="btn btn--ghost" aria-label="Close" ref={closeRef} onClick={onClose}>
            <X size={18} aria-hidden />
          </button>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          {t('nickname_title', lang)}
          <input
            className="input"
            value={name}
            maxLength={32}
            onChange={(e) => setName(e.target.value)}
            aria-label={t('nickname_title', lang)}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          {t('language', lang)}
          <div className="segmented" role="group" aria-label={t('language', lang)}>
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
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          {t('strategy', lang)}
          <div className="segmented" role="group" aria-label={t('strategy', lang)}>
            {(['auto', 'nostr', 'mqtt'] as const).map((s) => (
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

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
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

        <button type="button" className="btn btn--primary" onClick={save}>
          {t('save', lang)}
        </button>
      </div>
    </div>
  )
}
