import { useState } from 'react'
import type { Status } from '../lib/types'
import { AGENTS, PRIORITY_META, STATUS_META } from '../lib/constants'
import { getCustomers, getTickets, getTimeEntries } from '../lib/actions'
import { useData } from '../lib/store'
import { fmtHours, slaState } from '../lib/sla'
import { Avatar, PP, useNow } from '../components/ui'
import { StatusLozenge } from '../components/ticketbits'
import { isOpen } from './queues'

const BAR = '#0052CC'

export default function Reports() {
  const tickets = useData(() => getTickets())
  const time = useData(() => getTimeEntries())
  const customers = useData(() => getCustomers())
  const now = useNow(60_000)
  const [tab, setTab] = useState<'uebersicht' | 'zeit'>('uebersicht')

  // --- Kennzahlen ---
  const open = tickets.filter(isOpen)
  const slaRelevant = tickets.filter((t) => t.priority !== 'tief')
  const slaDone = slaRelevant.filter((t) => t.firstResponseAt || slaState(t, now).kind === 'breached')
  const slaMet = slaDone.filter((t) => slaState(t, now).kind === 'met')
  const slaPct = slaDone.length ? Math.round((slaMet.length / slaDone.length) * 100) : 100
  const respTimes = tickets.filter((t) => t.firstResponseAt).map((t) => new Date(t.firstResponseAt!).getTime() - new Date(t.createdAt).getTime())
  const avgResp = respTimes.length ? respTimes.reduce((a, b) => a + b, 0) / respTimes.length : 0
  const totalMin = time.reduce((s, x) => s + x.minutes, 0)

  const byStatus = (Object.keys(STATUS_META) as Status[]).map((s) => ({ s, n: tickets.filter((t) => t.status === s).length }))
  const maxStatus = Math.max(1, ...byStatus.map((x) => x.n))

  const byCustomer = customers.map((c) => {
    const list = tickets.filter((t) => t.customerId === c.id)
    const mins = time.filter((x) => list.some((t) => t.id === x.ticketId)).reduce((s, x) => s + x.minutes, 0)
    return { c, total: list.length, open: list.filter(isOpen).length, mins }
  })
  const maxCust = Math.max(1, ...byCustomer.map((x) => x.total))

  const byAgent = AGENTS.filter((a) => a.team !== 'lead').map((a) => {
    const entries = time.filter((x) => x.agentId === a.id)
    const mins = entries.reduce((s, x) => s + x.minutes, 0)
    return { a, open: open.filter((t) => t.assigneeId === a.id).length, mins, count: new Set(entries.map((x) => x.ticketId)).size }
  })
  const maxAgentMin = Math.max(1, ...byAgent.map((x) => x.mins))

  const bySla = (['hoch', 'mittel'] as const).map((p) => {
    const rel = tickets.filter((t) => t.priority === p)
    const done = rel.filter((t) => t.firstResponseAt || slaState(t, now).kind === 'breached')
    const met = done.filter((t) => slaState(t, now).kind === 'met').length
    return { p, total: rel.length, done: done.length, met, pct: done.length ? Math.round((met / done.length) * 100) : 100 }
  })

  return (
    <div className="max-w-[1200px] px-4 py-5 sm:px-8 sm:py-6">
      <div className="text-[13.5px] text-subtle">Projekte / TimeTool Kundensupport / Reports</div>
      <h1 className="mt-1 text-[26px] font-semibold">Reports</h1>
      <p className="text-[14px] text-subtle">
        Zeitaufwand, SLA-Einhaltung und Performance sind auswertbar – für die Leitung Support, ohne Excel.
      </p>

      <div className="mt-4 flex gap-1 border-b border-line">
        {(
          [
            ['uebersicht', 'Übersicht & SLA'],
            ['zeit', 'Zeit & Auslastung'],
          ] as const
        ).map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} className={`-mb-px border-b-2 px-3 py-2 text-[14px] ${tab === id ? 'border-[#0052CC] font-semibold text-[#0052CC]' : 'border-transparent text-[#42526E]'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'uebersicht' && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="Offene Tickets" value={String(open.length)} sub={`${open.filter((t) => !t.assigneeId).length} nicht zugewiesen`} />
            <Tile label="SLA-Einhaltung Erstreaktion" value={`${slaPct} %`} sub={`${slaMet.length} von ${slaDone.length} (Hoch & Mittel)`} good={slaPct >= 90} />
            <Tile label="Ø Zeit bis Erstreaktion" value={`${(avgResp / 3_600_000).toLocaleString('de-CH', { maximumFractionDigits: 1 })} h`} sub="über alle beantworteten Tickets" />
            <Tile label="Antwortzeit System" value="< 2 s" sub="Ziel 95 % · heute Shift Manager 39 s" good />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card title="Tickets nach Status">
              <table className="w-full text-[13.5px]">
                <tbody>
                  {byStatus.map(({ s, n }) => (
                    <tr key={s} title={`${STATUS_META[s].label}: ${n} Tickets`}>
                      <td className="w-[150px] py-1.5">
                        <StatusLozenge status={s} />
                      </td>
                      <td className="py-1.5">
                        <HBar value={n} max={maxStatus} />
                      </td>
                      <td className="w-10 py-1.5 text-right font-semibold tabular-nums">{n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card title="SLA-Einhaltung nach Priorität (Erstreaktion)">
              <table className="w-full text-[13.5px]">
                <thead className="text-[11.5px] font-bold tracking-wide text-subtle uppercase">
                  <tr>
                    <th className="py-1 text-left">Priorität</th>
                    <th className="py-1 text-left">Vorgabe</th>
                    <th className="py-1 text-right">Tickets</th>
                    <th className="py-1 text-right">eingehalten</th>
                  </tr>
                </thead>
                <tbody>
                  {bySla.map((x) => (
                    <tr key={x.p} className="border-t border-line">
                      <td className="py-2 font-semibold">{PRIORITY_META[x.p].label}</td>
                      <td className="py-2 text-subtle">{x.p === 'hoch' ? '2 Stunden' : '1 Arbeitstag'}</td>
                      <td className="py-2 text-right tabular-nums">{x.total}</td>
                      <td className="py-2 text-right font-semibold tabular-nums">
                        {x.met}/{x.done} · {x.pct} %
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-line">
                    <td className="py-2 font-semibold">Tief</td>
                    <td className="py-2 text-subtle">Best Effort</td>
                    <td className="py-2 text-right tabular-nums">{tickets.filter((t) => t.priority === 'tief').length}</td>
                    <td className="py-2 text-right text-subtle">–</td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-2 text-[12px] text-subtle">Heute ist die Einhaltung der zugesicherten Zeiten nicht belegbar – neu wird sie pro Ticket gemessen. <PP ids={['PP09']} /></p>
            </Card>

            <Card title="Tickets pro Kunde" className="lg:col-span-2">
              <table className="w-full text-[13.5px]">
                <thead className="text-[11.5px] font-bold tracking-wide text-subtle uppercase">
                  <tr>
                    <th className="py-1 text-left">Kunde</th>
                    <th className="py-1 text-left">Anzahl Tickets</th>
                    <th className="py-1 text-right">offen</th>
                    <th className="py-1 text-right">total</th>
                    <th className="py-1 text-right">Zeitaufwand</th>
                  </tr>
                </thead>
                <tbody>
                  {byCustomer.map((x) => (
                    <tr key={x.c.id} className="border-t border-line" title={`${x.c.name}: ${x.total} Tickets, davon ${x.open} offen`}>
                      <td className="w-[190px] py-2 font-medium">{x.c.name}</td>
                      <td className="py-2">
                        <HBar value={x.total} max={maxCust} />
                      </td>
                      <td className="w-14 py-2 text-right tabular-nums">{x.open}</td>
                      <td className="w-14 py-2 text-right font-semibold tabular-nums">{x.total}</td>
                      <td className="w-24 py-2 text-right tabular-nums">{fmtHours(x.mins)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </>
      )}

      {tab === 'zeit' && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="Erfasste Zeit" value={fmtHours(totalMin)} sub="alle Tickets" />
            <Tile label="Tickets mit Zeiterfassung" value={String(new Set(time.map((x) => x.ticketId)).size)} sub={`von ${tickets.length} Tickets`} />
            <Tile label="Ø Zeit pro Ticket" value={fmtHours(time.length ? totalMin / new Set(time.map((x) => x.ticketId)).size : 0)} sub="nur Tickets mit Aufwand" />
            <Tile label="Offene Tickets pro Person" value={(open.length / Math.max(1, byAgent.length)).toLocaleString('de-CH', { maximumFractionDigits: 1 })} sub="Durchschnitt Team" />
          </div>
          <Card title="Zeit pro Mitarbeitende" className="mt-6">
            <table className="w-full text-[13.5px]">
              <thead className="text-[11.5px] font-bold tracking-wide text-subtle uppercase">
                <tr>
                  <th className="py-1 text-left">Mitarbeitende</th>
                  <th className="py-1 text-left">Zeit</th>
                  <th className="py-1 text-right">offene Tickets</th>
                  <th className="py-1 text-right">bearbeitete Tickets</th>
                  <th className="py-1 text-right">erfasst</th>
                </tr>
              </thead>
              <tbody>
                {byAgent.map((x) => (
                  <tr key={x.a.id} className="border-t border-line" title={`${x.a.name}: ${fmtHours(x.mins)}`}>
                    <td className="w-[200px] py-2">
                      <span className="flex items-center gap-2">
                        <Avatar initials={x.a.initials} color={x.a.color} size={24} /> {x.a.name}
                      </span>
                    </td>
                    <td className="py-2">
                      <HBar value={x.mins} max={maxAgentMin} />
                    </td>
                    <td className="w-28 py-2 text-right tabular-nums">{x.open}</td>
                    <td className="w-36 py-2 text-right tabular-nums">{x.count}</td>
                    <td className="w-20 py-2 text-right font-semibold tabular-nums">{fmtHours(x.mins)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="mt-4 max-w-3xl text-[12.5px] text-subtle">
            Verrechnung und Stundensätze sind bewusst nicht Teil des Prototyps (out of scope). Ausgewertet wird nur der Zeitaufwand pro Ticket, Mitarbeitende und Kunde.
          </p>
        </>
      )}
    </div>
  )
}

function Tile({ label, value, sub, good }: { label: string; value: string; sub: string; good?: boolean }) {
  return (
    <div className="rounded-md border border-line bg-white p-4">
      <div className="text-[12px] font-semibold text-subtle">{label}</div>
      <div className="mt-1 text-[26px] leading-tight font-semibold text-ink tabular-nums">{value}</div>
      <div className={`mt-0.5 text-[12px] ${good ? 'text-[#006644]' : 'text-subtle'}`}>
        {good ? '✓ ' : ''}
        {sub}
      </div>
    </div>
  )
}

function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-md border border-line bg-white p-4 ${className}`}>
      <h3 className="mb-3 text-[14px] font-semibold">{title}</h3>
      {children}
    </div>
  )
}

function HBar({ value, max }: { value: number; max: number }) {
  return (
    <div className="h-3 w-full">
      {value > 0 && <div className="h-full rounded-r-[4px]" style={{ width: `${Math.max(2, (value / max) * 100)}%`, background: BAR }} />}
    </div>
  )
}
