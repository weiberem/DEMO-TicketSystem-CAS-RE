import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Download, Columns3, Zap, UserPlus, Plus } from 'lucide-react'
import type { Priority, RequestType, Status, Ticket } from '../lib/types'
import { PRIORITY_META, REQUEST_TYPES, STATUS_META, agentById, typeLabel } from '../lib/constants'
import { assign, getCustomer, getCustomers, getTickets } from '../lib/actions'
import { useData } from '../lib/store'
import { Avatar, DiffNote, PP, toast, useNow } from '../components/ui'
import { PriorityLabel, SlaLabel, StatusLozenge } from '../components/ticketbits'
import { QUEUES, sortQueue, type QueueDef } from './queues'
import { useAgent } from './Desk'

export default function Queue({ queueId: fixed }: { queueId?: string }) {
  const params = useParams()
  const [sp] = useSearchParams()
  const queueId = fixed ?? params.queueId ?? 'alle'
  const search = sp.get('q') ?? ''
  const { agent } = useAgent()
  const now = useNow()
  const [fPrio, setFPrio] = useState<Priority | ''>('')
  const [fCust, setFCust] = useState('')
  const [fType, setFType] = useState<RequestType | ''>('')
  const [fStatus, setFStatus] = useState<Status | ''>('')
  // Renderzeit der Ansicht messen (Vergleich zum Shift Manager mit 39 s)
  const t0 = useMemo(() => performance.now(), [queueId])
  const [loadMs, setLoadMs] = useState<number | null>(null)
  useEffect(() => {
    setLoadMs(Math.max(1, Math.round(performance.now() - t0)))
  }, [t0])

  const all = useData(() => getTickets())
  const q: QueueDef =
    queueId === 'suche'
      ? { id: 'suche', label: `Suche: «${search}»`, group: 'queues', test: () => true }
      : (QUEUES.find((x) => x.id === queueId) ?? QUEUES[0])
  const sl = search.toLowerCase()
  let list = all.filter((t) => q.test(t, now, agent.id))
  if (queueId === 'suche' && sl)
    list = list.filter((t) => [t.key, t.subject, getCustomer(t.customerId)?.name ?? '', t.category, STATUS_META[t.status].label].some((s) => s.toLowerCase().includes(sl)))
  if (fPrio) list = list.filter((t) => t.priority === fPrio)
  if (fCust) list = list.filter((t) => t.customerId === fCust)
  if (fType) list = list.filter((t) => t.type === fType)
  if (fStatus) list = list.filter((t) => t.status === fStatus)
  list = sortQueue(list, q, now)

  const exportCsv = () => {
    const rows = [['Schlüssel', 'Zusammenfassung', 'Kunde', 'Typ', 'Kategorie', 'Priorität', 'Status', 'Bearbeiter', 'Erstellt']]
    for (const t of list)
      rows.push([t.key, t.subject, getCustomer(t.customerId)?.name ?? '', typeLabel(t.type), t.category, PRIORITY_META[t.priority].label, STATUS_META[t.status].label, agentById(t.assigneeId)?.name ?? '', t.createdAt])
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `queue-${q.id}.csv`
    a.click()
  }

  const subtitle =
    q.id === 'second'
      ? 'Nur dem Second Level zugewiesene Tickets · chronologisch sortiert · nicht zugewiesene sind hervorgehoben'
      : q.id === 'rueckmeldung'
        ? 'Antworten von Kunden – auch auf gelöste/geschlossene Tickets – bis sie bearbeitet sind'
        : 'Ein zentraler Eingang für Portal- und E-Mail-Anfragen · SLA-gesteuert · nach Priorität sortiert'

  return (
    <div className="px-4 py-5 sm:px-8 sm:py-6">
      <div className="text-[13.5px] text-subtle">Projekte / TimeTool Kundensupport / Queues</div>
      <div className="mt-1 flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="text-[26px] font-semibold text-ink">{q.label}</h1>
          <p className="text-[14px] text-subtle">
            {subtitle} <PP ids={q.id === 'second' ? ['PP13', 'PP18'] : ['PP06', 'PP09']} />
          </p>
        </div>
        {loadMs !== null && (
          <span className="flex items-center gap-1.5 rounded-full bg-[#E3FCEF] px-3 py-1 text-[12.5px] font-medium text-[#006644]" title="Gemessene Renderzeit dieser Ansicht">
            <Zap size={13} /> geladen in {loadMs} ms · Ziel &lt; 2 s <PP ids={['PP07']} />
          </span>
        )}
      </div>

      <div className="mt-4 mb-3 flex flex-wrap items-center gap-2">
        <FilterSelect label="Priorität" value={fPrio} onChange={(v) => setFPrio(v as Priority | '')} options={(['hoch', 'mittel', 'tief'] as Priority[]).map((p) => [p, PRIORITY_META[p].label])} />
        <FilterSelect label="Kunde" value={fCust} onChange={setFCust} options={getCustomers().map((c) => [c.id, c.name])} />
        <FilterSelect label="Kategorie" value={fType} onChange={(v) => setFType(v as RequestType | '')} options={REQUEST_TYPES.map((r) => [r.id, r.short])} />
        <FilterSelect label="Status" value={fStatus} onChange={(v) => setFStatus(v as Status | '')} options={(Object.keys(STATUS_META) as Status[]).map((s) => [s, STATUS_META[s].label])} />
        <div className="ml-auto flex gap-2">
          <button onClick={() => toast('Spaltenauswahl – im Prototyp fix konfiguriert.')} className="flex items-center gap-1.5 rounded-[3px] border border-line px-3 py-1.5 text-[14px] text-[#42526E] hover:bg-slate-50">
            <Columns3 size={15} /> Spalten
          </button>
          <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-[3px] border border-line px-3 py-1.5 text-[14px] text-[#42526E] hover:bg-slate-50">
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[1120px] text-left text-[14px]">
          <thead className="border-b-2 border-line bg-[#FAFBFC] text-[11.5px] font-bold tracking-wide text-subtle uppercase">
            <tr>
              <th className="px-4 py-3">Schlüssel</th>
              <th className="min-w-[300px] px-3 py-3">Zusammenfassung</th>
              <th className="px-3 py-3">Kunde</th>
              <th className="px-3 py-3">Kategorie</th>
              <th className="px-3 py-3">Priorität</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">
                SLA
                <br />
                (Erstreaktion)
              </th>
              <th className="px-3 py-3">Bearbeiter</th>
            </tr>
          </thead>
          <tbody>
            {list.map((t) => (
              <Row key={t.id} t={t} now={now} me={agent.id} highlightUnassigned={q.id === 'second'} />
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-subtle">
                  Keine Tickets in dieser Queue. 🎉
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-[12.5px] text-subtle">{list.length} Tickets</div>

      {q.id === 'alle' && (
        <DiffNote kind="fix" ids={['PP07', 'PP09', 'PP13']} className="mt-4 max-w-3xl">
          Heute: «Shift Manager» lädt 39 s, alle Tickets «Normal», Zuteilung im täglichen 11:30-Meeting. Neu: Queue in Millisekunden, Priorität und SLA-Uhr pro Ticket, Zuweisung an Person oder Team direkt in der Zeile.
        </DiffNote>
      )}
    </div>
  )
}

function Row({ t, now, me, highlightUnassigned }: { t: Ticket; now: number; me: string; highlightUnassigned: boolean }) {
  const a = agentById(t.assigneeId)
  const c = getCustomer(t.customerId)
  const unassignedHL = highlightUnassigned && !t.assigneeId
  const sub =
    t.team === 'second' && t.escalationReason
      ? `Eskaliert · Grund: ${t.escalationReason}`
      : t.channel === 'email'
        ? 'Eingang: E-Mail → automatisch verknüpft'
        : t.channel === 'telefon'
          ? 'Eingang: Telefon · im Namen des Kunden erfasst'
          : `Eingang: Kundenportal${t.phoneConfirmed ? ' · telefonisch bestätigt' : ''}`
  return (
    <tr className={`border-b border-line hover:bg-[#F4F5F7] ${unassignedHL ? 'bg-[#F4F8FF]' : ''}`}>
      <td className="px-4 py-3 align-top">
        <Link to={`/desk/ticket/${t.key}`} className="font-semibold text-[#0052CC] hover:underline">
          {t.key}
        </Link>
      </td>
      <td className="px-3 py-3 align-top">
        <Link to={`/desk/ticket/${t.key}`} className={`text-ink hover:underline ${t.customerUpdate || unassignedHL ? 'font-semibold' : ''}`}>
          {t.subject}
        </Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12.5px] text-subtle">
          <span className="line-clamp-1">{sub}</span>
          {t.team === 'second' && t.assigneeId && <span className="rounded bg-[#DEEBFF] px-1.5 text-[11.5px] font-medium text-[#0052CC]">@{agentById(t.assigneeId)?.short}</span>}
          {t.customerUpdate && <span className="rounded bg-[#E6FCFF] px-1.5 text-[11.5px] font-semibold text-[#0087A0]">● Neue Kundenantwort</span>}
          {t.reopenedCount > 0 && t.status !== 'geschlossen' && <span className="rounded bg-[#FFF0B3] px-1.5 text-[11.5px] font-semibold text-[#172B4D]">Wiedereröffnet</span>}
        </div>
      </td>
      <td className="min-w-[120px] px-3 py-3 align-top">{c?.name}</td>
      <td className="px-3 py-3 align-top">
        <span className="inline-block rounded-[3px] bg-[#F4F5F7] px-2 py-0.5 text-[13px] whitespace-nowrap text-[#42526E]">{typeLabel(t.type)}</span>
      </td>
      <td className="px-3 py-3 align-top">
        <PriorityLabel p={t.priority} />
      </td>
      <td className="px-3 py-3 align-top">
        <StatusLozenge status={t.status} />
      </td>
      <td className="px-3 py-3 align-top text-[13.5px]">
        <SlaLabel t={t} now={now} />
      </td>
      <td className="px-3 py-3 align-top">
        {a ? (
          <span className="flex items-center gap-2 whitespace-nowrap">
            <Avatar initials={a.initials} color={a.color} size={26} /> {a.short}
          </span>
        ) : (
          <button
            onClick={() => {
              assign(t, me, me)
              toast(`${t.key} dir zugewiesen.`, 'success')
            }}
            className="group flex items-center gap-2 text-left text-[13.5px] whitespace-nowrap text-subtle"
            title="Mir zuweisen"
          >
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-dashed border-slate-300 group-hover:border-[#0052CC] group-hover:text-[#0052CC]">
              <Plus size={12} className="hidden group-hover:block" />
              <UserPlus size={12} className="group-hover:hidden" />
            </span>
            <span className={unassignedHL ? 'font-semibold text-[#0052CC]' : ''}>
              <span className="group-hover:hidden">Nicht zugewiesen</span>
              <span className="hidden text-[#0052CC] group-hover:inline">Mir zuweisen</span>
            </span>
          </button>
        )}
      </td>
    </tr>
  )
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  const active = !!value
  return (
    <label className={`relative flex items-center rounded-[3px] border-2 text-[14px] font-medium ${active ? 'border-[#0052CC] bg-[#DEEBFF] text-[#0052CC]' : 'border-line bg-white text-[#42526E] hover:bg-slate-50'}`}>
      <span className="pointer-events-none py-1 pr-1 pl-3">
        {label}: {active ? options.find((o) => o[0] === value)?.[1] : 'alle'} ▾
      </span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
        <option value="">alle</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <span className="w-2" />
    </label>
  )
}
