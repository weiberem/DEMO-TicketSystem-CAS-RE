import { useState } from 'react'
import { Plane, Save } from 'lucide-react'
import { AGENTS, CONTACTS } from '../lib/constants'
import type { Customer } from '../lib/types'
import { getAgentStatus, getCustomers, setAbsent, updateCustomer } from '../lib/actions'
import { useData } from '../lib/store'
import { Avatar, DiffNote, PP, toast } from '../components/ui'

export default function Customers() {
  const customers = useData(() => getCustomers())
  const statuses = useData(() => AGENTS.map((a) => getAgentStatus(a.id)))
  return (
    <div className="max-w-[1100px] px-4 py-5 sm:px-8 sm:py-6">
      <div className="text-[13.5px] text-subtle">Projekte / TimeTool Kundensupport / Einstellungen</div>
      <h1 className="mt-1 text-[26px] font-semibold">Kunden, Tarife & Team</h1>

      <section className="mt-5">
        <h2 className="mb-1 text-[17px] font-semibold">
          Tariftabelle pro Kunde <PP ids={['PP16']} />
        </h2>
        <p className="mb-3 text-[13.5px] text-subtle">Der Stundensatz wird bei jeder Zeiterfassung automatisch übernommen und mit der Arbeitszeit multipliziert.</p>
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[760px] text-left text-[14px]">
            <thead className="border-b-2 border-line bg-[#FAFBFC] text-[11.5px] font-bold tracking-wide text-subtle uppercase">
              <tr>
                <th className="px-4 py-2.5">Kd.-Nr.</th>
                <th className="px-3 py-2.5">Kunde</th>
                <th className="px-3 py-2.5">HR-Ansprechperson(en)</th>
                <th className="px-3 py-2.5">Vertrag</th>
                <th className="px-3 py-2.5">Stundensatz CHF</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <CustomerRow key={c.id + c.rate + c.contract} c={c} />
              ))}
            </tbody>
          </table>
        </div>
        <DiffNote kind="pain" ids={['PP16']} className="mt-3 max-w-3xl">
          Ist-Zustand: «Bei Sebi-Sport gilt noch der alte Stundensatz von CHF 180.– – das musst du manuell erfassen.» Dieses Wissen steht heute nirgends im System.
        </DiffNote>
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-[17px] font-semibold">
          Team & Abwesenheiten <PP ids={['PP13']} />
        </h2>
        <p className="mb-3 text-[13.5px] text-subtle">Rückmeldungen zu Tickets abwesender Personen gehen automatisch in die Team-Queue statt in eine persönliche Inbox.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {AGENTS.filter((a) => a.team !== 'lead').map((a, i) => {
            const st = statuses[i]
            return (
              <div key={a.id} className="flex items-center gap-3 rounded-md border border-line p-3">
                <Avatar initials={a.initials} color={a.color} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{a.name}</div>
                  <div className="text-[12.5px] text-subtle">
                    {a.roleLabel} · {a.team === 'second' ? 'Team Second Level' : 'Team First Level'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setAbsent(a.id, !st.absent, st.absent ? undefined : 'Ferien')
                    toast(st.absent ? `${a.name} ist wieder anwesend.` : `${a.name} als abwesend markiert – Rückmeldungen gehen an die Team-Queue.`)
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold ${st.absent ? 'bg-[#FFEBE6] text-[#BF2600]' : 'bg-[#E3FCEF] text-[#006644]'}`}
                >
                  {st.absent ? (
                    <>
                      <Plane size={13} /> {st.absentNote ?? 'Abwesend'}
                    </>
                  ) : (
                    'Anwesend'
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function CustomerRow({ c }: { c: Customer }) {
  const [rate, setRate] = useState(String(c.rate))
  const [contract, setContract] = useState(c.contract)
  const dirty = Number(rate) !== c.rate || contract !== c.contract
  const hr = CONTACTS.filter((p) => p.customerId === c.id && p.role === 'HR' && p.active)
  return (
    <tr className={`border-b border-line ${c.rate !== 200 ? 'bg-[#FFFAE6]' : ''}`}>
      <td className="px-4 py-2.5 font-mono text-[13px]">{c.nr}</td>
      <td className="px-3 py-2.5 font-medium">{c.name}</td>
      <td className="px-3 py-2.5 text-[13px] text-subtle">{hr.map((p) => p.name).join(', ')}</td>
      <td className="px-3 py-2.5">
        <input value={contract} onChange={(e) => setContract(e.target.value)} className="w-full rounded-[3px] border-2 border-transparent bg-transparent px-1.5 py-1 hover:bg-[#EBECF0] focus:border-[#4C9AFF] focus:bg-white" />
      </td>
      <td className="px-3 py-2.5">
        <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} className="w-24 rounded-[3px] border-2 border-line bg-white px-2 py-1 text-right font-semibold" />
      </td>
      <td className="px-3 py-2.5 text-right">
        <button
          disabled={!dirty || !(Number(rate) > 0)}
          onClick={() => {
            updateCustomer({ ...c, rate: Number(rate), contract })
            toast(`Tarif ${c.name}: CHF ${rate}.–/h gespeichert.`, 'success')
          }}
          className="inline-flex items-center gap-1 rounded-[3px] bg-[#0052CC] px-3 py-1 text-[13px] font-semibold text-white disabled:bg-slate-200 disabled:text-slate-400"
        >
          <Save size={13} /> Speichern
        </button>
      </td>
    </tr>
  )
}
