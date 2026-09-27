import { Paperclip } from 'lucide-react'
import type { Attachment, Priority, Status, Ticket } from '../lib/types'
import { PRIORITY_META, STATUS_META, BILLING_META } from '../lib/constants'
import { Lozenge, fmtSize } from './ui'
import { slaState } from '../lib/sla'

export function StatusLozenge({ status, customer = false }: { status: Status; customer?: boolean }) {
  const m = STATUS_META[status]
  return (
    <Lozenge bg={m.bg} fg={m.fg}>
      {customer ? m.customer : m.label}
    </Lozenge>
  )
}

export function BillingLozenge({ billing }: { billing: Ticket['billing'] }) {
  const m = BILLING_META[billing]
  return (
    <Lozenge bg={m.bg} fg={m.fg} className="normal-case tracking-normal">
      {m.label}
    </Lozenge>
  )
}

export function PriorityLabel({ p, bold = true }: { p: Priority; bold?: boolean }) {
  const m = PRIORITY_META[p]
  return (
    <span className={`inline-flex items-center gap-1.5 ${bold ? 'font-semibold' : ''}`} style={{ color: m.color }}>
      <span className="inline-block h-3 w-3 rounded-[2px]" style={{ background: m.color }} />
      {m.label}
    </span>
  )
}

export function SlaLabel({ t, now }: { t: Ticket; now: number }) {
  const s = slaState(t, now)
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold whitespace-nowrap" style={{ color: s.color }}>
      <span className={`inline-block h-2 w-2 rounded-full ${s.kind === 'breached' ? 'pulse-ring' : ''}`} style={{ background: s.color }} />
      {s.label}
    </span>
  )
}

export function Attachments({ list }: { list?: Attachment[] }) {
  if (!list?.length) return null
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {list.map((a, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[12px] text-slate-700">
          <Paperclip size={12} /> {a.name} <span className="text-slate-400">{fmtSize(a.size)}</span>
        </span>
      ))}
    </div>
  )
}
