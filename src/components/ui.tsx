import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LayoutGrid, Lightbulb, X, GitCompareArrows, ChevronLeft, ChevronRight } from 'lucide-react'
import { PAIN_POINTS } from '../lib/constants'
import { usePref } from '../lib/store'

export const isEmbedded = () => {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}

/** Schalter «Unterschiede einblenden» – pro Browser gespeichert. */
export function useAnnotations(): [boolean, (v: boolean) => void] {
  const [v, set] = usePref('annot', '1')
  return [v === '1', (b) => set(b ? '1' : '0')]
}

/**
 * Markiert eine Stelle mit Pain-Point-Bezug.
 * kind="pain": Schwachstelle im Ist-System (rot). kind="fix": Lösung im Soll-System (grün).
 */
export function PP({ ids, kind = 'fix', label, className = '' }: { ids: string[]; kind?: 'pain' | 'fix'; label?: string; className?: string }) {
  const [on] = useAnnotations()
  if (!on) return null
  const pain = kind === 'pain'
  const title = ids.map((i) => `${i}: ${PAIN_POINTS[i] ?? ''}`).join('\n')
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 align-middle text-[10.5px] font-semibold leading-4 whitespace-nowrap shadow-sm ring-1 ${
        pain ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      } ${className}`}
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <span aria-hidden>{pain ? '⚠' : '✓'}</span>
      {label ? <span>{label}</span> : null}
      <span className="opacity-80">{ids.join(' · ')}</span>
    </span>
  )
}

/** Grösserer Hinweiskasten für Ist/Soll-Unterschiede (nur sichtbar, wenn Anmerkungen aktiv). */
export function DiffNote({ kind, ids, children, className = '' }: { kind: 'pain' | 'fix'; ids: string[]; children: ReactNode; className?: string }) {
  const [on] = useAnnotations()
  if (!on) return null
  const pain = kind === 'pain'
  return (
    <div
      className={`rounded-md border-l-4 px-3 py-2 text-[12.5px] leading-snug shadow-sm ${
        pain ? 'border-red-500 bg-red-50 text-red-900' : 'border-emerald-500 bg-emerald-50 text-emerald-900'
      } ${className}`}
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <div className="mb-0.5 text-[10.5px] font-bold tracking-wide uppercase opacity-80">
        {pain ? 'Ist-Zustand · Pain Point' : 'Soll-Prozess · gelöst'} {ids.join(' · ')}
      </div>
      {children}
    </div>
  )
}

/** Schwebende Präsentationsleiste: zurück zur Demo-Auswahl, Vergleich, Anmerkungen an/aus. Einklappbar. */
export function DemoBar({ label, dark = false }: { label: string; dark?: boolean }) {
  const [on, setOn] = useAnnotations()
  const [collapsed, setCollapsed] = usePref('demobar-collapsed', '0')
  if (isEmbedded()) return null
  const btn = 'flex items-center gap-1.5 rounded-full px-2.5 py-1.5 hover:bg-slate-500/15'
  return (
    <div
      title={label}
      className={`fixed bottom-3 left-3 z-[60] flex items-center gap-0.5 rounded-full border p-1 text-[12px] shadow-lg backdrop-blur ${
        dark ? 'border-white/20 bg-slate-900/85 text-white' : 'border-slate-200 bg-white/95 text-slate-700'
      }`}
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <Link to="/" className={`${btn} font-medium`} title="Zur Demo-Auswahl">
        <LayoutGrid size={14} /> {collapsed === '1' ? null : 'Demos'}
      </Link>
      {collapsed !== '1' && (
        <Link to="/vergleich" className={btn} title="Ist vs. Soll">
          <GitCompareArrows size={14} /> <span className="hidden sm:inline">Vergleich</span>
        </Link>
      )}
      <button
        onClick={() => setOn(!on)}
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-medium transition ${on ? 'bg-amber-400 text-slate-900' : 'hover:bg-slate-500/15'}`}
        title="Pain Points / Unterschiede einblenden"
      >
        <Lightbulb size={14} /> {collapsed === '1' ? null : <span className="hidden sm:inline">Unterschiede</span>}
      </button>
      <button onClick={() => setCollapsed(collapsed === '1' ? '0' : '1')} className="rounded-full px-1.5 py-1.5 opacity-60 hover:opacity-100" title={collapsed === '1' ? 'Ausklappen' : 'Einklappen'}>
        {collapsed === '1' ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </div>
  )
}

export function Modal({ title, onClose, children, width = 560 }: { title: ReactNode; onClose: () => void; children: ReactNode; width?: number }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-[8vh]" onMouseDown={onClose}>
      <div className="w-full animate-slide-in rounded-lg bg-white shadow-2xl" style={{ maxWidth: width }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h3 className="text-[16px] font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Schliessen">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

// ---------- Toasts ----------

type ToastItem = { id: number; text: ReactNode; tone: 'info' | 'success' | 'warn' }
let toastId = 0
const toastListeners = new Set<(t: ToastItem[]) => void>()
let toasts: ToastItem[] = []

export function toast(text: ReactNode, tone: ToastItem['tone'] = 'info') {
  const item = { id: ++toastId, text, tone }
  toasts = [...toasts, item]
  toastListeners.forEach((l) => l(toasts))
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== item.id)
    toastListeners.forEach((l) => l(toasts))
  }, 5000)
}

export function Toaster() {
  const [list, setList] = useState<ToastItem[]>(toasts)
  useEffect(() => {
    toastListeners.add(setList)
    return () => {
      toastListeners.delete(setList)
    }
  }, [])
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[80] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {list.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto animate-slide-in rounded-md border-l-4 bg-white px-4 py-3 text-[13px] text-ink shadow-xl ring-1 ring-slate-200 ${
            t.tone === 'success' ? 'border-emerald-500' : t.tone === 'warn' ? 'border-amber-500' : 'border-blue-600'
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  )
}

/** Sekundentakt für SLA-Uhren. */
export function useNow(intervalMs = 15_000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(i)
  }, [intervalMs])
  return now
}

export function Avatar({ initials, color, size = 28, title }: { initials: string; color: string; size?: number; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  )
}

export function Lozenge({ bg, fg, children, className = '' }: { bg: string; fg: string; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-block rounded-[3px] px-1.5 py-[2px] text-[11px] leading-[14px] font-bold tracking-wide whitespace-nowrap uppercase ${className}`} style={{ background: bg, color: fg }}>
      {children}
    </span>
  )
}

export function fakeFiles(list: FileList | null) {
  return Array.from(list ?? []).map((f) => ({ name: f.name, size: f.size }))
}

export function fmtSize(bytes: number) {
  if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1000))} KB`
}
