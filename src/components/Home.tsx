import { useState } from 'react'
import { Plus, ArrowRight, Lock } from 'lucide-react'
import { t, type Lang } from '../lib/strings'
import { usePersistentState } from '../hooks/usePersistentState'
import { isValidRoomCode, normalizeRoomInput } from '../engine/roomCode'

interface HomeProps {
  lang: Lang
  nickname: string
  onNickname: (name: string) => void
  onCreateRoom: () => void
  onJoinRoom: (code: string) => void
}

export function Home({ lang, nickname, onNickname, onCreateRoom, onJoinRoom }: HomeProps) {
  const [codeInput, setCodeInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [onboardingDismissed, setOnboardingDismissed] = usePersistentState('pt-onboarding-dismissed', false)
  const [editingName, setEditingName] = useState(false)

  function join() {
    const normalized = normalizeRoomInput(codeInput)
    if (!isValidRoomCode(normalized)) {
      setError(t('invalid_code', lang))
      return
    }
    setError(null)
    onJoinRoom(normalized)
  }

  function submitName(e: React.FormEvent) {
    e.preventDefault()
    setEditingName(false)
  }

  const showNamePrompt = editingName || nickname.trim() === ''

  return (
    <div className="shell">
      <header className="shell__header">
        <div className="brand">
          <span className="brand__mark" aria-hidden>
            PT
          </span>
          {t('app_name', lang)}
        </div>
      </header>

      {showNamePrompt ? (
        <form className="card" onSubmit={submitName} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label htmlFor="nickname" style={{ fontWeight: 600 }}>
            {t('nickname_title', lang)}
          </label>
          <input
            id="nickname"
            className="input"
            value={nickname}
            placeholder={t('nickname_placeholder', lang)}
            onChange={(e) => onNickname(e.target.value)}
            maxLength={32}
            autoFocus
          />
          <button type="submit" className="btn btn--primary">
            {t('continue', lang)}
          </button>
        </form>
      ) : null}

      {!onboardingDismissed && !showNamePrompt ? (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontWeight: 600, fontFamily: 'var(--font-display)' }}>
            {t('onboarding_title', lang)}
          </div>
          <ul className="steps">
            <li>{t('onboarding_steps', lang)}</li>
          </ul>
          <div>
            <button type="button" className="btn btn--ghost" onClick={() => setOnboardingDismissed(true)}>
              {t('got_it', lang)}
            </button>
          </div>
        </div>
      ) : null}

      <button type="button" className="btn btn--primary" onClick={onCreateRoom} style={{ fontSize: 16 }}>
        <Plus size={20} aria-hidden />
        {t('create_room', lang)}
      </button>

      <div className="divider">or</div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="input"
          style={{ flex: 1, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
          placeholder={t('room_code_placeholder', lang)}
          value={codeInput}
          maxLength={9}
          onChange={(e) => {
            setCodeInput(e.target.value.toUpperCase())
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') join()
          }}
          aria-label={t('join_room', lang)}
          aria-invalid={error ? true : undefined}
        />
        <button type="button" className="btn" onClick={join} aria-label={t('join_room', lang)}>
          <ArrowRight size={18} aria-hidden />
        </button>
      </div>
      {error ? (
        <div role="alert" style={{ color: 'var(--danger)', fontSize: 13 }}>
          {error}
        </div>
      ) : null}

      <footer style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
        <div className="trust-line">
          <Lock size={14} aria-hidden />
          {t('trust_e2e', lang)}
        </div>
        <div className="trust-line">{t('trust_lan', lang)}</div>
      </footer>
    </div>
  )
}
