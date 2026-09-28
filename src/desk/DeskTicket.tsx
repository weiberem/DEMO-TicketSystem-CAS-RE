import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowUpRight, Clock, Lock, MessageSquare, Paperclip, Phone, Users, ArrowDownLeft, CheckCircle2, Mail, AtSign } from 'lucide-react'
import type { Status, Ticket, TicketEvent, Priority, RequestType, Attachment } from '../lib/types'
import { AGENTS, CATEGORIES, CHANNEL_LABEL, HOTLINE, PRIORITY_META, REQUEST_TYPES, SLA_TABLE, STATUS_META, TEAM_LABEL, agentById, allowedPriorities, contactById } from '../lib/constants'
import {
  agentNote,
  agentReply,
  assign,
  backToFirstLevel,
  escalate,
  getAgentStatus,
  getCustomer,
  getEvents,
  getTicket,
  getTimeEntries,
  logTime,
  markSeen,
  resolveTicket,
  setStatus,
  updateFields,
} from '../lib/actions'
import { useData } from '../lib/store'
import { fmtDateTime, fmtHours, fmtRelative, slaState } from '../lib/sla'
import { Avatar, DiffNote, Modal, PP, fakeFiles, toast, useNow } from '../components/ui'
import { Attachments, SlaLabel } from '../components/ticketbits'
import { useAgent } from './Desk'

type Tab = 'alle' | 'kommunikation' | 'intern' | 'verlauf'

export default function DeskTicket() {
  const { key = '' } = useParams()
  const t = useData(() => getTicket(key), [key])
  const events = useData(() => (t ? getEvents(t.id) : []), [t?.id])
  const time = useData(() => (t ? getTimeEntries(t.id) : []), [t?.id])
  const { agent } = useAgent()
  const now = useNow()
  const [tab, setTab] = useState<Tab>('alle')
  const [modal, setModal] = useState<'escalate' | 'resolve' | 'back' | null>(null)

  useEffect(() => {
    if (t?.customerUpdate) {
      const h = setTimeout(() => markSeen(t), 2500)
      return () => clearTimeout(h)
    }
  }, [t])

  if (!t) return <div className="p-10 text-subtle">Ticket {key} nicht gefunden.</div>

  const customer = getCustomer(t.customerId)!
  const contact = contactById(t.contactId)
  const minutes = time.reduce((s, x) => s + x.minutes, 0)
  const open = t.status !== 'geloest' && t.status !== 'geschlossen'
  const shown = events.filter((e) =>
    tab === 'alle' ? true : tab === 'kommunikation' ? e.kind === 'reply_agent' || e.kind === 'reply_customer' || e.kind === 'feedback' || e.kind === 'created' : tab === 'intern' ? e.kind === 'note' || e.kind === 'escalate' : !['reply_agent', 'reply_customer', 'note'].includes(e.kind),
  )

  const transitions: Status[] = (['neu', 'in_arbeit', 'warten_kunde', 'geschlossen'] as Status[]).filter((s) => s !== t.status)

  return (
    <div className="px-4 py-5 sm:px-8">
      <div className="text-[13.5px] text-subtle">
        <Link to="/desk/queue/alle" className="hover:underline">
          Queues
        </Link>{' '}
        / {customer.name} / <span className="text-[#0052CC]">{t.key}</span>
      </div>
      <h1 className="mt-1 text-[24px] leading-tight font-semibold">{t.subject}</h1>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <select
            value=""
            onChange={(e) => {
              const s = e.target.value as Status
              if (s === 'geschlossen' && open) {
                toast('Bitte über «Ticket lösen» abschliessen – dann bestätigt der Kunde die Lösung (Use Case 03).', 'warn')
                return
              }
              setStatus(t, agent.id, s)
            }}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            <option value="" disabled>
              Status ändern
            </option>
            {transitions.map((s) => (
              <option key={s} value={s}>
                → {STATUS_META[s].label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none flex items-center gap-2 rounded-[3px] px-3 py-1.5 text-[14px] font-semibold" style={{ background: STATUS_META[t.status].bg, color: STATUS_META[t.status].fg }}>
            {STATUS_META[t.status].label} ▾
          </span>
        </div>
        {open && t.team === 'first' && (
          <button onClick={() => setModal('escalate')} className="flex items-center gap-1.5 rounded-[3px] bg-[#F4F5F7] px-3 py-1.5 text-[14px] font-medium text-[#42526E] hover:bg-[#EBECF0]">
            <ArrowUpRight size={15} /> An Second Level eskalieren
          </button>
        )}
        {open && t.team === 'second' && (
          <button onClick={() => setModal('back')} className="flex items-center gap-1.5 rounded-[3px] bg-[#F4F5F7] px-3 py-1.5 text-[14px] font-medium text-[#42526E] hover:bg-[#EBECF0]">
            <ArrowDownLeft size={15} /> Zurück an First Level
          </button>
        )}
        {open && (
          <button onClick={() => setModal('resolve')} className="flex items-center gap-1.5 rounded-[3px] bg-[#00875A] px-3 py-1.5 text-[14px] font-semibold text-white hover:bg-[#006644]">
            <CheckCircle2 size={15} /> Ticket lösen
          </button>
        )}
        {t.status === 'geloest' && <span className="text-[13px] text-subtle">Wartet auf Bestätigung durch {contact?.name} …</span>}
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Linke Spalte */}
        <div className="min-w-0">
          {t.customerUpdate && (
            <div className="mb-4 rounded-md border border-[#79E2F2] bg-[#E6FCFF] px-4 py-2.5 text-[13.5px] text-[#006B7D]">
              ● Neue Aktivität des Kunden seit deinem letzten Besuch {t.reopenedCount > 0 && '· Ticket wurde durch den Kunden wiedereröffnet'}
            </div>
          )}
          {t.team === 'second' && t.escalationReason && (
            <div className="mb-4 rounded-md border border-[#C0B6F2] bg-[#EAE6FF] px-4 py-3 text-[13.5px] text-[#403294]">
              <b>Eskaliert an Second Level.</b> Grund: {t.escalationReason} <PP ids={['PP18']} />
            </div>
          )}
          <section className="mb-5">
            <h2 className="mb-1.5 text-[15px] font-semibold">Beschreibung</h2>
            <div className="text-[14.5px] leading-relaxed whitespace-pre-wrap">{t.description}</div>
            <Attachments list={t.attachments} />
          </section>

          <Composer t={t} agentId={agent.id} />

          <section className="mt-6">
            <div className="mb-3 flex flex-wrap items-center gap-1 border-b border-line">
              {(
                [
                  ['alle', 'Alle'],
                  ['kommunikation', 'Kommunikation'],
                  ['intern', 'Interne Notizen'],
                  ['verlauf', 'Verlauf'],
                ] as [Tab, string][]
              ).map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)} className={`-mb-px border-b-2 px-3 py-2 text-[14px] ${tab === id ? 'border-[#0052CC] font-semibold text-[#0052CC]' : 'border-transparent text-[#42526E] hover:text-ink'}`}>
                  {label}
                </button>
              ))}
              <span className="ml-auto pb-1 text-[12px] text-subtle">
                chronologisch, neueste unten <PP ids={['PP11']} />
              </span>
            </div>
            <div className="space-y-3">
              {shown.map((e) => (
                <AgentEvent key={e.id} e={e} />
              ))}
            </div>
          </section>
        </div>

        {/* Rechte Spalte */}
        <aside className="space-y-4">
          <Panel title="Details">
            <Prop label="Bearbeiter">
              <select
                value={t.assigneeId ?? ''}
                onChange={(e) => assign(t, agent.id, e.target.value || null)}
                className="w-full rounded-[3px] border-2 border-transparent bg-transparent px-1 py-0.5 hover:bg-[#EBECF0] focus:border-[#4C9AFF]"
              >
                <option value="">Nicht zugewiesen (Team-Queue)</option>
                {AGENTS.filter((a) => a.team !== 'lead').map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} – {a.roleLabel}
                    {getAgentStatus(a.id).absent ? ' (abwesend)' : ''}
                  </option>
                ))}
              </select>
              {t.assigneeId !== agent.id && agent.team !== 'lead' && (
                <button onClick={() => assign(t, agent.id, agent.id)} className="ml-1 text-[12.5px] text-[#0052CC] hover:underline">
                  Mir zuweisen
                </button>
              )}
            </Prop>
            <Prop label="Team">
              <span className="flex items-center gap-1.5">
                <Users size={14} className="text-subtle" /> {TEAM_LABEL[t.team]}
              </span>
            </Prop>
            <Prop label="Anfragetyp">
              <InlineSelect value={t.type} options={REQUEST_TYPES.map((r) => [r.id, r.short])} onChange={(v) => updateFields(t, agent.id, { type: v as RequestType })} />
            </Prop>
            <Prop label="Kategorie">
              <InlineSelect value={t.category} options={(CATEGORIES.includes(t.category) ? CATEGORIES : [t.category, ...CATEGORIES]).map((c) => [c, c])} onChange={(v) => updateFields(t, agent.id, { category: v })} />
            </Prop>
            <Prop label="Priorität">
              <InlineSelect
                value={t.priority}
                color={PRIORITY_META[t.priority].color}
                options={(['hoch', 'mittel', 'tief'] as Priority[]).map((p) => [p, `■ ${PRIORITY_META[p].label}${allowedPriorities(t.type).includes(p) ? '' : ' (untypisch für Anfragetyp)'}`])}
                onChange={(v) => updateFields(t, agent.id, { priority: v as Priority })}
              />
            </Prop>
            <Prop label="Kanal">{CHANNEL_LABEL[t.channel]}</Prop>
            <Prop label="Erstellt">
              {fmtDateTime(t.createdAt)} <span className="text-subtle">({fmtRelative(t.createdAt, now)})</span>
            </Prop>
          </Panel>

          <Panel title="SLA" extra={<PP ids={['PP09']} />}>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[13px] text-subtle">Zeit bis zur Erstreaktion</span>
              <span className="text-[15px]">
                <SlaLabel t={t} now={now} />
              </span>
            </div>
            <SlaBar t={t} now={now} />
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[12.5px]">
              <span className="text-subtle">Reaktionszeit</span>
              <span>{SLA_TABLE[t.priority].reaction}</span>
              <span className="text-subtle">Interventionszeit</span>
              <span>{SLA_TABLE[t.priority].intervention}</span>
              <span className="text-subtle">Problemlösezeit</span>
              <span>{SLA_TABLE[t.priority].problem}</span>
              <span className="text-subtle">Lösungszeit</span>
              <span>{SLA_TABLE[t.priority].solution}</span>
            </div>
            {t.priority === 'hoch' && (
              <div className={`mt-3 flex items-center gap-2 rounded px-2.5 py-2 text-[12.5px] ${t.phoneConfirmed ? 'bg-[#E3FCEF] text-[#006644]' : 'bg-[#FFEBE6] text-[#BF2600]'}`}>
                <Phone size={14} />
                {t.phoneConfirmed ? (
                  'Telefonische Meldung erhalten ✓'
                ) : (
                  <>
                    Telefonische Meldung ausstehend ({HOTLINE})
                    <button onClick={() => updateFields(t, agent.id, { phoneConfirmed: true })} className="ml-auto rounded bg-white px-2 py-0.5 font-semibold ring-1 ring-[#FF8F73]">
                      Anruf erhalten
                    </button>
                  </>
                )}
              </div>
            )}
          </Panel>

          <Panel title="Kunde">
            <div className="text-[14px] font-semibold">{customer.name}</div>
            <div className="text-[12.5px] text-subtle">
              Kd.-Nr. {customer.nr} · {customer.city}
            </div>
            <div className="mt-2 flex items-center gap-2 text-[13px]">
              <Avatar initials={contact?.initials ?? '?'} color="#FF8B00" size={24} />
              <div>
                {contact?.name} · HR
                <div className="text-[12px] text-subtle">
                  {contact?.email} · {contact?.phone}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded bg-[#F4F5F7] px-3 py-2 text-[13px]">
              <span>
                <span className="text-subtle">Vertrag:</span> {customer.contract}
              </span>
            </div>
          </Panel>

          <TimePanel t={t} agentId={agent.id} minutes={minutes} entries={time} />
        </aside>
      </div>

      {modal === 'escalate' && <EscalateModal t={t} agentId={agent.id} onClose={() => setModal(null)} />}
      {modal === 'back' && <BackModal t={t} agentId={agent.id} onClose={() => setModal(null)} />}
      {modal === 'resolve' && <ResolveModal t={t} agentId={agent.id} minutes={minutes} onClose={() => setModal(null)} />}
    </div>
  )
}

function Panel({ title, extra, children }: { title: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-white p-4 shadow-[0_1px_1px_rgba(9,30,66,.1)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-bold tracking-wide text-subtle uppercase">{title}</h3>
        {extra}
      </div>
      {children}
    </div>
  )
}

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[100px_1fr] items-center gap-2 py-1.5 text-[13.5px]">
      <span className="text-subtle">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function InlineSelect({ value, options, onChange, color }: { value: string; options: [string, string][]; onChange: (v: string) => void; color?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ color }}
      className={`w-full rounded-[3px] border-2 border-transparent bg-transparent px-1 py-0.5 hover:bg-[#EBECF0] focus:border-[#4C9AFF] ${color ? 'font-semibold' : ''}`}
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  )
}

function SlaBar({ t, now }: { t: Ticket; now: number }) {
  const s = slaState(t, now)
  if (!s.due) return <div className="h-1.5 rounded bg-[#E3FCEF]" />
  const start = new Date(t.createdAt).getTime()
  const end = s.due.getTime()
  const cur = t.firstResponseAt ? new Date(t.firstResponseAt).getTime() : now
  const pct = Math.min(100, Math.max(2, ((cur - start) / (end - start)) * 100))
  return (
    <div className="h-1.5 overflow-hidden rounded bg-[#EBECF0]">
      <div className="h-full rounded" style={{ width: `${pct}%`, background: s.color }} />
    </div>
  )
}

function Composer({ t, agentId }: { t: Ticket; agentId: string }) {
  const [mode, setMode] = useState<'reply' | 'note'>('reply')
  const [text, setText] = useState('')
  const [files, setFiles] = useState<Attachment[]>([])
  const [mentions, setMentions] = useState<string[]>([])
  const [next, setNext] = useState<Status | ''>('')
  const fileRef = useRef<HTMLInputElement>(null)
  const contact = contactById(t.contactId)
  const agent = agentById(agentId)!

  const send = () => {
    if (!text.trim()) return
    if (mode === 'reply') {
      agentReply(t, agentId, text.trim(), files, next || undefined)
      toast(`Antwort an ${contact?.name} gesendet – per E-Mail mit Link ins Portal.`, 'success')
    } else {
      agentNote(t, agentId, text.trim(), mentions)
      toast(mentions.length ? `Notiz gespeichert – ${mentions.map((m) => agentById(m)?.short).join(', ')} benachrichtigt.` : 'Interne Notiz gespeichert.', 'success')
    }
    setText('')
    setFiles([])
    setMentions([])
    setNext('')
  }

  const addMention = (id: string) => {
    const a = agentById(id)!
    if (!mentions.includes(id)) setMentions([...mentions, id])
    setText((x) => `${x}${x && !x.endsWith(' ') ? ' ' : ''}@${a.short} `)
  }

  const template = () =>
    setText(`Guten Tag ${contact?.name}\n\n\n\nFreundliche Grüsse\n${agent.name}\nTimeTool Support`)

  return (
    <div className={`rounded-md border-2 ${mode === 'note' ? 'border-[#FFE380] bg-[#FFFAE6]' : 'border-line bg-white'}`}>
      <div className="flex items-center gap-1 border-b border-line/70 px-2 pt-2">
        <button onClick={() => setMode('reply')} className={`flex items-center gap-1.5 rounded-t px-3 py-1.5 text-[13.5px] ${mode === 'reply' ? 'bg-white font-semibold text-[#0052CC] ring-1 ring-line' : 'text-[#42526E]'}`}>
          <MessageSquare size={14} /> Antwort an Kunde
        </button>
        <button onClick={() => setMode('note')} className={`flex items-center gap-1.5 rounded-t px-3 py-1.5 text-[13.5px] ${mode === 'note' ? 'bg-[#FFF0B3] font-semibold text-[#172B4D]' : 'text-[#42526E]'}`}>
          <Lock size={14} /> Interne Notiz
        </button>
        {mode === 'reply' && (
          <button onClick={template} className="ml-auto mb-1 rounded px-2 py-1 text-[12px] text-[#0052CC] hover:bg-blue-50">
            Textbaustein
          </button>
        )}
      </div>
      <div className="p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          spellCheck
          lang="de-CH"
          placeholder={mode === 'reply' ? `Antwort an ${contact?.name} – wird im Verlauf gespeichert und per E-Mail zugestellt …` : 'Nur intern sichtbar. Mit @ Kolleg:innen markieren …'}
          className="w-full resize-y rounded-[3px] border-2 border-line bg-white px-3 py-2 text-[14px] outline-none focus:border-[#4C9AFF]"
        />
        {mode === 'note' && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12.5px]">
            <AtSign size={13} className="text-subtle" /> Markieren:
            {AGENTS.filter((a) => a.id !== agentId).map((a) => (
              <button key={a.id} onClick={() => addMention(a.id)} className={`rounded-full px-2 py-0.5 ${mentions.includes(a.id) ? 'bg-[#0052CC] text-white' : 'bg-white ring-1 ring-line hover:bg-blue-50'}`}>
                @{a.short}
              </button>
            ))}
            <PP ids={['PP18']} />
          </div>
        )}
        <Attachments list={files} />
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <button onClick={send} disabled={!text.trim()} className="rounded-[3px] bg-[#0052CC] px-4 py-1.5 text-[14px] font-semibold text-white hover:bg-[#0747A6] disabled:opacity-50">
            {mode === 'reply' ? 'Senden' : 'Notiz speichern'}
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1 rounded px-2 py-1.5 text-[13px] text-[#42526E] hover:bg-[#EBECF0]">
            <Paperclip size={14} /> Anhang
          </button>
          <input ref={fileRef} type="file" multiple hidden onChange={(e) => setFiles([...files, ...fakeFiles(e.target.files)])} />
          {mode === 'reply' && (
            <label className="ml-auto flex items-center gap-1.5 text-[13px] text-subtle">
              Danach Status:
              <select value={next} onChange={(e) => setNext(e.target.value as Status | '')} className="rounded border border-line bg-white px-1.5 py-1 text-[13px] text-ink">
                <option value="">{t.status === 'neu' ? 'In Arbeit' : 'unverändert'}</option>
                <option value="warten_kunde">Warten auf Kunde</option>
                <option value="in_arbeit">In Arbeit</option>
              </select>
            </label>
          )}
        </div>
        {mode === 'reply' && (
          <DiffNote kind="fix" ids={['PP11', 'PP14']} className="mt-3">
            Heute: Antwort als einzelne E-Mail, Kundentext muss von Hand hineinkopiert werden. Neu: Antwort im Ticket, der ganze Verlauf bleibt chronologisch sichtbar – für Kunde und Support. Rechtschreibprüfung aktiv.
          </DiffNote>
        )}
      </div>
    </div>
  )
}

function AgentEvent({ e }: { e: TicketEvent }) {
  const a = e.actor.type === 'agent' ? agentById(e.actor.id) : undefined
  if (e.kind === 'reply_agent' || e.kind === 'reply_customer' || e.kind === 'note' || e.kind === 'feedback' || e.kind === 'created') {
    const isNote = e.kind === 'note'
    const isCust = e.actor.type === 'customer'
    const bg = isNote ? 'bg-[#FFFAE6] border-[#FFE380]' : isCust ? 'bg-white border-line' : 'bg-[#F4F8FF] border-[#B3D4FF]'
    const label =
      e.kind === 'created'
        ? 'hat das Ticket erstellt'
        : e.kind === 'note'
          ? 'Interne Notiz'
          : e.kind === 'feedback'
            ? 'Feedback zur Lösung'
            : isCust
              ? `Antwort ${e.via === 'email' ? 'per E-Mail (automatisch zugeordnet)' : 'über das Portal'}`
              : 'Antwort an Kunde · per E-Mail zugestellt'
    return (
      <div className="flex gap-3">
        <Avatar initials={a ? a.initials : isCust ? (contactById(e.actor.id)?.initials ?? 'K') : 'S'} color={a ? a.color : isCust ? '#FF8B00' : '#6B778C'} size={32} />
        <div className={`min-w-0 flex-1 rounded-md border px-4 py-2.5 ${bg}`}>
          <div className="mb-1 flex flex-wrap items-center gap-x-2 text-[12.5px]">
            <b className="text-ink">{e.actor.name}</b>
            <span className="text-subtle">{label}</span>
            {isNote && <Lock size={11} className="text-[#974F0C]" />}
            <span className="ml-auto text-subtle">{fmtDateTime(e.at)}</span>
          </div>
          <div className="text-[14px] whitespace-pre-wrap">{e.text}</div>
          <Attachments list={e.attachments} />
        </div>
      </div>
    )
  }
  const icon = e.kind === 'email_out' ? <Mail size={12} /> : e.kind === 'time' ? <Clock size={12} /> : e.kind === 'escalate' ? <ArrowUpRight size={12} /> : null
  return (
    <div className={`flex items-center gap-2 pl-11 text-[12.5px] ${e.kind === 'escalate' ? 'text-[#403294]' : e.kind === 'reopen' ? 'font-semibold text-[#974F0C]' : 'text-subtle'}`}>
      {icon ?? <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />}
      <span>
        <b className="font-medium text-[#42526E]">{e.actor.name}</b> · {e.text}
      </span>
      <span className="ml-auto shrink-0 text-slate-400">{fmtDateTime(e.at)}</span>
    </div>
  )
}

function TimePanel({ t, agentId, minutes, entries }: { t: Ticket; agentId: string; minutes: number; entries: ReturnType<typeof getTimeEntries> }) {
  const [min, setMin] = useState(15)
  const [note, setNote] = useState('')
  const add = () => {
    if (!note.trim() || min <= 0) {
      toast('Bitte Dauer und Tätigkeit angeben.', 'warn')
      return
    }
    logTime(t, agentId, min, note.trim())
    setNote('')
    toast(`${min} Min erfasst.`, 'success')
  }
  return (
    <Panel title="Zeiterfassung">
      <div className="flex items-baseline justify-between rounded bg-[#F4F5F7] px-3 py-2">
        <span className="text-[12.5px] text-subtle">Zeitaufwand total</span>
        <span className="text-[17px] font-semibold">{fmtHours(minutes)}</span>
      </div>
      {entries.length > 0 && (
        <div className="mt-3 max-h-40 space-y-1 overflow-y-auto">
          {entries.map((x) => (
            <div key={x.id} className="flex items-center gap-2 text-[12.5px]">
              <Avatar initials={agentById(x.agentId)?.initials ?? '?'} color={agentById(x.agentId)?.color ?? '#999'} size={18} />
              <span className="min-w-0 flex-1 truncate" title={x.note}>
                {x.note}
              </span>
              <span className="text-subtle">{x.minutes} Min</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 border-t border-line pt-3">
        <div className="mb-2 flex gap-1">
          {[15, 30, 45, 60, 90].map((m) => (
            <button key={m} onClick={() => setMin(m)} className={`flex-1 rounded py-1 text-[12px] ${min === m ? 'bg-[#0052CC] text-white' : 'bg-[#F4F5F7] hover:bg-[#EBECF0]'}`}>
              {m}′
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tätigkeit" spellCheck className="min-w-0 flex-1 rounded-[3px] border-2 border-line px-2.5 py-1.5 text-[13px] outline-none focus:border-[#4C9AFF]" />
          <button onClick={add} className="rounded-[3px] bg-[#F4F5F7] px-3 py-1 text-[13px] font-medium hover:bg-[#EBECF0]">
            Erfassen
          </button>
        </div>
        <p className="mt-2 text-[11.5px] text-subtle">Zeitaufwand pro Ticket, Mitarbeitende und Kunde auswertbar. Verrechnung und Stundensätze sind nicht Teil des Prototyps.</p>
      </div>
    </Panel>
  )
}

function EscalateModal({ t, agentId, onClose }: { t: Ticket; agentId: string; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [to, setTo] = useState<string>('lh')
  return (
    <Modal title={`${t.key} an Second Level eskalieren`} onClose={onClose}>
      <label className="mb-1 block text-[13px] font-semibold text-[#42526E]">
        Grund der Eskalation <span className="text-[#DE350B]">*</span>
      </label>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="z. B. Fehler im Code vermutet, Entwickler-Analyse nötig" className="w-full rounded-[3px] border-2 border-line px-3 py-2 text-[14px] outline-none focus:border-[#4C9AFF]" />
      <label className="mt-3 mb-1 block text-[13px] font-semibold text-[#42526E]">Zuweisen an</label>
      <select value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-[3px] border-2 border-line px-3 py-2 text-[14px]">
        <option value="">Team Second Level (Queue, nicht zugewiesen)</option>
        {AGENTS.filter((a) => a.team === 'second').map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      <DiffNote kind="fix" ids={['PP13', 'PP18']} className="mt-3">
        Der Grund ist für alle nachvollziehbar im Ticket dokumentiert – statt serieller Rückfragen im täglichen 11:30-Meeting.
      </DiffNote>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded px-4 py-2 text-[14px] text-[#42526E] hover:bg-slate-100">
          Abbrechen
        </button>
        <button
          disabled={reason.trim().length < 5}
          onClick={() => {
            escalate(t, agentId, reason.trim(), to || null)
            toast(`${t.key} an Second Level eskaliert.`, 'success')
            onClose()
          }}
          className="rounded bg-[#6554C0] px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-50"
        >
          Eskalieren
        </button>
      </div>
    </Modal>
  )
}

function BackModal({ t, agentId, onClose }: { t: Ticket; agentId: string; onClose: () => void }) {
  const [text, setText] = useState('')
  return (
    <Modal title={`${t.key} zurück an First Level`} onClose={onClose}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Ergebnis der Abklärung / nächster Schritt" className="w-full rounded-[3px] border-2 border-line px-3 py-2 text-[14px] outline-none focus:border-[#4C9AFF]" />
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded px-4 py-2 text-[14px] text-[#42526E] hover:bg-slate-100">
          Abbrechen
        </button>
        <button
          disabled={!text.trim()}
          onClick={() => {
            backToFirstLevel(t, agentId, text.trim())
            onClose()
          }}
          className="rounded bg-[#0052CC] px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-50"
        >
          Zurückgeben
        </button>
      </div>
    </Modal>
  )
}

function ResolveModal({ t, agentId, minutes, onClose }: { t: Ticket; agentId: string; minutes: number; onClose: () => void }) {
  const contact = contactById(t.contactId)
  const [solution, setSolution] = useState('')
  const [addMin, setAddMin] = useState(minutes === 0 ? 30 : 0)
  const [addNote, setAddNote] = useState('')
  const total = minutes + addMin
  const needTime = total === 0
  const valid = solution.trim().length >= 5 && !needTime && (addMin === 0 || addNote.trim().length > 0)

  const submit = () => {
    if (addMin > 0) logTime(t, agentId, addMin, addNote.trim())
    resolveTicket(t, agentId, solution.trim())
    toast(`${t.key} gelöst – ${contact?.name} wird um Bestätigung gebeten.`, 'success')
    onClose()
  }

  return (
    <Modal title={`Use Case 03 · Ticket ${t.key} lösen`} onClose={onClose} width={620}>
      <ol className="mb-4 grid grid-cols-3 gap-2 text-center text-[11.5px] font-semibold text-subtle">
        <li className="rounded bg-[#DEEBFF] py-1.5 text-[#0747A6]">1 · Lösung an Kunde</li>
        <li className="rounded bg-[#DEEBFF] py-1.5 text-[#0747A6]">2 · Zeitaufwand erfasst</li>
        <li className="rounded bg-[#DEEBFF] py-1.5 text-[#0747A6]">3 · Kunde bestätigt</li>
      </ol>
      <label className="mb-1 block text-[13px] font-semibold text-[#42526E]">
        Lösung (wird an {contact?.name} gesendet) <span className="text-[#DE350B]">*</span>
      </label>
      <textarea value={solution} onChange={(e) => setSolution(e.target.value)} rows={4} spellCheck className="w-full rounded-[3px] border-2 border-line px-3 py-2 text-[14px] outline-none focus:border-[#4C9AFF]" placeholder="Was wurde gemacht? Wie kann der Kunde es prüfen?" />

      <div className="mt-4 rounded-md bg-[#F4F5F7] p-3">
        <div className="mb-2 flex items-center justify-between text-[13px]">
          <span className="font-semibold text-[#42526E]">Zeitaufwand</span>
          <span className="text-subtle">bereits erfasst: {fmtHours(minutes)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="number" min={0} step={15} value={addMin} onChange={(e) => setAddMin(Math.max(0, Number(e.target.value)))} className="w-24 rounded-[3px] border-2 border-line bg-white px-2 py-1.5 text-[14px]" />
          <span className="text-[13px] text-subtle">Min zusätzlich</span>
          <input value={addNote} onChange={(e) => setAddNote(e.target.value)} placeholder="Tätigkeit" className="min-w-[160px] flex-1 rounded-[3px] border-2 border-line bg-white px-2.5 py-1.5 text-[14px]" />
        </div>
        {needTime ? (
          <p className="mt-1.5 text-[12px] text-[#DE350B]">Ohne erfassten Zeitaufwand kann das Ticket nicht gelöst werden.</p>
        ) : (
          <p className="mt-1.5 text-[12px] text-subtle">Total inkl. neu: {fmtHours(total)}</p>
        )}
      </div>

      <DiffNote kind="fix" ids={['PP12']} className="mt-4">
        Heute wird das Ticket per Status geschlossen – ohne Rückmeldung des Kunden. Neu erhält der Kunde die Lösung und bestätigt sie im Portal; ist er nicht einverstanden, wird das Ticket automatisch wiedereröffnet.
      </DiffNote>

      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded px-4 py-2 text-[14px] text-[#42526E] hover:bg-slate-100">
          Abbrechen
        </button>
        <button disabled={!valid} onClick={submit} className="rounded bg-[#00875A] px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-50">
          Lösen & Kunde um Bestätigung bitten
        </button>
      </div>
    </Modal>
  )
}
