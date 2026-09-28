import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Grid3x3, HelpCircle, Search, Menu, X, Check, Circle, Plane, Mail } from 'lucide-react'
import { AGENTS, agentById } from '../lib/constants'
import type { Notification, Rec, Ticket, TicketEvent } from '../lib/types'
import { getAgentStatus, getNotifications, getTickets, markAllRead, setAbsent, setNotificationRead } from '../lib/actions'
import { store, useData, usePref } from '../lib/store'
import { fmtRelative } from '../lib/sla'
import { Avatar, DemoBar, PP, toast, useNow } from '../components/ui'
import { QUEUES } from './queues'
import Queue from './Queue'
import DeskTicket from './DeskTicket'
import Reports from './Reports'
import Customers from './Customers'
import { CreateTicketModal, EmailInModal } from './CreateModals'

export function useAgent() {
  const [id, setId] = usePref('agent', 'rw')
  return { agent: agentById(id) ?? AGENTS[0], setAgent: setId }
}

export default function Desk() {
  const { agent } = useAgent()
  const now = useNow(30_000)
  const nav = useNavigate()
  const loc = useLocation()
  const [q, setQ] = useState('')
  const [create, setCreate] = useState(false)
  const [emailIn, setEmailIn] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const tickets = useData(() => getTickets())

  useEffect(() => setMobileNav(false), [loc.pathname])

  // Live-Aktualisierung ohne Reload (PP17): neue Tickets / Kundenantworten von anderen Geräten
  useEffect(
    () =>
      store.onNewRecord((r: Rec) => {
        if (r.kind === 'ticket') {
          const t = r.data as Ticket
          toast(
            <Link to={`/desk/ticket/${t.key}`} className="block">
              <b>Neues Ticket {t.key}</b> · {t.priority === 'hoch' ? '🔴 Hoch' : t.priority === 'mittel' ? '🟠 Mittel' : '🟢 Tief'}
              <br />
              {t.subject}
            </Link>,
          )
        }
        if (r.kind === 'event') {
          const e = r.data as TicketEvent
          if (e.kind === 'reply_customer' || e.kind === 'feedback')
            toast(
              <Link to={`/desk/ticket/${e.ticketId}`} className="block">
                <b>{e.kind === 'feedback' ? 'Kundenfeedback' : 'Kundenantwort'} in {e.ticketId}</b>
                <br />
                {e.text?.slice(0, 90)}
              </Link>,
              e.kind === 'feedback' ? 'success' : 'info',
            )
        }
      }),
    [],
  )

  const counts = Object.fromEntries(QUEUES.map((qd) => [qd.id, tickets.filter((t) => qd.test(t, now, agent.id)).length]))

  const sidebar = (
    <nav className="text-[14px]">
      <div className="mb-5 flex items-center gap-3 px-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#0052CC] text-[14px] font-bold text-white">TT</span>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold">TimeTool Kundensupport</div>
          <div className="text-[12.5px] text-subtle">Service-Projekt</div>
        </div>
      </div>
      <SideHead>Queues</SideHead>
      {QUEUES.filter((x) => x.group === 'queues').map((x) => (
        <SideLink key={x.id} to={`/desk/queue/${x.id}`} dot={x.dot} count={counts[x.id]} label={x.label} />
      ))}
      <SideHead>Kanäle</SideHead>
      {QUEUES.filter((x) => x.group === 'kanaele').map((x) => (
        <SideLink key={x.id} to={`/desk/queue/${x.id}`} count={counts[x.id]} label={x.label} />
      ))}
      <button onClick={() => setEmailIn(true)} className="mx-2 mt-1 flex w-[calc(100%-1rem)] items-center gap-2 rounded px-3 py-1.5 text-left text-[12.5px] text-[#0052CC] hover:bg-blue-50">
        <Mail size={13} /> E-Mail-Eingang simulieren
      </button>
      <SideHead>Archiv</SideHead>
      {QUEUES.filter((x) => x.group === 'archiv').map((x) => (
        <SideLink key={x.id} to={`/desk/queue/${x.id}`} count={counts[x.id]} label={x.label} />
      ))}
      <SideHead>Reports</SideHead>
      <SideLink to="/desk/reports" label="Zeit & SLA" />
      <SideHead>Einstellungen</SideHead>
      <SideLink to="/desk/kunden" label="Kunden & Team" />
    </nav>
  )

  return (
    <div className="flex h-full flex-col bg-white font-sans text-ink">
      <header className="z-40 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-white px-3 sm:gap-4 sm:px-4">
        <button className="rounded p-1.5 hover:bg-slate-100 lg:hidden" onClick={() => setMobileNav(!mobileNav)} aria-label="Menü">
          {mobileNav ? <X size={20} /> : <Menu size={20} />}
        </button>
        <Grid3x3 size={20} className="hidden text-subtle sm:block" />
        <Link to="/desk" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-[#0052CC]">
            <span className="h-3 w-3 rounded-[2px] border-[2.5px] border-white" />
          </span>
          <span className="hidden text-[17px] font-semibold text-[#253858] sm:inline">Service Management</span>
        </Link>
        <nav className="ml-2 hidden gap-1 text-[14.5px] text-[#42526E] xl:flex">
          <Link to="/desk/queue/meine" className="rounded px-2.5 py-1.5 hover:bg-slate-100">
            Ihre Arbeit
          </Link>
          <Link to="/desk/queue/alle" className="rounded px-2.5 py-1.5 hover:bg-slate-100">
            Queues
          </Link>
          <Link to="/desk/reports" className="rounded px-2.5 py-1.5 hover:bg-slate-100">
            Reports
          </Link>
        </nav>
        <form
          className="relative ml-auto max-w-[400px] flex-1"
          onSubmit={(e) => {
            e.preventDefault()
            nav(`/desk/queue/suche?q=${encodeURIComponent(q)}`)
          }}
        >
          <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-subtle" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche nach Ticketnr., Kunde, Titel …"
            className="w-full rounded-[3px] border-2 border-line bg-[#FAFBFC] py-1.5 pr-3 pl-9 text-[14px] outline-none focus:border-[#4C9AFF] focus:bg-white"
          />
        </form>
        <button onClick={() => setCreate(true)} className="rounded-[3px] bg-[#0052CC] px-3 py-1.5 text-[14px] font-semibold text-white hover:bg-[#0747A6] sm:px-4">
          Erstellen
        </button>
        <HelpCircle size={20} className="hidden text-subtle sm:block" />
        <Notifications agentId={agent.id} />
        <AgentMenu />
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[270px] shrink-0 overflow-y-auto border-r border-line bg-[#FAFBFC] pt-5 pb-24 lg:block">{sidebar}</aside>
        {mobileNav && <aside className="fixed inset-x-0 top-14 bottom-0 z-30 overflow-y-auto bg-[#FAFBFC] py-5 lg:hidden">{sidebar}</aside>}
        <main className="min-w-0 flex-1 overflow-y-auto pb-16">
          <Routes>
            <Route index element={<Queue queueId={agent.team === 'second' ? 'second' : 'alle'} />} />
            <Route path="queue/:queueId" element={<Queue />} />
            <Route path="ticket/:key" element={<DeskTicket />} />
            <Route path="reports" element={<Reports />} />
            <Route path="kunden" element={<Customers />} />
          </Routes>
        </main>
      </div>
      {create && <CreateTicketModal onClose={() => setCreate(false)} />}
      {emailIn && <EmailInModal onClose={() => setEmailIn(false)} />}
      <DemoBar label="Soll · Service Desk (Agenten-Queue)" />
    </div>
  )
}

function SideHead({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 mb-1 px-5 text-[11.5px] font-bold tracking-wider text-subtle uppercase">{children}</div>
}

function SideLink({ to, label, dot, count }: { to: string; label: string; dot?: string; count?: number }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `mx-2 flex items-center gap-2.5 rounded px-3 py-[7px] ${isActive ? 'bg-[#DEEBFF] font-semibold text-[#0052CC]' : 'text-[#42526E] hover:bg-[#EBECF0]'}`
      }
    >
      {dot !== undefined && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} />}
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && <span className={`rounded-full px-2 text-[12px] font-semibold ${count ? 'bg-[#DFE1E6] text-[#42526E]' : 'text-slate-400'}`}>{count}</span>}
    </NavLink>
  )
}

function Notifications({ agentId }: { agentId: string }) {
  const [open, setOpen] = useState(false)
  const list = useData(() => getNotifications(agentId), [agentId])
  const unread = list.filter((n) => !n.readBy.includes(agentId)).length
  const nav = useNavigate()
  const openN = (n: Notification) => {
    setNotificationRead(n, agentId, true)
    setOpen(false)
    nav(`/desk/ticket/${n.ticketKey}`)
  }
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative rounded-full p-1.5 hover:bg-slate-100" aria-label="Benachrichtigungen">
        <Bell size={20} className={unread ? 'text-[#FF8B00]' : 'text-subtle'} fill={unread ? '#FFAB00' : 'none'} />
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 rounded-full bg-[#DE350B] px-1.5 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-[380px] max-w-[calc(100vw-1.5rem)] rounded-md bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="font-semibold">Benachrichtigungen</span>
              <button onClick={() => markAllRead(agentId)} className="text-[12.5px] text-[#0052CC] hover:underline">
                Alle als gelesen markieren
              </button>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {list.length === 0 && <div className="p-6 text-center text-[13px] text-subtle">Keine Benachrichtigungen</div>}
              {list.map((n) => {
                const isRead = n.readBy.includes(agentId)
                return (
                  <div key={n.id} className={`flex items-start gap-2 border-b border-slate-100 px-4 py-2.5 ${isRead ? '' : 'bg-[#F4F8FF]'}`}>
                    <button onClick={() => openN(n)} className="min-w-0 flex-1 text-left">
                      <div className={`text-[13px] ${isRead ? 'text-[#42526E]' : 'font-semibold'}`}>{n.text}</div>
                      <div className="text-[11.5px] text-subtle">
                        {n.target.startsWith('team:') ? (n.target === 'team:second' ? 'Team Second Level' : 'Team First Level') : 'Persönlich'} · {fmtRelative(n.at)}
                      </div>
                    </button>
                    <button
                      onClick={() => setNotificationRead(n, agentId, !isRead)}
                      title={isRead ? 'Als ungelesen markieren' : 'Als gelesen markieren'}
                      className="mt-0.5 rounded p-1 text-[#0052CC] hover:bg-blue-100"
                    >
                      {isRead ? <Circle size={12} /> : <Check size={14} />}
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="px-4 py-2">
              <PP ids={['PP12', 'PP17']} label="als ungelesen markierbar · live" />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function AgentMenu() {
  const { agent, setAgent } = useAgent()
  const [open, setOpen] = useState(false)
  useData(() => AGENTS.map((a) => getAgentStatus(a.id).absent).join())
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="rounded-full ring-2 ring-transparent hover:ring-slate-200" title={`${agent.name} – Rolle wechseln`}>
        <Avatar initials={agent.initials} color={agent.color} size={34} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-[330px] rounded-md bg-white p-2 shadow-2xl ring-1 ring-slate-200">
            <div className="px-2 pt-1 pb-2 text-[11.5px] font-bold tracking-wide text-subtle uppercase">Demo: Angemeldet als</div>
            {AGENTS.map((a) => {
              const st = getAgentStatus(a.id)
              return (
                <div key={a.id} className={`flex items-center gap-2 rounded px-2 py-1.5 ${a.id === agent.id ? 'bg-[#DEEBFF]' : 'hover:bg-slate-50'}`}>
                  <button
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    onClick={() => {
                      setAgent(a.id)
                      setOpen(false)
                    }}
                  >
                    <Avatar initials={a.initials} color={a.color} size={28} />
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-medium">{a.name}</div>
                      <div className="truncate text-[11.5px] text-subtle">
                        {a.roleLabel}
                        {st.absent && <span className="font-semibold text-[#DE350B]"> · abwesend</span>}
                      </div>
                    </div>
                  </button>
                  {a.team !== 'lead' && (
                    <button
                      onClick={() => setAbsent(a.id, !st.absent, st.absent ? undefined : 'Ferien')}
                      className={`rounded p-1.5 ${st.absent ? 'bg-red-50 text-[#DE350B]' : 'text-slate-400 hover:bg-slate-100'}`}
                      title={st.absent ? 'Abwesenheit beenden' : 'Als abwesend markieren (Ferien)'}
                    >
                      <Plane size={14} />
                    </button>
                  )}
                </div>
              )
            })}
            <div className="mt-1 border-t border-line px-2 pt-2 text-[11.5px] text-subtle">
              ✈ = Abwesenheit: Kundenrückmeldungen gehen dann an die Team-Queue. <PP ids={['PP13']} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
