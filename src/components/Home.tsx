import { useState } from 'react'
import { Plus, ArrowRight, Lock, Settings as SettingsIcon, Languages, Eye, EyeOff, ShieldCheck, Zap, Pencil } from 'lucide-react'
import { t, type Lang } from '../lib/strings'
import { usePersistentState } from '../hooks/usePersistentState'
import { isValidRoomCode, normalizeRoomInput } from '../engine/roomCode'
import type { StrategySetting } from './Settings'
import { Settings } from './Settings'
import { HistoryList } from './HistoryList'
import { getHistory, clearHistory, type HistoryEntry } from '../lib/history'

interface HomeProps {
  lang: Lang
  setLang: (l: Lang) => void
  nickname: string
  nicknameConfirmed: boolean
  onNickname: (name: string) => void
  onConfirmNickname: () => void
  onCreateRoom: (passphrase: string) => void
  onJoinRoom: (code: string, passphrase: string) => void
  strategy: StrategySetting
  onStrategy: (s: StrategySetting) => void
  relays: string
  onRelays: (r: string) => void
}

export function Home({
  lang,
  setLang,
  nickname,
  nicknameConfirmed,
  onNickname,
  onConfirmNickname,
  onCreateRoom,
  onJoinRoom,
  strategy,
  onStrategy,
  relays,
  onRelays,
}: HomeProps) {
  const [codeInput, setCodeInput] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>(() => getHistory())
  const [onboardingDismissed, setOnboardingDismissed] = usePersistentState('pt-onboarding-dismissed', false)
  const [editingName, setEditingName] = useState(false)

  function join() {
    const normalized = normalizeRoomInput(codeInput)
    if (!isValidRoomCode(normalized)) {
      setError(t('invalid_code', lang))
      return
    }
    setError(null)
    onJoinRoom(normalized, passphrase.trim())
  }

  function submitName(e: React.FormEvent) {
    e.preventDefault()
    setEditingName(false)
    onConfirmNickname()
  }

  const showNamePrompt = editingName || !nicknameConfirmed

  return (
    <div className="shell">
      <header className="shell__header">
        <div className="brand">
          <span className="brand__mark" aria-hidden>
            PT
          </span>
          Paimon Transfer
        </div>
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
          <button type="button" className="btn btn--ghost" aria-label={t('settings', lang)} onClick={() => setSettingsOpen(true)}>
            <SettingsIcon size={18} aria-hidden />
          </button>
        </div>
      </header>

      <main className="shell__main">
      {!showNamePrompt ? (
        <div className="identity-row">
          <span className="identity-row__name">
            {t('appearing_as', lang)} <strong>{nickname}</strong>
          </span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditingName(true)}>
            <Pencil size={13} aria-hidden />
            {t('edit', lang)}
          </button>
        </div>
      ) : null}

      {showNamePrompt ? (
        <form className="card" onSubmit={submitName} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label htmlFor="nickname" style={{ fontWeight: 600 }}>
            {t('nickname_title', lang)}
          </label>
          <input
            id="nickname"
            className="input"
            placeholder={t('nickname_placeholder', lang)}
            value={nickname}
            maxLength={32}
            onChange={(e) => onNickname(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn btn--primary">
            {t('continue', lang)}
          </button>
        </form>
      ) : null}

      {!onboardingDismissed ? (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontWeight: 600 }}>{t('onboarding_title', lang)}</span>
          <ol className="steps">
            <li>{t('onboarding_step_1', lang)}</li>
            <li>{t('onboarding_step_2', lang)}</li>
            <li>{t('onboarding_step_3', lang)}</li>
          </ol>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            style={{ alignSelf: 'flex-end' }}
            onClick={() => setOnboardingDismissed(true)}
          >
            {t('got_it', lang)}
          </button>
        </div>
      ) : null}

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button type="button" className="btn btn--primary" style={{ fontSize: 16 }} onClick={() => onCreateRoom(passphrase.trim())}>
          <Plus size={18} aria-hidden />
          {t('create_room', lang)}
        </button>
        <div className="or-divider">{t('join_room', lang)}</div>
        <div className="join-row">
          <input
            className="input mono"
            placeholder={t('room_code_placeholder', lang)}
            value={codeInput}
            maxLength={9}
            inputMode="text"
            autoCapitalize="characters"
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            aria-label={t('room_code_placeholder', lang)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') join()
            }}
          />
          <button type="button" className="btn" onClick={join} aria-label={t('join_room', lang)}>
            <ArrowRight size={18} aria-hidden />
            {t('join_room', lang)}
          </button>
        </div>
        {error ? (
          <span role="alert" style={{ fontSize: 12, color: 'var(--danger)' }}>
            {error}
          </span>
        ) : null}
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            fontSize: 12,
            borderTop: '1px solid var(--border)',
            paddingTop: 12,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
            <Lock size={12} aria-hidden />
            {t('passphrase_optional', lang)}
          </span>
          <div className="input-wrap">
            <input
              className="input input--with-toggle"
              type={showPass ? 'text' : 'password'}
              value={passphrase}
              maxLength={64}
              placeholder="••••••••"
              onChange={(e) => setPassphrase(e.target.value)}
              aria-label={t('passphrase_optional', lang)}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="input-toggle"
              aria-label={showPass ? t('passphrase_hide', lang) : t('passphrase_show', lang)}
              onClick={() => setShowPass((s) => !s)}
            >
              {showPass ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
            </button>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('passphrase_hint', lang)}</span>
        </label>
      </div>

      <HistoryList lang={lang} entries={history} onClear={() => { clearHistory(); setHistory([]) }} />
      </main>

      <footer className="trust-footer">
        <div className="trust-line">
          <ShieldCheck size={15} aria-hidden />
          {t('trust_e2e', lang)}
        </div>
        <div className="trust-line">
          <Zap size={15} aria-hidden />
          {t('trust_lan', lang)}
        </div>
      </footer>

      {settingsOpen ? (
        <Settings
          lang={lang}
          onLang={setLang}
          nickname={nickname}
          onNickname={onNickname}
          strategy={strategy}
          onStrategy={onStrategy}
          relays={relays}
          onRelays={onRelays}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </div>
  )
}
