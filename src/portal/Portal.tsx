import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, LogOut, ShieldCheck, ShieldX, HelpCircle, Phone, ChevronRight } from 'lucide-react'
import { CONTACTS, HOTLINE, SERVICE_HOURS, contactById } from '../lib/constants'
import { getCustomer, getEmails } from '../lib/actions'
import { store, useData, usePref } from '../lib/store'
import type { Email } from '../lib/types'
import { Avatar, DemoBar, DiffNote, PP, toast, Modal } from '../components/ui'
import { fmtDateTime } from '../lib/sla'
import PortalHome from './PortalHome'
import PortalTicket from './PortalTicket'
import PortalList from './PortalList'

export function usePortalContact() {
  const [id, setId] = usePref('contact', '')
  const c = contactById(id)
  return { contact: c && c.role === 'HR' && c.active ? c : undefined, setContact: setId }
}

export default function Portal() {
  const { contact, setContact } = usePortalContact()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  // Deep-Link für die Präsentation: /portal/...?as=<Kontakt-ID> meldet diese Person direkt an
  const as = sp.get('as')
  useEffect(() => {
    const c = contactById(as)
    if (c && c.role === 'HR' && c.active && c.id !== contact?.id) setContact(c.id)
  }, [as, contact?.id, setContact])
  const emails = useData(() => (contact ? getEmails(contact.id) : []), [contact?.id])
  const [openMail, setOpenMail] = useState<Email | null>(null)
  const [seenMails, setSeenMails] = usePref('seenMails:' + (contact?.id ?? ''), '0')
  const unseen = Math.max(0, emails.length - Number(seenMails))

  // Live: neue E-Mail an die angemeldete Person → Hinweis (z. B. Antwort des Supports)
  useEffect(() => {
    if (!contact) return
    return store.onNewRecord((r) => {
      const e = r.data as Email
      if (r.kind === 'email' && e.toContactId === contact.id) toast(<span><b>Neue E-Mail</b><br />{e.subject}</span>)
    })
  }, [contact])

  if (!contact) return <PortalLogin onLogin={(id) => setContact(id)} />
  const customer = getCustomer(contact.customerId)

  return (
    <div className="min-h-full bg-[#F4F5F7] font-sans">
      <header className="sticky top-0 z-40 bg-[#0747A6] text-white">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
          <Link to="/portal" className="flex items-center gap-2.5 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white">
              <span className="h-3.5 w-3.5 rounded-[3px] border-[3px] border-[#0747A6]" />
            </span>
            <span className="text-[16px]">TimeTool · Kundenportal</span>
          </Link>
          <nav className="ml-6 hidden gap-1 text-[14px] md:flex">
            <NavLink end to="/portal" className={({ isActive }) => `rounded px-3 py-1.5 ${isActive ? 'bg-white/15' : 'hover:bg-white/10'}`}>
              Neue Anfrage
            </NavLink>
            <NavLink to="/portal/anfragen" className={({ isActive }) => `rounded px-3 py-1.5 ${isActive ? 'bg-white/15' : 'hover:bg-white/10'}`}>
              Meine Anfragen
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2 text-[14px] sm:gap-4">
            <button onClick={() => toast(<span>Hilfe: Anleitung zur Erfassung einer Anfrage – siehe Hinweise im Formular. Hotline {HOTLINE}</span>)} className="hidden items-center gap-1 hover:underline sm:flex">
              <HelpCircle size={16} /> Hilfe
            </button>
            <Link to="/portal/mails" onClick={() => setSeenMails(String(emails.length))} className="relative flex items-center gap-1 rounded px-2 py-1 hover:bg-white/10" title="Simuliertes E-Mail-Postfach der HR-Ansprechperson">
              <Mail size={17} />
              <span className="hidden sm:inline">E-Mails</span>
              {unseen > 0 && <span className="absolute -top-1 -right-1 rounded-full bg-[#FF5630] px-1.5 text-[10px] font-bold">{unseen}</span>}
            </Link>
            <span className="hidden lg:inline">{customer?.name} · HR</span>
            <div className="group relative">
              <button className="rounded-full ring-2 ring-white/30">
                <Avatar initials={contact.initials} color="#FF8B00" size={34} />
              </button>
              <div className="invisible absolute right-0 mt-2 w-64 rounded-md bg-white p-2 text-ink opacity-0 shadow-xl ring-1 ring-slate-200 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <div className="px-2 py-1.5 text-[13px]">
                  <div className="font-semibold">{contact.name}</div>
                  <div className="text-subtle">{contact.email}</div>
                  <div className="text-subtle">
                    {customer?.name} · Kd.-Nr. {customer?.nr}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setContact(null)
                    nav('/portal')
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] hover:bg-slate-100"
                >
                  <LogOut size={14} /> Abmelden / Person wechseln
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <Routes>
        <Route index element={<PortalHome contact={contact} />} />
        <Route path="anfragen" element={<PortalList contact={contact} />} />
        <Route path="ticket/:key" element={<PortalTicket contact={contact} />} />
        <Route path="mails" element={<PortalMails emails={emails} onOpen={setOpenMail} />} />
      </Routes>

      <footer className="mx-auto max-w-[1400px] px-6 pt-4 pb-20 text-[12px] text-subtle">
        TimeTool AG · Support {HOTLINE} · Servicezeiten {SERVICE_HOURS} · Klick-Prototyp mit fiktiven Daten (CAS RE FS26)
      </footer>
      {openMail && <MailModal mail={openMail} onClose={() => setOpenMail(null)} />}
      <DemoBar label="Soll · Kundenportal" />
    </div>
  )
}

export function MailModal({ mail, onClose }: { mail: Email; onClose: () => void }) {
  const lines = mail.body.split('\n')
  return (
    <Modal title="E-Mail (simuliert)" onClose={onClose} width={620}>
      <div className="mb-3 space-y-0.5 border-b border-slate-200 pb-3 text-[13px]">
        <div>
          <span className="text-subtle">Von:</span> TimeTool Support &lt;support@timetool.ch&gt;
        </div>
        <div>
          <span className="text-subtle">An:</span> {contactById(mail.toContactId)?.email}
        </div>
        <div>
          <span className="text-subtle">Datum:</span> {fmtDateTime(mail.at)}
        </div>
        <div className="pt-1 text-[15px] font-semibold">{mail.subject}</div>
      </div>
      <div className="text-[14px] leading-relaxed whitespace-pre-wrap">
        {lines.map((l, i) =>
          l.startsWith('http') && mail.ticketKey ? (
            <div key={i}>
              <Link to={`/portal/ticket/${mail.ticketKey}`} onClick={onClose} className="font-medium text-[#0052CC] underline">
                → Ticket {mail.ticketKey} im Kundenportal öffnen
              </Link>
            </div>
          ) : (
            <div key={i}>{l || ' '}</div>
          ),
        )}
      </div>
      <DiffNote kind="fix" ids={['PP04', 'PP06']} className="mt-4">
        Automatische E-Mail mit Ticketnummer und Link zurück ins Portal. Antworten erfolgen im Portal – ein Kanal statt Formular + E-Mail.
      </DiffNote>
    </Modal>
  )
}

function PortalMails({ emails, onOpen }: { emails: Email[]; onOpen: (m: Email) => void }) {
  return (
    <main className="mx-auto max-w-[900px] px-4 py-6 sm:px-6">
      <h1 className="mb-1 text-[22px] font-semibold">E-Mail-Postfach (simuliert)</h1>
      <p className="mb-4 text-[14px] text-subtle">
        So sieht die HR-Ansprechperson die automatischen Benachrichtigungen des Systems. <PP ids={['PP04']} />
      </p>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {emails.length === 0 && <div className="p-6 text-center text-subtle">Keine E-Mails.</div>}
        {emails.map((m) => (
          <button key={m.id} onClick={() => onOpen(m)} className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50">
            <Mail size={16} className="shrink-0 text-[#0052CC]" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-medium">{m.subject}</div>
              <div className="truncate text-[12.5px] text-subtle">{m.body.split('\n').filter(Boolean)[1]}</div>
            </div>
            <div className="shrink-0 text-[12px] text-subtle">{fmtDateTime(m.at)}</div>
            <ChevronRight size={16} className="text-slate-400" />
          </button>
        ))}
      </div>
    </main>
  )
}

function PortalLogin({ onLogin }: { onLogin: (id: string) => void }) {
  const [sel, setSel] = useState(CONTACTS[0].id)
  const [error, setError] = useState<string | null>(null)
  const c = contactById(sel)!
  const cust = getCustomer(c.customerId)

  const login = () => {
    if (c.role !== 'HR') {
      setError(`Zugriff verweigert: ${c.name} ist nicht als HR-Ansprechperson von ${cust?.name} registriert. Support-Anfragen können nur über die HR-Ansprechperson Ihres Unternehmens erfasst werden.`)
      return
    }
    if (!c.active) {
      setError(`Konto deaktiviert: ${c.name} ist nicht mehr mit einem Kunden verbunden und kann keine Tickets erstellen.`)
      return
    }
    setError(null)
    onLogin(c.id)
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-[#0747A6] via-[#1C62D0] to-[#F4F5F7] font-sans">
      <div className="mx-auto flex max-w-[980px] flex-col items-center px-4 pt-14 pb-24">
        <div className="mb-6 flex items-center gap-2.5 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white">
            <span className="h-4 w-4 rounded-[3px] border-[3px] border-[#0747A6]" />
          </span>
          <span className="text-[20px] font-semibold">TimeTool · Kundenportal</span>
        </div>
        <div className="grid w-full gap-5 md:grid-cols-[1fr_1.1fr]">
          <div className="rounded-xl bg-white p-6 shadow-xl">
            <h1 className="text-[20px] font-semibold">Anmelden</h1>
            <p className="mt-1 mb-4 text-[13.5px] text-subtle">Zugang nur für aktive HR-Ansprechpersonen – verknüpft mit Ihrer Kundennummer.</p>
            <label className="text-[12px] font-semibold text-subtle">E-Mail</label>
            <input readOnly value={c.email} className="mb-3 w-full rounded border-2 border-slate-200 bg-slate-50 px-3 py-2 text-[14px]" />
            <label className="text-[12px] font-semibold text-subtle">Passwort</label>
            <input readOnly type="password" value="demo-passwort" className="mb-4 w-full rounded border-2 border-slate-200 bg-slate-50 px-3 py-2 text-[14px]" />
            {error && (
              <div className="mb-4 flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-[13px] text-red-800">
                <ShieldX size={18} className="shrink-0" /> {error}
              </div>
            )}
            <button onClick={login} className="w-full rounded bg-[#0052CC] py-2.5 text-[14px] font-semibold text-white hover:bg-[#0747A6]">
              Anmelden
            </button>
            <p className="mt-3 text-center text-[12px] text-subtle">Passwort vergessen? · Single Sign-on (SSO)</p>
            <DiffNote kind="fix" ids={['PP01']} className="mt-4">
              Heute ist das Kontaktformular öffentlich. Neu können nur registrierte, aktive HR-Ansprechpersonen Tickets erfassen – andere Mitarbeitende werden abgewiesen.
            </DiffNote>
          </div>
          <div className="rounded-xl bg-white/95 p-6 shadow-xl">
            <div className="mb-3 text-[12px] font-bold tracking-wide text-subtle uppercase">Demo: Person wählen</div>
            <div className="space-y-2">
              {CONTACTS.map((p) => {
                const pc = getCustomer(p.customerId)
                const ok = p.role === 'HR' && p.active
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSel(p.id)
                      setError(null)
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg border-2 px-3 py-2 text-left transition ${sel === p.id ? 'border-[#0052CC] bg-blue-50' : 'border-transparent bg-slate-50 hover:border-slate-200'}`}
                  >
                    <Avatar initials={p.initials} color={ok ? '#FF8B00' : '#97A0AF'} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-medium">{p.name}</div>
                      <div className="truncate text-[12px] text-subtle">
                        {pc?.name} · {p.role === 'HR' ? 'HR-Ansprechperson' : 'Mitarbeiter (kein HR)'}
                        {!p.active && ' · inaktiv'}
                      </div>
                    </div>
                    {ok ? <ShieldCheck size={18} className="text-emerald-600" /> : <ShieldX size={18} className="text-red-500" />}
                  </button>
                )
              })}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-md bg-slate-100 p-3 text-[12.5px] text-slate-600">
              <Phone size={14} /> Kritische Störung? Hotline {HOTLINE}
            </div>
          </div>
        </div>
      </div>
      <DemoBar label="Soll · Kundenportal" />
    </div>
  )
}
