import { File, FileArchive, FileAudio, FileCode, FileImage, FileText, FileVideo } from 'lucide-react'

interface FileIconProps {
  name: string
  mime?: string
}

const CODE_EXT = /\.(js|ts|jsx|tsx|py|rb|go|rs|java|c|h|cpp|cs|php|sh|html|css|json|xml|yml|yaml|md|sql)$/i
const ARCHIVE_EXT = /\.(zip|rar|7z|tar|gz|bz2|xz|tgz)$/i

export function FileIcon({ name, mime }: FileIconProps) {
  const m = (mime ?? '').toLowerCase()
  let Icon = File
  if (m.startsWith('image/')) Icon = FileImage
  else if (m.startsWith('video/')) Icon = FileVideo
  else if (m.startsWith('audio/')) Icon = FileAudio
  else if (ARCHIVE_EXT.test(name) || m.includes('zip') || m.includes('compress')) Icon = FileArchive
  else if (CODE_EXT.test(name) || m.startsWith('text/')) Icon = FileCode
  else if (m.startsWith('application/pdf') || m.includes('word') || m.includes('sheet') || m.includes('presentation')) Icon = FileText
  return <Icon size={18} aria-hidden />
}
