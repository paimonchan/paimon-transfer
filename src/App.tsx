import { useEffect, useState } from 'react'
import { Home, Room } from './components'
import { usePersistentState } from './hooks/usePersistentState'
import { detectLang, type Lang } from './lib/strings'
import { isValidRoomCode, normalizeRoomInput, generateRoomCode } from './engine/roomCode'
import type { RoomId } from './engine/types'

function deviceDefaultName(): string {
  const mobile =
    typeof navigator !== 'undefined' &&
    (navigator.maxTouchPoints > 0 || /Mobi|Android|iPhone/i.test(navigator.userAgent))
  return mobile ? 'My Phone' : 'My Laptop'
}

export default function App() {
  const [lang] = useState<Lang>(detectLang)
  const [nickname, setNickname] = usePersistentState('pt-nickname', deviceDefaultName())
  const [screen, setScreen] = useState<'home' | 'room'>('home')
  const [roomCode, setRoomCode] = useState<RoomId | null>(null)

  // Deep link: #PT-XXXXXX auto-joins on load (DESIGN.md §9 — predictable deep links)
  useEffect(() => {
    const h = location.hash.replace(/^#/, '')
    if (h && isValidRoomCode(normalizeRoomInput(h))) {
      setRoomCode(normalizeRoomInput(h))
      setScreen('room')
    }
  }, [])

  function createRoom() {
    const code = generateRoomCode()
    setRoomCode(code)
    setScreen('room')
    history.replaceState(null, '', `#${code}`)
  }

  function joinRoom(code: string) {
    setRoomCode(code)
    setScreen('room')
    history.replaceState(null, '', `#${code}`)
  }

  function leaveRoom() {
    setScreen('home')
    history.replaceState(null, '', location.pathname)
  }

  if (screen === 'room' && roomCode) {
    return <Room code={roomCode} lang={lang} onLeave={leaveRoom} />
  }

  return (
    <Home
      lang={lang}
      nickname={nickname}
      onNickname={setNickname}
      onCreateRoom={createRoom}
      onJoinRoom={joinRoom}
    />
  )
}
