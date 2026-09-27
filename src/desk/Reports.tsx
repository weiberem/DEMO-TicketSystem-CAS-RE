import { useState } from 'react'
import { Download, Send } from 'lucide-react'
import type { Status } from '../lib/types'
import { AGENTS, PRIORITY_META, STATUS_META } from '../lib/constants'
import { getCustomer, getCustomers, getTickets, getTimeEntries, transmitToAccounting } from '../lib/actions'
import { useData } from '../lib/store'
import { fmtCHF, fmtHours, slaState } from '../lib/sla'
import { Avatar, DiffNote, PP, toast, useNow } from '../components/ui'
import { StatusLozenge } from '../components/ticketbits'
import { isOpen } from './queues'

const BAR = '#0052CC'
const BAR_SOFT = '#B3D4FF'

export default function Reports() {
  const tickets = useData(() => getTickets())
  const time = useData(() => getTimeEntries())
  const customers = useData(() => getCustomers())
  const now = useNow(60_000)
  const [tab, setTab] = useState<'uebersicht' | 'zeit' | 'leistung'>('uebersicht')

  // --- Kennzahlen ---
  const open = tickets.filter(isOpen)
  const slaRelevant = tickets.filter((t) => t.priority !== 'tief')
  const slaDone = slaRelevant.filter((t) => t.firstResponseAt || slaState(t, now).kind === 'breached')
  const slaMet = slaDone.filter((t) => slaState(t, now).kind === 'met')
  const slaPct = slaDone.length ? Math.round((slaMet.length / slaDone.length) * 100) : 100
  const respTimes = tickets.filter((t) => t.firstResponseAt).map((t) => new Date(t.firstResponseAt!).getTime() - new Date(t.createdAt).getTime())
  const avgResp = respTimes.length ? respTimes.reduce((a, b) => a + b, 0) / respTimes.length : 0
  const totalMin = time.reduce((s, x) => s + x.minutes, 0)
  const billMin = time.filter((x) => x.billable).reduce((s, x) => s + x.minutes, 0)
  const billPct = totalMin ? Math.round((billMin / totalMin) * 100) : 0

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
    const bill = entries.filter((x) => x.billable).reduce((s, x) => s + x.minutes, 0)
    return { a, open: open.filter((t) => t.assigneeId === a.id).length, mins, bill }
  })
  const maxAgentMin = Math.max(1, ...byAgent.map((x) => x.mins))

  const bySla = (['hoch', 'mittel'] as const).map((p) => {
    const rel = tickets.filter((t) => t.priority === p)
    const done = rel.filter((t) => t.firstResponseAt || slaState(t, now).kind === 'breached')
    const met = done.filter((t) => slaState(t, now).kind === 'met').length
    return { p, total: rel.length, done: done.length, met, pct: done.length ? Math.round((met / done.length) * 100) : 100 }
  })

  // --- Leistungsdaten für die Buchhaltung ---
  const ready = tickets.filter((t) => t.status === 'geschlossen' && t.billing === 'verrechenbar')
  const transmitted = tickets.filter((t) => t.billing === 'uebermittelt')
  const ledger = customers
    .map((c) => {
      const ts = ready.filter((t) => t.customerId === c.id)
      const entries = time.filter((x) => x.billable && ts.some((t) => t.id === x.ticketId))
      const mins = entries.reduce((s, x) => s + x.minutes, 0)
      const amount = entries.reduce((s, x) => s + (x.minutes / 60) * x.rate, 0)
      return { c, ts, mins, amount }
    })
    .filter((x) => x.ts.length)

  const exportCsv = () => {
    const rows = [['Kundennummer', 'Kunde', 'Ticket', 'Betreff', 'Datum', 'Mitarbeitende', 'Tätigkeit', 'Minuten', 'Stundensatz CHF', 'Betrag CHF']]
    for (const t of ready)
      for (const x of time.filter((e) => e.ticketId === t.id && e.billable))
        rows.push([
          getCustomer(t.customerId)?.nr ?? '',
          getCustomer(t.customerId)?.name ?? '',
          t.key,
          t.subject,
          x.at.slice(0, 10),
          AGENTS.find((a) => a.id === x.agentId)?.name ?? '',
          x.note,
          String(x.minutes),
          String(x.rate),
          ((x.minutes / 60) * x.rate).toFixed(2),
        ])
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `leistungsdaten-buchhaltung-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className="max-w-[1200px] px-4 py-5 sm:px-8 sm:py-6">
      <div className="text-[13.5px] text-subtle">Projekte / TimeTool Kundensupport / Reports</div>
      <h1 className="mt-1 text-[26px] font-semibold">Reports</h1>
      <p className="text-[14px] text-subtle">
        Zeitaufwand, SLA-Einhaltung und Performance sind auswertbar – Leitung Support und Buchhaltung ohne Excel. <PP ids={['PP16']} />
      </p>

      <div className="mt-4 flex gap-1 border-b border-line">
        {(
          [
            ['uebersicht', 'Übersicht & SLA'],
            ['zeit', 'Zeit & Auslastung'],
            ['leistung', 'Leistungsdaten Buchhaltung'],
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
            <Tile label="Davon verrechenbar" value={fmtHours(billMin)} sub={`${fmtHours(totalMin - billMin)} Kulanz / intern`} />
            <Tile label="Verrechenbarkeitsquote" value={`${billPct} %`} sub="Ziel: 75 % der Arbeitszeit" good={billPct >= 75} />
            <Tile label="Leistungswert" value={fmtCHF(time.filter((x) => x.billable).reduce((s, x) => s + (x.minutes / 60) * x.rate, 0))} sub="Zeit × Kundentarif" />
          </div>
          <Card title="Zeit pro Mitarbeitende" className="mt-6">
            <div className="mb-2 flex items-center gap-4 text-[12px] text-subtle">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: BAR }} /> verrechenbar
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: BAR_SOFT }} /> nicht verrechenbar
              </span>
            </div>
            <table className="w-full text-[13.5px]">
              <thead className="text-[11.5px] font-bold tracking-wide text-subtle uppercase">
                <tr>
                  <th className="py-1 text-left">Mitarbeitende</th>
                  <th className="py-1 text-left">Zeit</th>
                  <th className="py-1 text-right">offene Tickets</th>
                  <th className="py-1 text-right">erfasst</th>
                  <th className="py-1 text-right">Quote</th>
                </tr>
              </thead>
              <tbody>
                {byAgent.map((x) => (
                  <tr key={x.a.id} className="border-t border-line" title={`${x.a.name}: ${fmtHours(x.bill)} verrechenbar, ${fmtHours(x.mins - x.bill)} nicht verrechenbar`}>
                    <td className="w-[200px] py-2">
                      <span className="flex items-center gap-2">
                        <Avatar initials={x.a.initials} color={x.a.color} size={24} /> {x.a.name}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="flex h-3 w-full gap-[2px]">
                        <div className="h-full rounded-l-[3px]" style={{ width: `${(x.bill / maxAgentMin) * 100}%`, background: BAR }} />
                        {x.mins - x.bill > 0 && <div className="h-full rounded-r-[3px]" style={{ width: `${((x.mins - x.bill) / maxAgentMin) * 100}%`, background: BAR_SOFT }} />}
                      </div>
                    </td>
                    <td className="w-24 py-2 text-right tabular-nums">{x.open}</td>
                    <td className="w-20 py-2 text-right font-semibold tabular-nums">{fmtHours(x.mins)}</td>
                    <td className="w-16 py-2 text-right tabular-nums">{x.mins ? Math.round((x.bill / x.mins) * 100) : 0} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <DiffNote kind="fix" ids={['PP16']} className="mt-4 max-w-3xl">
            Heute gibt es kein Dashboard zur Verrechnung – das Ziel «75 % der Arbeitszeit verrechenbar» ist nicht messbar. Neu wird der Zeitaufwand pro Ticket, Mitarbeitende und Kunde ausgewertet.
          </DiffNote>
        </>
      )}

      {tab === 'leistung' && (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="flex-1 text-[14px] text-[#42526E]">
              Geschlossene, vom Kunden bestätigte und verrechenbare Tickets – bereit für die <b>Stundenabrechnung</b> (Use Case nach «Ticket schliessen»).
            </div>
            <button onClick={exportCsv} disabled={!ready.length} className="flex items-center gap-1.5 rounded-[3px] border border-line px-3 py-1.5 text-[14px] text-[#42526E] hover:bg-slate-50 disabled:opacity-50">
              <Download size={15} /> CSV exportieren
            </button>
            <button
              disabled={!ready.length}
              onClick={() => {
                transmitToAccounting(ready.map((t) => t.id))
                toast(`${ready.length} Tickets an die Buchhaltung übermittelt.`, 'success')
              }}
              className="flex items-center gap-1.5 rounded-[3px] bg-[#0052CC] px-3 py-1.5 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              <Send size={15} /> An Buchhaltung übermitteln
            </button>
          </div>
          <Card title="Leistungsdaten pro Kunde (Schnittstelle Buchhaltung)" className="mt-4">
            <table className="w-full text-[13.5px]">
              <thead className="text-[11.5px] font-bold tracking-wide text-subtle uppercase">
                <tr>
                  <th className="py-1 text-left">Kd.-Nr.</th>
                  <th className="py-1 text-left">Kunde</th>
                  <th className="py-1 text-left">Tickets</th>
                  <th className="py-1 text-right">Stunden</th>
                  <th className="py-1 text-right">Tarif</th>
                  <th className="py-1 text-right">Betrag</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((x) => (
                  <tr key={x.c.id} className="border-t border-line">
                    <td className="py-2 font-mono text-[12.5px]">{x.c.nr}</td>
                    <td className="py-2 font-medium">{x.c.name}</td>
                    <td className="py-2 text-[12.5px] text-subtle">{x.ts.map((t) => t.key).join(', ')}</td>
                    <td className="py-2 text-right tabular-nums">{fmtHours(x.mins)}</td>
                    <td className={`py-2 text-right tabular-nums ${x.c.rate !== 200 ? 'font-semibold text-[#974F0C]' : ''}`}>CHF {x.c.rate}.–</td>
                    <td className="py-2 text-right font-semibold tabular-nums">{fmtCHF(x.amount)}</td>
                  </tr>
                ))}
                {ledger.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-subtle">
                      Keine offenen Leistungsdaten – alles übermittelt.
                    </td>
                  </tr>
                )}
              </tbody>
              {ledger.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-line">
                    <td colSpan={3} className="py-2 font-semibold">
                      Total
                    </td>
                    <td className="py-2 text-right font-semibold tabular-nums">{fmtHours(ledger.reduce((s, x) => s + x.mins, 0))}</td>
                    <td />
                    <td className="py-2 text-right font-bold tabular-nums">{fmtCHF(ledger.reduce((s, x) => s + x.amount, 0))}</td>
                  </tr>
                </tfoot>
              )}
            </table>
            <p className="mt-3 text-[12.5px] text-subtle">Bereits übermittelt: {transmitted.length} Tickets.</p>
          </Card>
          <DiffNote kind="fix" ids={['PP16']} className="mt-4 max-w-3xl">
            Systemgrenze: Die Verrechnung selbst bleibt ausserhalb des Ticketing-Systems. Das System liefert der Buchhaltung die Leistungsdaten – Stunden pro Kunde mit dem hinterlegten Stundensatz – über eine Schnittstelle.
          </DiffNote>
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
