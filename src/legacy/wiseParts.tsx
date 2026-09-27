import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import type { LegacyHistory, LegacyTicket } from '../lib/types'
import { now, uid } from '../lib/actions'
import { PP } from '../components/ui'

// ---------------------------------------------------------------------------
// Gemeinsame Bausteine für das Altsystem «WISE Enterprise Portal» (Ist-Zustand)
// ---------------------------------------------------------------------------

export const BASE = '/ist/wise'
export const USER = 'Nicole Riesen'
export const TEAL = '#2e7474'
export const SUPPORT_ADDRESS = 'support@timetool.ch'

export const STATUS_OPTIONS = ['New', 'Open', 'In Progress', 'On Hold', 'Closed, unbilled', 'Closed, billed', 'Closed, not billable']
export const CLOSE_OPTIONS = ['Closed, unbilled', 'Closed, billed', 'Closed, not billable']

export const isClosed = (status: string) => status.startsWith('Closed')

const pad = (n: number) => String(n).padStart(2, '0')

/** dd.mm.yyyy hh:mm – so wie WISE Datumswerte darstellt. */
export function fmtDate(iso?: string) {
  if (!iso) return 'N/A'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fmtDay(iso?: string) {
  if (!iso) return 'N/A'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

export const chf = (n: number) => n.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const historyEntry = (text: string, user = USER): LegacyHistory => ({ id: uid('lh'), at: now(), user, text })

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="font-raleway text-[23px] font-normal tracking-wide text-[#333] uppercase">{children}</h1>
      {sub ? <div className="mt-0.5 text-[12.5px] text-[#888]">{sub}</div> : null}
    </div>
  )
}

export function Panel({ title, children, className = '', right }: { title?: ReactNode; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={`border border-[#e6e6e6] bg-white px-5 py-4 ${className}`}>
      {title ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-raleway text-[13.5px] tracking-wide text-[#666] uppercase">{title}</h2>
          {right}
        </div>
      ) : null}
      {children}
    </section>
  )
}

export function WiseButton({
  children,
  onClick,
  primary = false,
  disabled = false,
  type = 'button',
  title,
}: {
  children: ReactNode
  onClick?: () => void
  primary?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
  title?: string
}) {
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-[30px] items-center gap-1.5 rounded-[2px] border px-3 text-[13px] transition disabled:opacity-50 ${
        primary ? 'border-[#2e7474] bg-[#2e7474] text-white hover:bg-[#245d5d]' : 'border-[#ddd] bg-white text-[#555] hover:bg-[#f3f3f3]'
      }`}
    >
      {children}
    </button>
  )
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <LoaderCircle size={size} className="animate-spin text-[#2e7474]" />
}

/** «Loading …»-Box, wie sie bei jedem Klick im Altsystem erscheint (PP07). */
export function PageLoader({ text = 'Loading …' }: { text?: string }) {
  return (
    <div className="flex min-h-[420px] items-start justify-center pt-28">
      <div className="flex items-center gap-3 border border-[#ddd] bg-white px-5 py-3 text-[13px] text-[#666] shadow-sm">
        <Spinner size={18} />
        <span>{text}</span>
        <PP kind="pain" ids={['PP07']} label="2–10 s pro Klick" />
      </div>
    </div>
  )
}

/** Dichte, altmodische Ticket-Tabelle (Inbox, Suche, Shift Manager). */
export function TicketTable({ tickets, showPriority = false, empty = 'No tickets found.' }: { tickets: LegacyTicket[]; showPriority?: boolean; empty?: string }) {
  if (!tickets.length) return <div className="border border-[#e6e6e6] bg-[#fafafa] px-4 py-6 text-center text-[12.5px] text-[#888]">{empty}</div>
  return (
    <table className="w-full border-collapse border border-[#ddd] text-[12px]">
      <thead>
        <tr className="bg-[#f2f2f2] text-left text-[#444]">
          <th className="border border-[#ddd] px-2 py-1.5 font-semibold">#</th>
          <th className="border border-[#ddd] px-2 py-1.5 font-semibold">Title</th>
          <th className="border border-[#ddd] px-2 py-1.5 font-semibold">Company</th>
          <th className="border border-[#ddd] px-2 py-1.5 font-semibold">Status</th>
          {showPriority ? <th className="border border-[#ddd] px-2 py-1.5 font-semibold">Priority</th> : null}
          <th className="border border-[#ddd] px-2 py-1.5 font-semibold">Assigned to</th>
          <th className="border border-[#ddd] px-2 py-1.5 font-semibold">Created</th>
          <th className="border border-[#ddd] px-2 py-1.5 font-semibold">Updated</th>
        </tr>
      </thead>
      <tbody>
        {tickets.map((t, i) => (
          <tr key={t.id} className={i % 2 ? 'bg-[#fafafa]' : 'bg-white'}>
            <td className="border border-[#e3e3e3] px-2 py-1 text-[#777] tabular-nums">{t.id}</td>
            <td className="border border-[#e3e3e3] px-2 py-1">
              <Link to={`${BASE}/ticket/${t.id}`} className="text-[#2e7474] hover:underline">
                {t.title}
              </Link>
            </td>
            <td className="border border-[#e3e3e3] px-2 py-1 text-[#555]">{t.company}</td>
            <td className="border border-[#e3e3e3] px-2 py-1 text-[#555]">{t.status}</td>
            {showPriority ? <td className="border border-[#e3e3e3] px-2 py-1 text-[#555]">{t.priority}</td> : null}
            <td className="border border-[#e3e3e3] px-2 py-1 text-[#555]">{t.assignedTo}</td>
            <td className="border border-[#e3e3e3] px-2 py-1 whitespace-nowrap text-[#777] tabular-nums">{fmtDate(t.createdAt)}</td>
            <td className="border border-[#e3e3e3] px-2 py-1 whitespace-nowrap text-[#777] tabular-nums">{fmtDate(t.updatedAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Winzige deutsche Flagge (Language-Feld). */
export function FlagDE() {
  return (
    <span className="inline-flex h-[13px] w-[20px] flex-col overflow-hidden align-middle shadow-[0_0_0_1px_rgba(0,0,0,.08)]">
      <span className="flex-1 bg-black" />
      <span className="flex-1 bg-[#dd0000]" />
      <span className="flex-1 bg-[#ffce00]" />
    </span>
  )
}
