import { useEffect, useState, type ComponentType, type FormEvent, type ReactNode } from 'react'
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  Eye,
  FolderOpen,
  House,
  Inbox,
  Info,
  Mail,
  Megaphone,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Star,
  Store,
  Tag,
  UserRound,
  Watch,
} from 'lucide-react'
import type { LegacyTicket } from '../lib/types'
import { getLegacyTickets } from '../lib/actions'
import { DemoBar, DiffNote, PP } from '../components/ui'
import { usePref } from '../lib/store'
import WiseTicket from './WiseTicket'
import { BASE, PageLoader, PageTitle, Panel, Spinner, TicketTable, USER, WiseButton, fmtDate, isClosed } from './wiseParts'

type Icon = ComponentType<{ size?: number; className?: string }>

const NAV: { section: string; items: { to: string; label: string; icon: Icon }[] }[] = [
  {
    section: 'PowerTools',
    items: [
      { to: '', label: 'Home', icon: House },
      { to: 'create-customer', label: 'Create Customer', icon: Plus },
      { to: 'inbox', label: 'Inboxes', icon: Inbox },
      { to: 'lookup-customer', label: 'Lookup Customer', icon: FolderOpen },
      { to: 'new-ticket', label: 'New Ticket', icon: Tag },
      { to: 'search', label: 'Search', icon: Search },
      { to: 'shift-manager', label: 'Shift Manager', icon: Eye },
    ],
  },
  { section: 'Corporate Communication Suite', items: [{ to: 'mailbox', label: 'Mailbox', icon: Mail }] },
  { section: 'Business Intelligence', items: [{ to: 'feedbacks', label: 'Customer Feedbacks', icon: MessageCircle }] },
  { section: 'WISE Enterprise Portal', items: [{ to: 'system-info', label: 'System Information', icon: Info }] },
]

/**
 * Ist-Zustand: internes Support-Tool «WISE Enterprise Portal».
 * Bewusst langsam (PP07), nicht responsiv (PP15) und ohne Live-Aktualisierung (PP17).
 */
export default function Wise() {
  return (
    <div className="min-h-full bg-white font-noto text-[13px] text-[#555]" style={{ minWidth: 1100 }}>
      <Header />
      <div className="flex min-h-[calc(100vh-68px)]">
        <Sidebar />
        <main className="min-w-0 flex-1 px-8 pt-6 pb-24">
          <SlowRoutes />
        </main>
      </div>
      <DemoBar label="Ist · WISE Enterprise Portal" />
    </div>
  )
}

/** Jede Navigation lädt 2–4 s; danach wird die Seite frisch montiert und liest einmalig die Daten. */
function SlowRoutes() {
  const loc = useLocation()
  const isShift = /\/shift-manager\/?$/.test(loc.pathname)
  const [readyKey, setReadyKey] = useState<string | null>(null)
  const [slow] = usePref('legacySlow', '1')

  useEffect(() => {
    if (isShift) return
    // Präsentationsmodus «kurz»: nur ein Hauch Ladezeit, damit die Demo im Zeitplan bleibt
    const ms = slow === '1' ? 2000 + Math.random() * 2000 : 400 + Math.random() * 300
    const tm = setTimeout(() => setReadyKey(loc.key), ms)
    return () => clearTimeout(tm)
  }, [loc.key, isShift, slow])

  if (!isShift && readyKey !== loc.key) return <PageLoader />

  return (
    <Routes key={loc.key}>
      <Route index element={<HomePage />} />
      <Route path="inbox" element={<InboxPage />} />
      <Route path="shift-manager" element={<ShiftManagerPage />} />
      <Route path="ticket/:id" element={<WiseTicket />} />
      <Route path="search" element={<SearchPage />} />
      <Route path="create-customer" element={<Placeholder title="Create Customer" />} />
      <Route path="lookup-customer" element={<Placeholder title="Lookup Customer" />} />
      <Route path="new-ticket" element={<Placeholder title="New Ticket" />} />
      <Route path="mailbox" element={<MailboxPage />} />
      <Route path="feedbacks" element={<FeedbackPage />} />
      <Route path="system-info" element={<SystemInfoPage />} />
      <Route path="*" element={<Placeholder title="Page not found" text="The requested page could not be found." />} />
    </Routes>
  )
}

// ---------------------------------------------------------------------------
// Rahmen: Kopfzeile und Navigation
// ---------------------------------------------------------------------------

function Header() {
  const loc = useLocation()
  const navigate = useNavigate()
  // «F5»: dieselbe Seite neu laden (neuer Location-Key → Ladezeit → frische Daten).
  const refresh = () => navigate(loc.pathname + loc.search, { replace: true, state: { refresh: Date.now() } })
  const icons: { icon: Icon; title: string; dim?: boolean }[] = [
    { icon: Watch, title: 'Time Tracking', dim: true },
    { icon: Search, title: 'Search' },
    { icon: Store, title: 'Shop' },
    { icon: Star, title: 'Favorites' },
    { icon: Megaphone, title: 'Announcements' },
  ]
  return (
    <header
      className="flex h-[68px] items-stretch text-white"
      style={{ background: 'linear-gradient(90deg, #1b5e6b 0%, #1f6a6f 30%, #3a8a73 65%, #5aa870 100%)' }}
    >
      <Link to={BASE} className="flex w-[230px] shrink-0 items-center gap-2 bg-[#154f5b]/70 px-5">
        <span className="text-[44px] leading-none font-normal tracking-[-0.02em]">WISE</span>
        <span className="text-[13px] leading-[1.05] opacity-90">
          Enterprise
          <br />
          Portal
        </span>
      </Link>
      <div className="flex items-center gap-2.5 px-6">
        <UserRound size={18} strokeWidth={1.5} />
        <span className="text-[14.5px]">{USER}</span>
        <button className="ml-3 flex h-7 w-7 items-center justify-center rounded-[2px] bg-white/15 hover:bg-white/25" title="User menu">
          <ChevronDown size={14} />
        </button>
      </div>
      <div className="ml-auto flex items-center gap-2 pr-4">
        <div className="mr-3 flex flex-col items-end gap-1">
          <SlowToggle />
          <button onClick={refresh} className="flex items-center gap-1 text-[11.5px] text-white/80 hover:text-white" title="Seite neu laden">
            <RefreshCw size={11} /> Aktualisieren (F5)
            <PP kind="pain" ids={['PP17']} label="kein Auto-Refresh" className="ml-1" />
          </button>
          <PP kind="pain" ids={['PP15']} label="nur Desktop" />
        </div>
        {icons.map(({ icon: I, title, dim }) => (
          <button
            key={title}
            title={title}
            className={`flex h-[40px] w-[40px] items-center justify-center rounded-[2px] border border-white/60 hover:bg-white/10 ${dim ? 'opacity-40' : ''}`}
          >
            <I size={20} />
          </button>
        ))}
      </div>
    </header>
  )
}

/** Präsentations-Schalter: realistische (2–4 s) oder verkürzte Ladezeiten. */
function SlowToggle() {
  const [slow, setSlow] = usePref('legacySlow', '1')
  return (
    <button
      onClick={() => setSlow(slow === '1' ? '0' : '1')}
      className="rounded-full bg-black/20 px-2 py-0.5 font-sans text-[10.5px] text-white/85 hover:bg-black/30"
      title="Demo-Einstellung: Ladezeiten pro Klick"
    >
      Demo: Ladezeit {slow === '1' ? 'realistisch 2–4 s' : 'verkürzt'}
    </button>
  )
}

function Sidebar() {
  const loc = useLocation()
  const current = loc.pathname.replace(/\/$/, '')
  return (
    <aside className="w-[230px] shrink-0 border-r border-[#eee] bg-white px-4 pt-7 pb-10">
      {NAV.map((sec) => (
        <div key={sec.section} className="mb-6">
          <div className="mb-2 text-[12px] font-semibold whitespace-nowrap text-[#333]">{sec.section}</div>
          <ul>
            {sec.items.map(({ to, label, icon: I }) => {
              const href = to ? `${BASE}/${to}` : BASE
              const active = current === href || (to === 'inbox' && current.startsWith(`${BASE}/ticket`))
              return (
                <li key={label}>
                  <Link
                    to={href}
                    className={`flex items-center gap-3 py-[7px] pl-3 text-[14px] hover:text-[#2e7474] ${active ? 'text-[#2e7474]' : 'text-[#888]'}`}
                  >
                    <I size={16} className={active ? 'text-[#2e7474]' : 'text-[#999]'} />
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </aside>
  )
}

// ---------------------------------------------------------------------------
// Seiten
// ---------------------------------------------------------------------------

function HomePage() {
  // Momentaufnahme – keine Live-Aktualisierung (PP17).
  const [tickets] = useState(() => getLegacyTickets())
  const unread = tickets.filter((t) => t.notificationUnread)
  const mine = tickets.filter((t) => t.assignedTo === USER)
  const triage = tickets.filter((t) => t.assignedTo === 'N/A')

  return (
    <div>
      <PageTitle sub={`Last login: ${fmtDate(new Date(Date.now() - 16 * 3600_000).toISOString())}`}>Home</PageTitle>
      <div className="grid grid-cols-[1fr_340px] gap-5">
        <div className="space-y-5">
          <Panel title="Welcome">
            <p className="text-[13.5px] leading-relaxed text-[#555]">
              Welcome to the WISE Enterprise Portal, <b className="text-[#333]">{USER}</b>. Use the PowerTools on the left to manage customers, inboxes and
              tickets.
            </p>
          </Panel>

          <Panel
            title={
              <span className="flex items-center gap-2">
                New Notifications
                {unread.length ? (
                  <span className="rounded-full bg-[#d9261c] px-1.5 py-[1px] font-noto text-[11px] font-bold text-white">{unread.length}</span>
                ) : null}
              </span>
            }
          >
            {unread.length ? (
              <ul className="space-y-1.5">
                {unread.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-[13.5px]">
                    <Megaphone size={14} className="text-[#d9261c]" />
                    <Link to={`${BASE}/ticket/${t.id}`} className="text-[#2e7474] hover:underline">
                      {t.notificationText ?? `New message on ticket #${t.id} (${t.company})`}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-[#999]">No new notifications.</p>
            )}
            <DiffNote kind="pain" ids={['PP12', 'PP17']} className="mt-3">
              {unread.length
                ? 'Der Hinweis verschwindet, sobald das Ticket einmal geöffnet wurde – für immer. Es gibt kein «als ungelesen markieren». Neue Hinweise erscheinen erst nach manuellem Neuladen (F5).'
                : 'Der Hinweis auf eine Kundenantwort ist nach dem ersten Öffnen des Tickets weg – es gibt kein «als ungelesen markieren». Neue Hinweise erscheinen erst nach manuellem Neuladen (F5).'}
            </DiffNote>
          </Panel>
        </div>

        <Panel title="My Inboxes">
          <ul className="space-y-2 text-[13.5px]">
            <li className="flex items-center gap-2">
              <Inbox size={15} className="text-[#999]" />
              <Link to={`${BASE}/inbox`} className="text-[#2e7474] hover:underline">
                Inbox {USER} ({mine.length})
              </Link>
            </li>
            <li className="flex items-center gap-2">
              <Inbox size={15} className="text-[#999]" />
              <Link to={`${BASE}/inbox?view=triage`} className="text-[#2e7474] hover:underline">
                Triage (unassigned) ({triage.length})
              </Link>
            </li>
            <li className="flex items-center gap-2">
              <Eye size={15} className="text-[#999]" />
              <Link to={`${BASE}/shift-manager`} className="text-[#2e7474] hover:underline">
                Shift Manager
              </Link>
            </li>
          </ul>
        </Panel>
      </div>
    </div>
  )
}

function InboxPage() {
  const loc = useLocation()
  const view = new URLSearchParams(loc.search).get('view') === 'triage' ? 'triage' : 'mine'
  const [tickets] = useState(() => getLegacyTickets())
  const mine = tickets.filter((t) => t.assignedTo === USER)
  const triage = tickets.filter((t) => t.assignedTo === 'N/A')
  const list = view === 'triage' ? triage : mine

  const tabCls = (on: boolean) =>
    `px-4 py-2 text-[13.5px] ${on ? 'bg-[#2e7474] text-white' : 'text-[#888] hover:text-[#2e7474]'}`

  return (
    <div>
      <PageTitle sub="Personal and team inboxes">Inboxes</PageTitle>
      <div className="mb-4 flex items-end gap-1 border-b border-[#e6e6e6]">
        <Link to={`${BASE}/inbox`} className={tabCls(view === 'mine')}>
          My Inbox ({USER}) ({mine.length})
        </Link>
        <Link to={`${BASE}/inbox?view=triage`} className={tabCls(view === 'triage')}>
          Triage (unassigned) ({triage.length})
        </Link>
        <span className="mb-1.5 ml-auto">
          <PP kind="pain" ids={['PP13']} label="persönliche Inbox" />
        </span>
      </div>
      <TicketTable tickets={list} empty={view === 'triage' ? 'No unassigned tickets.' : 'Your inbox is empty.'} />
      <DiffNote kind="pain" ids={['PP13']} className="mt-4 max-w-[760px]">
        Rückmeldungen landen in der <b>persönlichen</b> Inbox der zuständigen Person. Ist sie abwesend (z. B. José Gómez, Ferien), bleiben
        Kundenantworten dort liegen – niemand sonst sieht sie.
      </DiffNote>
      {view === 'triage' ? (
        <DiffNote kind="pain" ids={['PP09']} className="mt-2 max-w-[760px]">
          Neue Formular-Tickets kommen ohne Kategorie und Dringlichkeit an – im Triage-Meeting muss jedes Ticket erst gelesen werden.
        </DiffNote>
      ) : null}
    </div>
  )
}

const SHIFT_SECONDS = 39

function ShiftManagerPage() {
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (done) return
    const start = Date.now()
    const i = setInterval(() => {
      const s = (Date.now() - start) / 1000
      if (s >= SHIFT_SECONDS) {
        setElapsed(SHIFT_SECONDS)
        setDone(true)
      } else setElapsed(s)
    }, 200)
    return () => clearInterval(i)
  }, [done])

  if (!done) {
    const pct = Math.min(100, (elapsed / SHIFT_SECONDS) * 100)
    return (
      <div>
        <PageTitle>Shift Manager</PageTitle>
        <div className="flex min-h-[360px] flex-col items-center justify-center border border-[#e6e6e6] bg-[#fafafa]">
          <div className="flex items-center gap-3 text-[15px] text-[#555]">
            <Spinner size={20} />
            Shift Manager wird geladen … <span className="w-[40px] font-semibold tabular-nums">{Math.floor(elapsed)} s</span>
          </div>
          <div className="mt-4 h-[10px] w-[420px] overflow-hidden border border-[#ccc] bg-white">
            <div className="h-full bg-[#2e7474] transition-[width] duration-200" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-4">
            <PP kind="pain" ids={['PP07']} label="~39 s Ladezeit" />
          </div>
          <button onClick={() => setDone(true)} className="mt-6 text-[11px] text-[#aaa] underline hover:text-[#666]">
            Demo: überspringen
          </button>
        </div>
      </div>
    )
  }
  return <ShiftTable skipped={elapsed < SHIFT_SECONDS} />
}

function ShiftTable({ skipped }: { skipped: boolean }) {
  const [tickets] = useState(() => getLegacyTickets())
  const open = tickets.filter((t) => !isClosed(t.status)).length
  return (
    <div>
      <PageTitle sub={`All tickets · ${tickets.length} entries · ${open} open · ${skipped ? 'Ladezeit übersprungen (Demo)' : `loaded in ${SHIFT_SECONDS}.0 s`}`}>Shift Manager</PageTitle>
      <TicketTable tickets={tickets} showPriority />
      <div className="mt-4 grid max-w-[900px] grid-cols-2 gap-3">
        <DiffNote kind="pain" ids={['PP07']}>
          Der Shift Manager braucht bei jedem Aufruf rund 39 Sekunden zum Laden.
        </DiffNote>
        <DiffNote kind="pain" ids={['PP09']}>
          Alle Tickets haben die Priorität «Normal» – keine SLA-Dringlichkeit, keine Reaktionsfristen, keine Sortierung nach Wichtigkeit.
        </DiffNote>
      </div>
    </div>
  )
}

function SearchPage() {
  const [q, setQ] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [result, setResult] = useState<{ q: string; list: LegacyTicket[] } | null>(null)

  useEffect(() => {
    if (pending === null) return
    const tm = setTimeout(() => {
      const s = pending.trim().toLowerCase()
      const list = getLegacyTickets().filter((t) => t.title.toLowerCase().includes(s) || t.company.toLowerCase().includes(s))
      setResult({ q: pending, list })
      setPending(null)
    }, 3000)
    return () => clearTimeout(tm)
  }, [pending])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (pending === null) setPending(q)
  }

  return (
    <div>
      <PageTitle sub="Search tickets by title or company">Search</PageTitle>
      <form onSubmit={submit} className="mb-5 flex max-w-[620px] items-center gap-1">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search …"
          className="h-[30px] flex-1 rounded-[2px] border border-[#ccc] px-2 text-[13px] text-[#333] outline-none focus:border-[#2e7474]"
        />
        <WiseButton type="submit" primary disabled={pending !== null}>
          <Search size={13} /> Search
        </WiseButton>
      </form>
      {pending !== null ? (
        <div className="flex items-center gap-2 text-[13px] text-[#888]">
          <Spinner /> Searching …
          <PP kind="pain" ids={['PP07']} />
        </div>
      ) : result ? (
        <>
          <div className="mb-2 text-[12.5px] text-[#888]">
            {result.list.length} result(s) for «{result.q}»
          </div>
          <TicketTable tickets={result.list} />
        </>
      ) : null}
    </div>
  )
}

function Placeholder({ title, text = 'Diese Funktion ist im Demo nicht umgesetzt.' }: { title: string; text?: string }) {
  return (
    <div>
      <PageTitle>{title}</PageTitle>
      <Panel>
        <p className="text-[13px] text-[#888]">{text}</p>
      </Panel>
    </div>
  )
}

function MailboxPage() {
  const rows = [
    { from: 'd.meier@meier-transport.example', subject: 'export falsch, bitte anschauen', at: fmtDate(new Date(Date.now() - 86 * 60_000).toISOString()), ticket: '#24493' },
    { from: 'l.keller@keller-gastro.example', subject: 'AW: Badge-Leser', at: fmtDate(new Date(Date.now() - 5 * 3600_000).toISOString()), ticket: '—' },
    { from: 'info@roth-bau.example', subject: 'Frage Lizenz', at: fmtDate(new Date(Date.now() - 26 * 3600_000).toISOString()), ticket: '—' },
  ]
  return (
    <div>
      <PageTitle sub="support@timetool.ch · Inbox">Mailbox</PageTitle>
      <table className="w-full max-w-[900px] border-collapse border border-[#ddd] text-[12px]">
        <thead>
          <tr className="bg-[#f2f2f2] text-left text-[#444]">
            <th className="border border-[#ddd] px-2 py-1.5 font-semibold">From</th>
            <th className="border border-[#ddd] px-2 py-1.5 font-semibold">Subject</th>
            <th className="border border-[#ddd] px-2 py-1.5 font-semibold">Received</th>
            <th className="border border-[#ddd] px-2 py-1.5 font-semibold">Ticket</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.subject}>
              <td className="border border-[#e3e3e3] px-2 py-1">{r.from}</td>
              <td className="border border-[#e3e3e3] px-2 py-1">{r.subject}</td>
              <td className="border border-[#e3e3e3] px-2 py-1 tabular-nums">{r.at}</td>
              <td className="border border-[#e3e3e3] px-2 py-1">{r.ticket}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <DiffNote kind="pain" ids={['PP06']} className="mt-4 max-w-[900px]">
        Kunden schreiben parallel zum Formular direkt an support@timetool.ch. Diese Mails müssen von Hand einem Ticket zugeordnet werden – kein Single
        Point of Contact.
      </DiffNote>
    </div>
  )
}

function FeedbackPage() {
  return (
    <div>
      <PageTitle>Customer Feedbacks</PageTitle>
      <Panel>
        <p className="text-[13px] text-[#888]">No customer feedbacks recorded.</p>
      </Panel>
      <DiffNote kind="pain" ids={[]} className="mt-4 max-w-[760px]">
        Kein Feedback-Loop: Kunden werden nach dem Schliessen weder informiert noch um Bestätigung der Lösung gebeten.
      </DiffNote>
    </div>
  )
}

function SystemInfoPage() {
  const rows: [string, ReactNode][] = [
    ['Product', 'WISE Enterprise Portal'],
    ['Version', '4.2.17 (build 2014)'],
    ['Last update', '2019'],
    ['Supported browsers', 'Desktop only (min. 1024 × 768)'],
    ['Entwickler', 'nicht mehr im Unternehmen'],
  ]
  return (
    <div>
      <PageTitle>System Information</PageTitle>
      <Panel className="max-w-[620px]">
        <div className="grid grid-cols-[170px_1fr] gap-y-1 text-[13px]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <div className="font-semibold text-[#333]">{k}</div>
              <div>{v}</div>
            </div>
          ))}
        </div>
      </Panel>
      <DiffNote kind="pain" ids={['PP15']} className="mt-4 max-w-[620px]">
        Technische Obsoleszenz – kein Know-how mehr im Haus. Anpassungen (z. B. mobile Ansicht, Auto-Refresh) sind kaum mehr möglich.
      </DiffNote>
    </div>
  )
}
