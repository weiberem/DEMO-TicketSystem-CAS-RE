import { useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, ArrowLeftRight, ExternalLink, RotateCw, Lightbulb } from 'lucide-react'
import { useState } from 'react'
import { useAnnotations } from '../components/ui'

const NAVY = '#1C3A52'
const GOLD = '#E0C449'

const PRESETS: { label: string; path: string }[] = [
  { label: 'Ist · Kontaktformular', path: '/ist/formular' },
  { label: 'Ist · WISE Home', path: '/ist/wise' },
  { label: 'Ist · WISE Ticket #24482', path: '/ist/wise/ticket/24482' },
  { label: 'Ist · WISE Shift Manager', path: '/ist/wise/shift-manager' },
  { label: 'Soll · Kundenportal', path: '/portal' },
  { label: 'Soll · Meine Anfragen', path: '/portal/anfragen' },
  { label: 'Soll · Queue', path: '/desk' },
  { label: 'Soll · Ticket TS-1030 (Sebi-Sport)', path: '/desk/ticket/TS-1030' },
  { label: 'Soll · Kundenrückmeldungen', path: '/desk/queue/rueckmeldung' },
  { label: 'Soll · Reports', path: '/desk/reports' },
]

const isIst = (p: string) => p.startsWith('/ist')

export default function Split() {
  const [sp, setSp] = useSearchParams()
  const l = sp.get('l') ?? '/ist/formular'
  const r = sp.get('r') ?? '/portal'
  const [nonce, setNonce] = useState(0)
  const [on, setOn] = useAnnotations()

  const set = (key: 'l' | 'r', v: string) => {
    const next = new URLSearchParams(sp)
    next.set(key, v)
    setSp(next)
  }

  return (
    <div className="flex h-full flex-col bg-[#EEF1F3] font-sans">
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-3 py-2 text-white" style={{ background: NAVY }}>
        <Link to="/" className="flex items-center gap-1.5 rounded px-2 py-1 text-[13px] hover:bg-white/10">
          <ArrowLeft size={14} /> Demos
        </Link>
        <span className="hidden text-[13px] text-white/60 md:inline">Split-Screen</span>
        <div className="mx-auto flex flex-wrap items-center gap-2">
          <Picker value={l} onChange={(v) => set('l', v)} />
          <button
            title="Seiten tauschen"
            onClick={() => {
              const next = new URLSearchParams(sp)
              next.set('l', r)
              next.set('r', l)
              setSp(next)
            }}
            className="rounded p-1.5 hover:bg-white/10"
          >
            <ArrowLeftRight size={16} />
          </button>
          <Picker value={r} onChange={(v) => set('r', v)} />
        </div>
        <button
          onClick={() => setOn(!on)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold ${on ? 'text-[#1A1A1A]' : 'bg-white/10'}`}
          style={on ? { background: GOLD } : undefined}
          title="Pain Points / Unterschiede einblenden (Seiten neu laden)"
        >
          <Lightbulb size={14} /> Unterschiede {on ? 'an' : 'aus'}
        </button>
        <button onClick={() => setNonce((n) => n + 1)} className="rounded p-1.5 hover:bg-white/10" title="Beide neu laden">
          <RotateCw size={15} />
        </button>
      </div>
      <div className="grid min-h-0 flex-1 grid-rows-2 gap-2 p-2 md:grid-cols-2 md:grid-rows-1">
        <Pane path={l} k={`l${nonce}${l}`} />
        <Pane path={r} k={`r${nonce}${r}`} />
      </div>
    </div>
  )
}

function Picker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const known = PRESETS.some((p) => p.path === value)
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="max-w-[46vw] rounded bg-white/10 px-2 py-1 text-[13px] text-white outline-none [&>option]:text-black">
      {!known && <option value={value}>{value}</option>}
      {PRESETS.map((p) => (
        <option key={p.path} value={p.path}>
          {p.label}
        </option>
      ))}
    </select>
  )
}

function Pane({ path, k }: { path: string; k: string }) {
  const ist = isIst(path)
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg bg-white shadow ring-1 ring-black/5">
      <div className={`flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-white ${ist ? 'bg-[#C0392B]' : 'bg-[#1E8E5A]'}`}>
        {ist ? 'IST-ZUSTAND · heute' : 'SOLL-PROZESS · Prototyp'}
        <span className="truncate font-normal opacity-80">{path}</span>
        <a href={path} target="_blank" rel="noreferrer" className="ml-auto opacity-80 hover:opacity-100" title="In neuem Tab öffnen">
          <ExternalLink size={13} />
        </a>
      </div>
      <iframe key={k} src={path} title={path} className="min-h-0 w-full flex-1 border-0" />
    </div>
  )
}
