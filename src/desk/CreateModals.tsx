import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Priority, RequestType } from '../lib/types'
import { CATEGORIES, CONTACTS, PRIORITY_META, REQUEST_TYPES, allowedPriorities, defaultPriority } from '../lib/constants'
import { createTicket, getCustomers } from '../lib/actions'
import { DiffNote, Modal, toast } from '../components/ui'
import { useAgent } from './Desk'

const inp = 'w-full rounded-[3px] border-2 border-line bg-[#FAFBFC] px-3 py-2 text-[14px] outline-none focus:border-[#4C9AFF] focus:bg-white'
const lbl = 'mb-1 block text-[13px] font-semibold text-[#42526E]'

/** Support erfasst ein Ticket im Namen eines Kunden (z. B. nach Anruf auf der Hotline). */
export function CreateTicketModal({ onClose }: { onClose: () => void }) {
  const { agent } = useAgent()
  const nav = useNavigate()
  const customers = getCustomers()
  const [customerId, setCustomerId] = useState(customers[0].id)
  const hr = CONTACTS.filter((c) => c.customerId === customerId && c.role === 'HR' && c.active)
  const [contactId, setContactId] = useState(hr[0]?.id ?? '')
  const [type, setType] = useState<RequestType>('incident')
  const [priority, setPriority] = useState<Priority>('mittel')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const valid = contactId && subject.trim().length > 3 && description.trim().length > 5

  const submit = async () => {
    const t = await createTicket({
      customerId,
      contactId,
      type,
      category,
      priority,
      subject: subject.trim(),
      description: description.trim(),
      attachments: [],
      channel: 'telefon',
      createdByAgentId: agent.id,
    })
    toast(`${t.key} im Namen des Kunden erstellt – Eingangsbestätigung versendet.`, 'success')
    onClose()
    nav(`/desk/ticket/${t.key}`)
  }

  return (
    <Modal title="Ticket im Namen eines Kunden erstellen" onClose={onClose} width={620}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={lbl}>Kunde</label>
          <select
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value)
              setContactId(CONTACTS.find((c) => c.customerId === e.target.value && c.role === 'HR' && c.active)?.id ?? '')
            }}
            className={inp}
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.nr})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={lbl}>HR-Ansprechperson</label>
          <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={inp}>
            {hr.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={lbl}>Anfragetyp</label>
          <select
            value={type}
            onChange={(e) => {
              const v = e.target.value as RequestType
              setType(v)
              if (!allowedPriorities(v).includes(priority)) setPriority(defaultPriority(v))
            }}
            className={inp}
          >
            {REQUEST_TYPES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.short}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={lbl}>Priorität</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={inp} style={{ color: PRIORITY_META[priority].color, fontWeight: 600 }}>
            {allowedPriorities(type).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_META[p].label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={lbl}>Kategorie</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inp}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={lbl}>Betreff</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inp} />
        </div>
        <div className="sm:col-span-2">
          <label className={lbl}>Beschreibung</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inp} />
        </div>
      </div>
      <DiffNote kind="fix" ids={['PP06']} className="mt-3">
        Anforderung: Support kann Tickets im Namen des Kunden erstellen – auch telefonische Meldungen landen im selben Kanal.
      </DiffNote>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded px-4 py-2 text-[14px] text-[#42526E] hover:bg-slate-100">
          Abbrechen
        </button>
        <button disabled={!valid} onClick={submit} className="rounded bg-[#0052CC] px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-50">
          Erstellen
        </button>
      </div>
    </Modal>
  )
}

/** Simuliert eine E-Mail an support@timetool.ch, die automatisch als Ticket angelegt und dem Kunden zugeordnet wird. */
export function EmailInModal({ onClose }: { onClose: () => void }) {
  const hr = CONTACTS.filter((c) => c.role === 'HR' && c.active)
  const [contactId, setContactId] = useState(hr[0].id)
  const [subject, setSubject] = useState('Frage zur Ferienplanung 2027')
  const [body, setBody] = useState('Guten Tag\n\nWie können wir die Ferienplanung für 2027 freischalten?\n\nFreundliche Grüsse')
  const nav = useNavigate()
  const c = hr.find((x) => x.id === contactId)!

  const submit = async () => {
    const t = await createTicket({
      customerId: c.customerId,
      contactId,
      type: 'frage',
      category: 'Unkategorisiert (Triage)',
      priority: 'tief',
      subject,
      description: body,
      attachments: [],
      channel: 'email',
    })
    toast(`E-Mail empfangen → ${t.key} erstellt und ${c.name} zugeordnet.`, 'success')
    onClose()
    nav(`/desk/ticket/${t.key}`)
  }

  return (
    <Modal title="E-Mail-Eingang simulieren" onClose={onClose}>
      <div className="mb-3 rounded bg-[#F4F5F7] px-3 py-2 text-[13px]">
        An: <b>support@timetool.ch</b>
      </div>
      <label className={lbl}>Von</label>
      <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={inp}>
        {hr.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name} &lt;{x.email}&gt;
          </option>
        ))}
      </select>
      <label className={`${lbl} mt-3`}>Betreff</label>
      <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inp} />
      <label className={`${lbl} mt-3`}>Text</label>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className={inp} />
      <DiffNote kind="fix" ids={['PP06']} className="mt-3">
        Heute laufen Formular und E-Mail parallel. Neu wird jede E-Mail automatisch zum Ticket in derselben Queue und über die Absenderadresse dem Kunden zugeordnet.
      </DiffNote>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded px-4 py-2 text-[14px] text-[#42526E] hover:bg-slate-100">
          Abbrechen
        </button>
        <button onClick={submit} className="rounded bg-[#0052CC] px-4 py-2 text-[14px] font-semibold text-white">
          E-Mail senden
        </button>
      </div>
    </Modal>
  )
}
