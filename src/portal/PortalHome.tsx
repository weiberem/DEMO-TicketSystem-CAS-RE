import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Phone, Plus, Save, AlertTriangle, Mail, X } from 'lucide-react'
import type { Contact, Priority, RequestType, Ticket, Attachment } from '../lib/types'
import { CATEGORIES, HOTLINE, PRIORITY_META, REQUEST_TYPES, SLA_TABLE, allowedPriorities, defaultPriority } from '../lib/constants'
import { createTicket, getCustomer, getEmails, getTickets } from '../lib/actions'
import { useData } from '../lib/store'
import { DiffNote, PP, fakeFiles, fmtSize, toast } from '../components/ui'
import { StatusLozenge } from '../components/ticketbits'
import { MailModal } from './Portal'

interface Draft {
  type: RequestType | ''
  category: string
  priority: Priority | ''
  subject: string
  description: string
  who: string
  when: string
  view: string
  attachments: Attachment[]
}

const EMPTY: Draft = { type: '', category: '', priority: '', subject: '', description: '', who: '', when: '', view: '', attachments: [] }
const needsDetails = (t: Draft['type']) => t === 'incident' || t === 'problem' || t === 'bug'

export default function PortalHome({ contact }: { contact: Contact }) {
  const customer = getCustomer(contact.customerId)!
  const draftKey = `tt-demo:draft:${contact.id}`
  const [d, setD] = useState<Draft>(() => {
    try {
      return { ...EMPTY, ...JSON.parse(localStorage.getItem(draftKey) || '{}') }
    } catch {
      return EMPTY
    }
  })
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<Ticket | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const restored = useRef(JSON.stringify(d) !== JSON.stringify(EMPTY))

  useEffect(() => {
    if (restored.current) toast('Ihr Entwurf wurde wiederhergestellt – keine Daten verloren.', 'success')
  }, [])

  // Zwischenspeicherung (PP03): jede Eingabe wird lokal gesichert
  useEffect(() => {
    if (JSON.stringify(d) === JSON.stringify(EMPTY)) return
    const h = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify(d))
      setSavedAt(new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 400)
    return () => clearTimeout(h)
  }, [d, draftKey])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))
  const allowed = d.type ? allowedPriorities(d.type) : (['hoch', 'mittel', 'tief'] as Priority[])

  const missing = useMemo(() => {
    const m: string[] = []
    if (!d.type) m.push('type')
    if (!d.category) m.push('category')
    if (!d.priority) m.push('priority')
    if (d.subject.trim().length < 5) m.push('subject')
    if (d.description.trim().length < 10) m.push('description')
    if (needsDetails(d.type)) {
      if (!d.who.trim()) m.push('who')
      if (!d.when.trim()) m.push('when')
      if (!d.view.trim()) m.push('view')
    }
    return m
  }, [d])
  const err = (k: string) => tried && missing.includes(k)

  const reset = () => {
    localStorage.removeItem(draftKey)
    setD(EMPTY)
    setTried(false)
    setSavedAt(null)
  }

  const submit = async () => {
    setTried(true)
    if (missing.length) {
      toast('Bitte füllen Sie alle Pflichtfelder aus.', 'warn')
      return
    }
    setBusy(true)
    const extra = needsDetails(d.type) ? `\n\nBetroffene Person(en): ${d.who}\nZeitpunkt der Störung: ${d.when}\nBetroffene Ansicht: ${d.view}` : ''
    const t = await createTicket({
      customerId: contact.customerId,
      contactId: contact.id,
      type: d.type as RequestType,
      category: d.category,
      priority: d.priority as Priority,
      subject: d.subject.trim(),
      description: d.description.trim() + extra,
      attachments: d.attachments,
      channel: 'portal',
    })
    setBusy(false)
    reset()
    setCreated(t)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const inputCls = (k: string) =>
    `w-full rounded-[3px] border-2 bg-[#FAFBFC] px-3 py-2 text-[14.5px] outline-none transition focus:border-[#4C9AFF] focus:bg-white ${err(k) ? 'border-[#DE350B]' : 'border-[#DFE1E6] hover:bg-[#EBECF0]'}`

  return (
    <>
      <section className="bg-gradient-to-r from-[#0747A6] via-[#0052CC] to-[#2684FF] px-4 py-9 text-center text-white sm:py-11">
        <h1 className="text-[26px] font-bold sm:text-[32px]">Willkommen im TimeTool Support</h1>
        <p className="mt-2 text-[15px] opacity-95 sm:text-[16px]">Erfassen Sie Ihre Anfrage strukturiert – Sie sehen jederzeit den Status all Ihrer Tickets.</p>
      </section>

      <main className="mx-auto grid max-w-[1180px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_380px]">
        {created ? (
          <Confirmation t={created} contact={contact} onNew={() => setCreated(null)} />
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[19px] font-semibold">Neue Support-Anfrage erstellen</h2>
              {savedAt && (
                <span className="flex items-center gap-1.5 text-[12px] text-emerald-700">
                  <Save size={13} /> Entwurf automatisch gespeichert · {savedAt} <PP ids={['PP03']} />
                </span>
              )}
            </div>

            <Field label="Anfragetyp" req error={err('type')}>
              <select
                value={d.type}
                onChange={(e) => {
                  const type = e.target.value as RequestType
                  setD((x) => ({ ...x, type, priority: x.priority && allowedPriorities(type).includes(x.priority as Priority) ? x.priority : defaultPriority(type) }))
                }}
                className={inputCls('type')}
              >
                <option value="">– Bitte wählen –</option>
                {REQUEST_TYPES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[12.5px] text-subtle">
                Auswahl per Dropdown – kein Freitext. Steuert Priorität und SLA automatisch. <PP ids={['PP02', 'PP09']} />
              </p>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Kategorie (Modul)" req error={err('category')}>
                <select value={d.category} onChange={(e) => set('category', e.target.value)} className={inputCls('category')}>
                  <option value="">– Bitte wählen –</option>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Priorität" req error={err('priority')}>
                <div className="relative">
                  {d.priority && <span className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 rounded-[2px]" style={{ background: PRIORITY_META[d.priority].color }} />}
                  <select
                    value={d.priority}
                    onChange={(e) => set('priority', e.target.value as Priority)}
                    className={`${inputCls('priority')} ${d.priority ? 'pl-8 font-semibold' : ''}`}
                    style={{ color: d.priority ? PRIORITY_META[d.priority].color : undefined }}
                  >
                    <option value="">– Bitte wählen –</option>
                    {allowed.map((p) => (
                      <option key={p} value={p} style={{ color: PRIORITY_META[p].color }}>
                        {PRIORITY_META[p].label}
                      </option>
                    ))}
                  </select>
                </div>
                {d.priority && (
                  <p className="mt-1 text-[12.5px] text-subtle">
                    {PRIORITY_META[d.priority].desc} Reaktionszeit gemäss SLA: <b className="text-ink">{SLA_TABLE[d.priority].reaction}</b>
                  </p>
                )}
                {d.type && allowed.length === 1 && <p className="mt-1 text-[12px] text-subtle">Fragen und Changes werden gemäss SLA mit Priorität «Tief» bearbeitet.</p>}
              </Field>
            </div>

            {d.priority === 'hoch' && (
              <div className="mb-4 flex gap-3 rounded-md border border-[#FF8F73] bg-[#FFEBE6] p-3.5 text-[13.5px] text-[#BF2600]">
                <AlertTriangle size={20} className="shrink-0" />
                <div>
                  <b>Priorität Hoch:</b> Bitte melden Sie die Störung nach dem Absenden <b>zusätzlich telefonisch</b> unter <b className="whitespace-nowrap">{HOTLINE}</b> – auch ausserhalb der Servicezeiten. <PP ids={['PP10']} />
                </div>
              </div>
            )}

            <Field label="Betreff" req error={err('subject')}>
              <input value={d.subject} onChange={(e) => set('subject', e.target.value)} placeholder="z. B. Frage zur IST-Zeit bei Mitarbeiter XY am 12.12.2025" className={inputCls('subject')} />
            </Field>

            {needsDetails(d.type) && (
              <div className="mb-4 rounded-md border border-dashed border-[#B3D4FF] bg-[#F4F8FF] p-3.5">
                <div className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-[#0747A6]">
                  Pflichtangaben zur Störung <PP ids={['PP08']} label="weniger Rückfragen" />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Betroffene Person(en) / Personalnr." req error={err('who')} compact>
                    <input value={d.who} onChange={(e) => set('who', e.target.value)} placeholder="z. B. M. Müller, Nr. 4411" className={inputCls('who')} />
                  </Field>
                  <Field label="Zeitpunkt der Störung" req error={err('when')} compact>
                    <input value={d.when} onChange={(e) => set('when', e.target.value)} placeholder="z. B. heute ab 07:30" className={inputCls('when')} />
                  </Field>
                  <Field label="Betroffene Ansicht" req error={err('view')} compact>
                    <input value={d.view} onChange={(e) => set('view', e.target.value)} placeholder="z. B. Login-Maske Web" className={inputCls('view')} />
                  </Field>
                </div>
              </div>
            )}

            <Field label="Beschreibung" req error={err('description')}>
              <textarea
                value={d.description}
                onChange={(e) => set('description', e.target.value)}
                rows={4}
                spellCheck
                placeholder="Bitte beschreiben Sie das Problem, betroffene Nutzer und den Zeitpunkt …"
                className={inputCls('description')}
              />
            </Field>

            <Field label="Anhang">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-[3px] border-2 border-dashed border-[#C1C7D0] px-3 py-3.5 text-[14px] text-subtle hover:border-[#4C9AFF] hover:bg-[#F4F8FF]"
              >
                <Plus size={15} className="mr-1 inline" /> Datei hierher ziehen oder auswählen (Screenshot, Log …)
              </button>
              <input ref={fileRef} type="file" multiple hidden onChange={(e) => set('attachments', [...d.attachments, ...fakeFiles(e.target.files)])} />
              {d.attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {d.attachments.map((a, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded bg-slate-100 px-2 py-1 text-[12.5px]">
                      {a.name} <span className="text-subtle">{fmtSize(a.size)}</span>
                      <button onClick={() => set('attachments', d.attachments.filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-600">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Field>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button disabled={busy} onClick={submit} className="rounded-[3px] bg-[#0052CC] px-6 py-2.5 text-[15px] font-semibold text-white hover:bg-[#0747A6] disabled:opacity-60">
                {busy ? 'Wird gesendet …' : 'Anfrage absenden'}
              </button>
              <button onClick={reset} className="rounded-[3px] bg-[#F4F5F7] px-5 py-2.5 text-[15px] font-medium text-[#42526E] hover:bg-[#EBECF0]">
                Abbrechen
              </button>
            </div>
            <p className="mt-3 text-[12.5px] text-subtle">
              Nach dem Absenden erhalten Sie automatisch eine Eingangsbestätigung per E-Mail mit Ticketnummer. <PP ids={['PP04']} />
            </p>
          </div>
        )}

        <aside className="space-y-5">
          <MyRequests contact={contact} />
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-1.5 text-[16px] font-semibold">Kritische Störung?</h3>
            <p className="text-[14px] text-[#42526E]">
              Bei Priorität <b>Hoch</b> zusätzlich telefonisch melden:
              <br />
              <a href={`tel:${HOTLINE.replace(/\s/g, '')}`} className="flex items-center gap-1.5 font-bold text-ink">
                <Phone size={14} /> {HOTLINE}
              </a>
            </p>
            <p className="mt-2 text-[12px] text-subtle">
              Angemeldet als {contact.name} · {customer.name} (Kd.-Nr. {customer.nr})
            </p>
          </div>
        </aside>
      </main>
    </>
  )
}

function Field({ label, req, error, children, compact }: { label: string; req?: boolean; error?: boolean; children: React.ReactNode; compact?: boolean }) {
  return (
    <div className={compact ? '' : 'mb-4'}>
      <label className="mb-1 block text-[13px] font-semibold text-[#42526E]">
        {label} {req && <span className="text-[#DE350B]">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-[12px] text-[#DE350B]">Pflichtfeld</p>}
    </div>
  )
}

function MyRequests({ contact }: { contact: Contact }) {
  const list = useData(
    () =>
      getTickets()
        .filter((t) => t.customerId === contact.customerId)
        .sort((a, b) => b.number - a.number)
        .slice(0, 5),
    [contact.customerId],
  )
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[16px] font-semibold">
          Meine Anfragen <PP ids={['PP05']} />
        </h3>
        <Link to="/portal/anfragen" className="text-[13.5px] text-[#0052CC] hover:underline">
          Alle anzeigen ›
        </Link>
      </div>
      {list.map((t) => (
        <Link key={t.id} to={`/portal/ticket/${t.key}`} className="block border-b border-slate-100 py-3 last:border-0 hover:bg-slate-50">
          <div className="text-[14.5px] text-ink">{t.subject}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px]">
            <span className="font-semibold text-[#0052CC]">{t.key}</span>
            <span className="text-subtle">· {t.category.split(' ')[0]}</span>
            <StatusLozenge status={t.status} customer />
          </div>
        </Link>
      ))}
    </div>
  )
}

function Confirmation({ t, contact, onNew }: { t: Ticket; contact: Contact; onNew: () => void }) {
  const mail = useData(() => getEmails(contact.id).find((m) => m.ticketKey === t.key), [t.key])
  const [open, setOpen] = useState(false)
  return (
    <div className="animate-slide-in rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-4">
        <CheckCircle2 size={42} className="shrink-0 text-[#36B37E]" />
        <div>
          <h2 className="text-[22px] font-semibold">Ihre Anfrage ist eingegangen</h2>
          <p className="mt-1 text-[15px] text-[#42526E]">
            Ticketnummer <b className="text-[#0052CC]">{t.key}</b> · Priorität <b style={{ color: PRIORITY_META[t.priority].color }}>{PRIORITY_META[t.priority].label}</b> · Reaktionszeit gemäss SLA:{' '}
            <b>{SLA_TABLE[t.priority].reaction}</b>
          </p>
        </div>
      </div>
      {t.priority === 'hoch' && (
        <div className="mt-5 flex gap-3 rounded-md border border-[#FF8F73] bg-[#FFEBE6] p-4 text-[14px] text-[#BF2600]">
          <Phone size={20} className="shrink-0" />
          <div>
            <b>Jetzt bitte anrufen:</b> Störungen mit Priorität Hoch müssen zusätzlich telefonisch gemeldet werden – <b>{HOTLINE}</b>. Nennen Sie die Ticketnummer {t.key}.
          </div>
        </div>
      )}
      <div className="mt-5 flex items-center gap-3 rounded-md bg-[#F4F5F7] p-4 text-[14px]">
        <Mail size={18} className="shrink-0 text-[#0052CC]" />
        <div className="flex-1">
          Eingangsbestätigung wurde an <b>{contact.email}</b> gesendet.
        </div>
        {mail && (
          <button onClick={() => setOpen(true)} className="rounded bg-white px-3 py-1.5 text-[13px] font-medium text-[#0052CC] ring-1 ring-slate-200 hover:bg-blue-50">
            E-Mail ansehen
          </button>
        )}
      </div>
      <DiffNote kind="fix" ids={['PP04', 'PP05']} className="mt-4">
        Heute: keine Ticketnummer, keine Bestätigung, keine Übersicht. Neu: Nummer, SLA-Zusage und Link ins Portal – der Kunde kann jederzeit nachweisen, dass er die Anfrage gestellt hat.
      </DiffNote>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to={`/portal/ticket/${t.key}`} className="rounded-[3px] bg-[#0052CC] px-5 py-2.5 text-[14.5px] font-semibold text-white hover:bg-[#0747A6]">
          Ticket {t.key} ansehen
        </Link>
        <button onClick={onNew} className="rounded-[3px] bg-[#F4F5F7] px-5 py-2.5 text-[14.5px] font-medium text-[#42526E] hover:bg-[#EBECF0]">
          Weitere Anfrage erfassen
        </button>
      </div>
      {open && mail && <MailModal mail={mail} onClose={() => setOpen(false)} />}
    </div>
  )
}
