import { useEffect, useState } from 'react'
import { Home, Room } from './components'
import { usePersistentState } from './hooks/usePersistentState'
import { detectLang, type Lang } from './lib/strings'
import { isValidRoomCode, normalizeRoomInput, generateRoomCode } from './engine/roomCode'
import { isMobileDevice } from './engine/transfer'
import type { RoomId } from './engine/types'
import type { StrategySetting } from './components/Settings'

function deviceDefaultName(): string {
  const mobile =
    typeof navigator !== 'undefined' &&
    (navigator.maxTouchPoints > 0 || /Mobi|Android|iPhone/i.test(navigator.userAgent))
  return mobile ? 'My Phone' : 'My Laptop'
}

export default function App() {
  const [lang, setLang] = usePersistentState<Lang>('pt-lang', detectLang())
  const [nickname, setNickname] = usePersistentState('pt-nickname', deviceDefaultName())
  const [nicknameConfirmed, setNicknameConfirmed] = usePersistentState('pt-nickname-confirmed', false)
  const [strategy, setStrategy] = usePersistentState<StrategySetting>('pt-strategy', 'auto')
  const [relays, setRelays] = usePersistentState('pt-relays', '')
  const [screen, setScreen] = useState<'home' | 'room'>('home')
  const [roomCode, setRoomCode] = useState<RoomId | null>(null)
  // sessionStorage mirror: a hint-flow passphrase survives the reload that
  // reconnects us cleanly (trystero's leave→rejoin dance keeps failed-handshake
  // state — verified in e2e Aug 2026; a fresh page load avoids it entirely)
  const [roomPassphrase, setRoomPassphrase] = useState(() => sessionStorage.getItem('pt-room-pass') ?? '')

  useEffect(() => {
    sessionStorage.setItem('pt-room-pass', roomPassphrase)
  }, [roomPassphrase])

  // Deep link: #PT-XXXXXX auto-joins on load (DESIGN.md §9 — predictable deep links)
  useEffect(() => {
    const h = location.hash.replace(/^#/, '')
    if (h && isValidRoomCode(normalizeRoomInput(h))) {
      setRoomCode(normalizeRoomInput(h))
      setScreen('room')
    }
  }, [])

  function createRoom(passphrase: string) {
    const code = generateRoomCode()
    setRoomPassphrase(passphrase)
    setRoomCode(code)
    setScreen('room')
    history.replaceState(null, '', `#${code}`)
  }

  function joinRoom(code: string, passphrase: string) {
    setRoomPassphrase(passphrase)
    setRoomCode(code)
    setScreen('room')
    history.replaceState(null, '', `#${code}`)
  }

  function leaveRoom() {
    setScreen('home')
    setRoomPassphrase('')
    sessionStorage.removeItem('pt-room-pass')
    history.replaceState(null, '', location.pathname)
  }

  if (screen === 'room' && roomCode) {
    return (
      <Room
        code={roomCode}
        nickname={nickname}
        device={isMobileDevice() ? 'mobile' : 'desktop'}
        lang={lang}
        setLang={setLang}
        passphrase={roomPassphrase}
        onPassphrase={setRoomPassphrase}
        strategySetting={strategy}
        relays={relays}
        onNickname={setNickname}
        onStrategy={setStrategy}
        onRelays={setRelays}
        onLeave={leaveRoom}
      />
    )
  }

  return (
    <Home
      lang={lang}
      setLang={setLang}
      nickname={nickname}
      nicknameConfirmed={nicknameConfirmed}
      onNickname={setNickname}
      onConfirmNickname={() => setNicknameConfirmed(true)}
      onCreateRoom={createRoom}
      onJoinRoom={joinRoom}
      strategy={strategy}
      onStrategy={setStrategy}
      relays={relays}
      onRelays={setRelays}
    />
  )
}
