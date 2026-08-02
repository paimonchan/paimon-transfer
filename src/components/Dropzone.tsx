import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { UploadCloud } from 'lucide-react'
import { t, type Lang } from '../lib/strings'

interface DropzoneProps {
  lang: Lang
  onFiles: (files: File[]) => void
}

export function Dropzone({ lang, onFiles }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  function handleFiles(list: FileList | null) {
    if (!list) return
    onFiles(Array.from(list))
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      inputRef.current?.click()
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setOver(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div
      className={`dropzone${over ? ' dropzone--over' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={t('dropzone_hint', lang)}
      onClick={() => inputRef.current?.click()}
      onKeyDown={onKeyDown}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <UploadCloud size={28} aria-hidden />
      <div>{t('dropzone_hint', lang)}</div>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
