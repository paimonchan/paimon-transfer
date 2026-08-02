import { AlertCircle, CheckCircle2, Info } from 'lucide-react'

export interface Toast {
  id: number
  kind: 'info' | 'error' | 'ok'
  text: string
}

interface ToastsProps {
  toasts: Toast[]
}

const ICONS = {
  info: Info,
  error: AlertCircle,
  ok: CheckCircle2,
} as const

// DESIGN.md §13.6 — slide-up 0.2s, stack max 3, aria-live polite; errors assertive.
export function Toasts({ toasts }: ToastsProps) {
  const kind = toasts.some((t) => t.kind === 'error') ? 'assertive' : 'polite'
  return (
    <div className="toasts" aria-live={kind}>
      {toasts.map((toast) => {
        const Icon = ICONS[toast.kind]
        return (
          <div className={`toast toast--${toast.kind}`} key={toast.id}>
            <Icon size={15} aria-hidden />
            {toast.text}
          </div>
        )
      })}
    </div>
  )
}
