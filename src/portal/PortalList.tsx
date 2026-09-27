import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus } from 'lucide-react'
import type { Contact, Ticket } from '../lib/types'
import { contactById, typeLabel } from '../lib/constants'
import { getCustomer, getTickets } from '../lib/actions'
import { useData } from '../lib/store'
import { fmtDate } from '../lib/sla'
import { PP } from '../components/ui'
import { PriorityLabel, StatusLozenge } from '../components/ticketbits'

const FILTERS: { id: string; label: string; test: (t: Ticket) => boolean }[] = [
  { id: 'offen', label: 'Offen', test: (t) => !['geloest', 'geschlossen'].includes(t.status) },
  { id: 'geloest', label: 'Bestätigung ausstehend', test: (t) => t.status === 'geloest' },
  { id: 'erledigt', label: 'Erledigt', test: (t) => t.status === 'geschlossen' },
  { id: 'alle', label: 'Alle', test: () => true },
]

export default function PortalList({ contact }: { contact: Contact }) {
  const [f, setF] = useState('alle')
  const [q, setQ] = useState('')
  const all = useData(() => getTickets().filter((t) => t.customerId === contact.customerId), [contact.customerId])
  const filter = FILTERS.find((x) => x.id === f)!
  const ql = q.toLowerCase()
  const list = all
    .filter(filter.test)
    .filter((t) => !ql || t.subject.toLowerCase().includes(ql) || t.key.toLowerCase().includes(ql) || t.category.toLowerCase().includes(ql))
    .sort((a, b) => b.number - a.number)

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-[24px] font-semibold">Meine Anfragen</h1>
          <p className="text-[14px] text-subtle">
            Alle Tickets von {getCustomer(contact.customerId)?.name} mit aktuellem Status <PP ids={['PP04', 'PP05']} />
          </p>
        </div>
        <Link to="/portal" className="flex items-center gap-1.5 rounded-[3px] bg-[#0052CC] px-4 py-2 text-[14px] font-semibold text-white hover:bg-[#0747A6]">
          <Plus size={15} /> Neue Anfrage
        </Link>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {FILTERS.map((x) => (
          <button
            key={x.id}
            onClick={() => setF(x.id)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium ${f === x.id ? 'bg-[#0052CC] text-white' : 'bg-white text-[#42526E] ring-1 ring-slate-200 hover:bg-slate-50'}`}
          >
            {x.label} <span className="opacity-70">({all.filter(x.test).length})</span>
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-72">
          <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suche nach Nummer, Titel, Kategorie" className="w-full rounded-[3px] border-2 border-[#DFE1E6] bg-white py-1.5 pr-3 pl-9 text-[14px] outline-none focus:border-[#4C9AFF]" />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-[14px]">
          <thead className="hidden bg-[#FAFBFC] text-[11.5px] font-bold tracking-wide text-subtle uppercase md:table-header-group">
            <tr>
              <th className="px-4 py-2.5">Nummer</th>
              <th className="px-4 py-2.5">Anfrage</th>
              <th className="px-4 py-2.5">Typ</th>
              <th className="px-4 py-2.5">Priorität</th>
              <th className="px-4 py-2.5">Erfasst</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id} className="block border-t border-slate-100 px-4 py-3 hover:bg-slate-50 md:table-row md:p-0">
                <td className="md:px-4 md:py-3">
                  <Link to={`/portal/ticket/${t.key}`} className="font-semibold text-[#0052CC] hover:underline">
                    {t.key}
                  </Link>
                </td>
                <td className="md:px-4 md:py-3">
                  <Link to={`/portal/ticket/${t.key}`} className="text-ink hover:underline">
                    {t.subject}
                  </Link>
                  <div className="text-[12px] text-subtle">
                    {t.category} · von {contactById(t.contactId)?.name}
                  </div>
                </td>
                <td className="hidden text-subtle md:table-cell md:px-4 md:py-3">{typeLabel(t.type)}</td>
                <td className="inline-block pr-3 md:table-cell md:px-4 md:py-3">
                  <PriorityLabel p={t.priority} />
                </td>
                <td className="hidden text-subtle md:table-cell md:px-4 md:py-3">{fmtDate(t.createdAt)}</td>
                <td className="inline-block md:table-cell md:px-4 md:py-3">
                  <StatusLozenge status={t.status} customer />
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-subtle">
                  Keine Anfragen in dieser Ansicht.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}
