import { Plane } from 'lucide-react'
import { AGENTS, CONTACTS } from '../lib/constants'
import { getAgentStatus, getCustomers, setAbsent } from '../lib/actions'
import { useData } from '../lib/store'
import { Avatar, PP, toast } from '../components/ui'

export default function Customers() {
  const customers = useData(() => getCustomers())
  const statuses = useData(() => AGENTS.map((a) => getAgentStatus(a.id)))
  return (
    <div className="max-w-[1100px] px-4 py-5 sm:px-8 sm:py-6">
      <div className="text-[13.5px] text-subtle">Projekte / TimeTool Kundensupport / Einstellungen</div>
      <h1 className="mt-1 text-[26px] font-semibold">Kunden & Team</h1>

      <section className="mt-5">
        <h2 className="mb-1 text-[17px] font-semibold">Kunden</h2>
        <p className="mb-3 text-[13.5px] text-subtle">Nur die hinterlegten HR-Ansprechpersonen können Tickets im Kundenportal erfassen.</p>
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <thead className="border-b-2 border-line bg-[#FAFBFC] text-[11.5px] font-bold tracking-wide text-subtle uppercase">
              <tr>
                <th className="px-4 py-2.5">Kd.-Nr.</th>
                <th className="px-3 py-2.5">Kunde</th>
                <th className="px-3 py-2.5">Ort</th>
                <th className="px-3 py-2.5">HR-Ansprechperson(en)</th>
                <th className="px-3 py-2.5">Vertrag</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-line">
                  <td className="px-4 py-2.5 font-mono text-[13px]">{c.nr}</td>
                  <td className="px-3 py-2.5 font-medium">{c.name}</td>
                  <td className="px-3 py-2.5 text-subtle">{c.city}</td>
                  <td className="px-3 py-2.5 text-[13px]">
                    {CONTACTS.filter((p) => p.customerId === c.id && p.role === 'HR' && p.active)
                      .map((p) => p.name)
                      .join(', ')}
                  </td>
                  <td className="px-3 py-2.5 text-[13px] text-subtle">{c.contract}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
