import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Paperclip, Send, Mail, MessageCircleQuestion, Users } from 'lucide-react'
import type { Contact, Attachment, TicketEvent } from '../lib/types'
import { PRIORITY_META, SLA_TABLE, TEAM_LABEL, agentById, contactById, typeLabel } from '../lib/constants'
import { customerFeedback, customerReply, getEvents, getTicket } from '../lib/actions'
import { useData } from '../lib/store'
import { fmtDateTime, slaState } from '../lib/sla'
import { Avatar, DiffNote, PP, fakeFiles, toast, useNow } from '../components/ui'
import { Attachments, PriorityLabel, StatusLozenge } from '../components/ticketbits'

const STEPS = [
  { id: 'eingang', label: 'Eingegangen', match: ['neu'] },
  { id: 'arbeit', label: 'In Bearbeitung', match: ['in_arbeit', 'warten_kunde', 'second_level'] },
  { id: 'geloest', label: 'Gelöst', match: ['geloest'] },
  { id: 'erledigt', label: 'Erledigt', match: ['geschlossen'] },
]

export default function PortalTicket({ contact }: { contact: Contact }) {
  const { key = '' } = useParams()
  const t = useData(() => getTicket(key), [key])
  const events = useData(() => (t ? getEvents(t.id).filter((e) => e.public) : []), [t?.id])
  const now = useNow()
  const [text, setText] = useState('')
  const [files, setFiles] = useState<Attachment[]>([])
  const [fbNo, setFbNo] = useState(false)
  const [fbText, setFbText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  if (!t || t.customerId !== contact.customerId) {
    return (
      <main className="mx-auto max-w-[900px] px-6 py-16 text-center text-subtle">
        Ticket nicht gefunden oder keine Berechtigung. <Link to="/portal/anfragen" className="text-[#0052CC]">Zu meinen Anfragen</Link>
      </main>
    )
  }

  const stepIdx = STEPS.findIndex((s) => s.match.includes(t.status))
  const sla = slaState(t, now)
  const assignee = agentById(t.assigneeId)
  const closed = t.status === 'geschlossen'

  const send = () => {
    if (!text.trim()) return
    customerReply(t, contact.id, text.trim(), files)
    setText('')
    setFiles([])
    toast(closed || t.status === 'geloest' ? `Rückfrage gesendet – ${t.key} wurde wiedereröffnet.` : 'Antwort gesendet – sie ist im Verlauf des Tickets gespeichert.', 'success')
  }

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6">
      <div className="mb-3 text-[13px] text-subtle">
        <Link to="/portal/anfragen" className="hover:underline">
          Meine Anfragen
        </Link>{' '}
        / {t.key}
      </div>
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <h1 className="flex-1 text-[24px] leading-tight font-semibold">{t.subject}</h1>
        <StatusLozenge status={t.status} customer />
      </div>

      {/* Fortschritt */}
      <div className="mb-5 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold ${i < stepIdx ? 'bg-[#36B37E] text-white' : i === stepIdx ? 'bg-[#0052CC] text-white ring-4 ring-blue-100' : 'bg-slate-200 text-slate-500'}`}
                >
                  {i < stepIdx ? '✓' : i + 1}
                </span>
                <span className={`mt-1.5 text-center text-[12px] ${i === stepIdx ? 'font-semibold text-ink' : 'text-subtle'}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`mx-2 mb-5 h-[3px] flex-1 rounded ${i < stepIdx ? 'bg-[#36B37E]' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>
        <div className="mt-1 text-right">
          <PP ids={['PP05']} label="Status transparent" />
        </div>
      </div>

      {t.status === 'geloest' && (
        <div className="mb-5 rounded-lg border-2 border-[#36B37E] bg-[#E3FCEF] p-5">
          <div className="text-[16px] font-semibold text-[#006644]">Der Support hat Ihre Anfrage gelöst. Sind Sie mit der Lösung einverstanden?</div>
          <p className="mt-1 text-[13.5px] text-[#006644]">Mit Ihrer Bestätigung wird das Ticket geschlossen. Falls das Problem weiterhin besteht, wird es automatisch wiedereröffnet.</p>
          {!fbNo ? (
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  customerFeedback(t, contact.id, true, '')
                  toast('Danke für Ihre Bestätigung – das Ticket ist abgeschlossen.', 'success')
                }}
                className="flex items-center gap-2 rounded bg-[#00875A] px-4 py-2 text-[14px] font-semibold text-white hover:bg-[#006644]"
              >
                <CheckCircle2 size={16} /> Ja, Problem gelöst – Ticket schliessen
              </button>
              <button onClick={() => setFbNo(true)} className="flex items-center gap-2 rounded bg-white px-4 py-2 text-[14px] font-semibold text-[#BF2600] ring-1 ring-[#FF8F73] hover:bg-[#FFEBE6]">
                <XCircle size={16} /> Nein, Problem besteht weiterhin
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <textarea value={fbText} onChange={(e) => setFbText(e.target.value)} rows={3} placeholder="Was funktioniert noch nicht?" className="w-full rounded border-2 border-[#DFE1E6] bg-white px-3 py-2 text-[14px] outline-none focus:border-[#4C9AFF]" />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => {
                    customerFeedback(t, contact.id, false, fbText.trim())
                    setFbNo(false)
                    setFbText('')
                    toast(`${t.key} wurde wiedereröffnet – der Support ist informiert.`, 'warn')
                  }}
                  className="rounded bg-[#DE350B] px-4 py-2 text-[14px] font-semibold text-white"
                >
                  Ticket wiedereröffnen
                </button>
                <button onClick={() => setFbNo(false)} className="rounded px-3 py-2 text-[14px] text-subtle hover:bg-white">
                  Abbrechen
                </button>
              </div>
            </div>
          )}
          <DiffNote kind="fix" ids={['PP12']} className="mt-3">
            Use Case 03 «Ticket schliessen»: Das Ticket wird erst mit Einverständnis des Kunden geschlossen – sonst automatisch wiedereröffnet (kein Übersehen im Posteingang).
          </DiffNote>
        </div>
      )}
      {t.status === 'warten_kunde' && (
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-[#FFE380] bg-[#FFFAE6] p-4 text-[14px] text-[#172B4D]">
          <MessageCircleQuestion size={20} className="shrink-0 text-[#FF8B00]" /> Der Support benötigt Ihre Rückmeldung – bitte antworten Sie unten im Verlauf.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
            <h2 className="text-[16px] font-semibold">Verlauf</h2>
            <span className="text-[12px] text-subtle">
              chronologisch · inkl. E-Mail-Verkehr <PP ids={['PP11']} />
            </span>
          </div>
          <div className="space-y-4 px-5 py-5">
            <div className="rounded-md bg-[#F4F5F7] p-4">
              <div className="mb-1 text-[12px] text-subtle">
                Ursprüngliche Anfrage · {contactById(t.contactId)?.name} · {fmtDateTime(t.createdAt)}
              </div>
              <div className="text-[14px] whitespace-pre-wrap">{t.description}</div>
              <Attachments list={t.attachments} />
            </div>
            {events.map((e) => (
              <CustomerEvent key={e.id} e={e} />
            ))}
          </div>

          <div className="border-t border-slate-200 bg-[#FAFBFC] px-5 py-4">
            <label className="mb-1.5 block text-[13px] font-semibold text-[#42526E]">{closed ? 'Rückfrage zu diesem Ticket stellen' : 'Antwort an den Support'}</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder={closed ? 'Ihre Rückfrage – das Ticket wird dadurch wiedereröffnet …' : 'Ihre Nachricht …'}
              className="w-full rounded-[3px] border-2 border-[#DFE1E6] bg-white px-3 py-2 text-[14px] outline-none focus:border-[#4C9AFF]"
            />
            <Attachments list={files} />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button onClick={send} disabled={!text.trim()} className="flex items-center gap-2 rounded-[3px] bg-[#0052CC] px-4 py-2 text-[14px] font-semibold text-white hover:bg-[#0747A6] disabled:opacity-50">
                <Send size={14} /> {closed ? 'Rückfrage senden' : 'Antwort senden'}
              </button>
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-[3px] px-3 py-2 text-[14px] text-[#42526E] hover:bg-[#EBECF0]">
                <Paperclip size={14} /> Datei anhängen
              </button>
              <input ref={fileRef} type="file" multiple hidden onChange={(e) => setFiles([...files, ...fakeFiles(e.target.files)])} />
            </div>
            {closed && (
              <DiffNote kind="fix" ids={['PP12', 'PP13']} className="mt-3">
                Heute geht eine Antwort auf ein geschlossenes Ticket als einmaliger roter Hinweis in der persönlichen Inbox unter. Neu wird das Ticket wiedereröffnet – ist die zuständige Person abwesend, landet es in der Team-Queue.
              </DiffNote>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-[14px] shadow-sm">
            <h3 className="mb-3 text-[15px] font-semibold">Details</h3>
            <dl className="grid grid-cols-[120px_1fr] gap-y-2.5">
              <dt className="text-subtle">Ticketnummer</dt>
              <dd className="font-semibold text-[#0052CC]">{t.key}</dd>
              <dt className="text-subtle">Anfragetyp</dt>
              <dd>{typeLabel(t.type)}</dd>
              <dt className="text-subtle">Kategorie</dt>
              <dd>{t.category}</dd>
              <dt className="text-subtle">Priorität</dt>
              <dd>
                <PriorityLabel p={t.priority} />
              </dd>
              <dt className="text-subtle">Reaktionszeit</dt>
              <dd>
                {SLA_TABLE[t.priority].reaction}
                {sla.due && (
                  <div className="text-[12.5px]" style={{ color: sla.color }}>
                    {sla.kind === 'met' ? 'eingehalten ✓' : sla.kind === 'breached' ? 'überschritten' : `bis ${fmtDateTime(sla.due.toISOString())}`}
                  </div>
                )}
              </dd>
              <dt className="text-subtle">Erfasst</dt>
              <dd>{fmtDateTime(t.createdAt)}</dd>
              <dt className="text-subtle">Erfasst von</dt>
              <dd>{contactById(t.contactId)?.name}</dd>
              <dt className="text-subtle">Zuständig</dt>
              <dd className="flex items-center gap-2">
                {assignee ? (
                  <>
                    <Avatar initials={assignee.initials} color={assignee.color} size={22} /> {assignee.name}
                  </>
                ) : (
                  <>
                    <Users size={16} className="text-subtle" /> {TEAM_LABEL[t.team]}
                  </>
                )}
              </dd>
            </dl>
            <div className="mt-3">
              <PP ids={['PP04', 'PP09']} label="Zuständigkeit & SLA sichtbar" />
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-[13px] text-subtle shadow-sm">
            <Mail size={14} className="mr-1 inline" /> Sie erhalten bei jeder Antwort des Supports eine E-Mail mit Link zu diesem Ticket. Priorität «{PRIORITY_META[t.priority].label}».
          </div>
        </aside>
      </div>
    </main>
  )
}

function CustomerEvent({ e }: { e: TicketEvent }) {
  if (e.kind === 'reply_agent' || e.kind === 'reply_customer' || e.kind === 'feedback') {
    const isAgent = e.kind === 'reply_agent'
    const a = isAgent ? agentById(e.actor.id) : undefined
    return (
      <div className={`flex gap-3 ${isAgent ? '' : 'flex-row-reverse'}`}>
        <Avatar initials={a ? a.initials : (contactById(e.actor.id)?.initials ?? 'K')} color={a ? a.color : '#FF8B00'} size={32} />
        <div className={`max-w-[85%] rounded-lg px-4 py-3 ${isAgent ? 'bg-[#DEEBFF]' : e.kind === 'feedback' ? 'bg-[#E3FCEF]' : 'bg-[#FFF7E6]'}`}>
          <div className="mb-1 text-[12px] text-subtle">
            <b className="text-ink">{isAgent ? `${e.actor.name} · TimeTool Support` : e.actor.name}</b> · {fmtDateTime(e.at)}
            {isAgent && ' · auch per E-Mail zugestellt'}
          </div>
          <div className="text-[14px] whitespace-pre-wrap">{e.text}</div>
          <Attachments list={e.attachments} />
        </div>
      </div>
    )
  }
  if (e.kind === 'created') return null
  return (
    <div className="flex items-center gap-2 pl-11 text-[12.5px] text-subtle">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      {e.kind === 'email_out' ? <Mail size={12} /> : null}
      <span>{e.text}</span>
      <span className="text-slate-400">· {fmtDateTime(e.at)}</span>
    </div>
  )
}
