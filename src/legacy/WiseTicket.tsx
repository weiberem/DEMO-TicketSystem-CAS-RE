import { useCallback, useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Clock,
  File,
  GraduationCap,
  Mail,
  Megaphone,
  MessageSquare,
  RotateCcwClock,
  Save,
  Send,
  Settings,
  Star,
  Tag,
} from 'lucide-react'
import type { LegacyMail, LegacySpentTime, LegacyTicket } from '../lib/types'
import { getLegacy, now, saveLegacy, uid } from '../lib/actions'
import { SEED_CUSTOMERS } from '../lib/constants'
import { DiffNote, Modal, PP, toast } from '../components/ui'
import {
  BASE,
  CLOSE_OPTIONS,
  FlagDE,
  PageTitle,
  STATUS_OPTIONS,
  SUPPORT_ADDRESS,
  Spinner,
  USER,
  WiseButton,
  chf,
  fmtDate,
  fmtDay,
  historyEntry,
  isClosed,
} from './wiseParts'

type TabId = 'time' | 'description' | 'mail' | 'attachments' | 'comments' | 'history' | 'sw'
type Icon = ComponentType<{ size?: number; className?: string }>

const inputCls = 'w-full rounded-[2px] border border-[#ccc] bg-white px-2 py-1.5 text-[13px] text-[#333] outline-none focus:border-[#2e7474]'

/** Ticket-Ansicht im WISE Enterprise Portal – nachgebaut nach dem Screenshot von #24482. */
export default function WiseTicket() {
  const { id = '' } = useParams()
  // Momentaufnahme beim Öffnen: WISE aktualisiert sich nicht selbst (PP17).
  const [t, setT] = useState<LegacyTicket | undefined>(() => getLegacy(id))
  const [hadNotification] = useState(() => !!getLegacy(id)?.notificationUnread)
  const [tab, setTab] = useState<TabId>('description')
  const [pendingTab, setPendingTab] = useState<TabId | null>(null)
  const [closing, setClosing] = useState(false)
  const [showCustomer, setShowCustomer] = useState(false)
  const [starred, setStarred] = useState(false)

  // Beim Öffnen wird der Hinweis «gelesen» – für immer (PP12). Kein «als ungelesen markieren».
  useEffect(() => {
    const cur = getLegacy(id)
    if (cur?.notificationUnread) saveLegacy({ ...cur, notificationUnread: false })
  }, [id])

  // Auch Tab-Wechsel laden spürbar nach.
  useEffect(() => {
    if (!pendingTab) return
    const tm = setTimeout(() => {
      setTab(pendingTab)
      setPendingTab(null)
    }, 500 + Math.random() * 700)
    return () => clearTimeout(tm)
  }, [pendingTab])

  /** Eigene Änderung speichern und danach (nur dann) frisch lesen. */
  const commit = useCallback(
    (fn: (cur: LegacyTicket) => LegacyTicket) => {
      const cur = getLegacy(id)
      if (!cur) return
      saveLegacy({ ...fn(cur), updatedAt: now() })
      setT(getLegacy(id))
    },
    [id],
  )

  if (!t) {
    return (
      <div>
        <PageTitle>Ticket not found [#{id}]</PageTitle>
        <p className="text-[13px] text-[#777]">The requested ticket does not exist or you do not have access.</p>
        <Link to={`${BASE}/inbox`} className="mt-4 inline-block text-[13px] text-[#2e7474] hover:underline">
          Back to Inbox
        </Link>
      </div>
    )
  }

  const closed = isClosed(t.status)

  const changeStatus = (status: string) =>
    commit((cur) => ({
      ...cur,
      status,
      closedAt: isClosed(status) ? now() : undefined,
      history: [...cur.history, historyEntry(`Status geändert: ${cur.status} → ${status}`)],
    }))

  const reopen = () => {
    commit((cur) => ({ ...cur, status: 'Open', closedAt: undefined, history: [...cur.history, historyEntry(`Ticket re-opened by ${USER}`)] }))
    toast('Ticket wieder eröffnet (Status: Open)')
  }

  const takeOver = () =>
    commit((cur) => ({
      ...cur,
      assignedTo: USER,
      status: cur.status === 'New' ? 'Open' : cur.status,
      history: [...cur.history, historyEntry(`Zugewiesen an ${USER}`)],
    }))

  const sendMail = (m: LegacyMail) => {
    // Wird hinten angehängt – die Liste bleibt dadurch unsortiert (PP11).
    commit((cur) => ({ ...cur, mails: [...cur.mails, m], history: [...cur.history, historyEntry(`E-Mail gesendet an ${m.to}: ${m.subject}`)] }))
    toast('Mail gesendet', 'success')
  }

  const addTime = (e: LegacySpentTime) => {
    commit((cur) => ({
      ...cur,
      spentTime: [...cur.spentTime, e],
      history: [...cur.history, historyEntry(`Spent Time erfasst: ${e.hours} h à CHF ${e.rate.toFixed(2)}`)],
    }))
    toast('Spent Time gespeichert', 'success')
  }

  const addComment = (text: string) => {
    commit((cur) => ({
      ...cur,
      comments: [...cur.comments, { id: uid('lc'), at: now(), user: USER, text }],
      history: [...cur.history, historyEntry('Kommentar hinzugefügt')],
    }))
    toast('Kommentar gespeichert', 'success')
  }

  const left: [string, ReactNode][] = [
    [
      'Status',
      <span className="inline-flex items-center gap-2">
        {t.status}
        <select
          value=""
          onChange={(e) => e.target.value && changeStatus(e.target.value)}
          className="h-[20px] rounded-[2px] border border-[#ccc] bg-white px-0.5 text-[11px] text-[#666]"
          title="Change Status"
        >
          <option value="">Change Status …</option>
          {STATUS_OPTIONS.filter((s) => s !== t.status).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </span>,
    ],
    ['Deadline', 'N/A'],
    [
      'SR Type',
      <span className="inline-flex items-center gap-1">
        {t.srType} <Settings size={12} className="text-[#444]" />
      </span>,
    ],
    ['Created', fmtDate(t.createdAt)],
    ['Closed', closed && t.closedAt ? fmtDate(t.closedAt) : 'N/A'],
    ['Contact', t.contact || 'N/A'],
    ['Phone', <span className="text-[#888]">{t.phone || 'N/A'}</span>],
    [
      'Assigned to',
      t.assignedTo === 'N/A' ? (
        <span>
          N/A{' '}
          <button onClick={takeOver} className="ml-1 text-[11.5px] text-[#2e7474] hover:underline">
            [take over]
          </button>
        </span>
      ) : (
        t.assignedTo
      ),
    ],
    ['External ID', t.externalId],
    ['Billed', String(t.billed)],
  ]
  const right: [string, ReactNode][] = [
    ['Priority', t.priority],
    ['Follow-Up', 'N/A'],
    ['SR Subtype', t.srSubtype],
    ['Updated', fmtDate(t.updatedAt)],
    ['Parent Ticket', 'N/A'],
    ['Language', <FlagDE />],
    ['Email', <span className="text-[#888]">{t.email || 'N/A'}</span>],
    ['Department', 'N/A'],
    ['Estimated hours', 'N/A'],
    ['Fix Betrag', String(t.fixBetrag)],
  ]

  const tabs: { id: TabId; icon: Icon; label: ReactNode }[] = [
    {
      id: 'time',
      icon: Clock,
      label: (
        <>
          Spent Time <span className={closed ? '' : `font-bold ${tab === 'time' ? 'text-[#ffc2bb]' : 'text-[#d9261c]'}`}>(!)</span>
        </>
      ),
    },
    { id: 'description', icon: Tag, label: 'DESCRIPTION' },
    { id: 'mail', icon: Mail, label: `MAIL (${t.mails.length})` },
    { id: 'attachments', icon: File, label: `ATTACHMENTS (${t.attachments.length})` },
    { id: 'comments', icon: MessageSquare, label: `COMMENTS (${t.comments.length})` },
    { id: 'history', icon: RotateCcwClock, label: `HISTORY (${t.history.length})` },
    { id: 'sw', icon: Save, label: 'SW CHANGES (0)' },
  ]

  return (
    <div>
      <h1 className="font-raleway text-[23px] font-normal tracking-wide text-[#333]">
        {t.title.toUpperCase()} [#{t.id}]
      </h1>
      <div className="mb-5 text-[12.5px] text-[#999]">
        {t.company} · {t.contact} [{t.status}] [Updated on {fmtDate(t.updatedAt)}]
      </div>

      {hadNotification ? (
        <div className="mb-4 flex items-center gap-2 border border-[#f0dc82] bg-[#fcf8e3] px-3 py-2 text-[12.5px] text-[#8a6d3b]">
          <Megaphone size={14} />
          {t.notificationText ?? 'New customer message on this ticket.'} – this notice will not be shown again.
          <PP kind="pain" ids={['PP12']} label="nur einmal sichtbar" className="ml-auto" />
        </div>
      ) : null}

      <section className="border border-[#e6e6e6] bg-white px-6 pt-4 pb-6">
        <h2 className="mb-3 font-raleway text-[14px] tracking-wide text-[#666] uppercase">Ticket Details</h2>

        <div className="grid grid-cols-[135px_290px_170px_1fr] gap-x-2 px-2 text-[13px] leading-[18px] text-[#333]">
          {left.map(([lk, lv], i) => (
            <Row key={lk} lk={lk} lv={lv} rk={right[i][0]} rv={right[i][1]} />
          ))}
        </div>

        <div className="mt-4 flex items-center gap-1 px-2">
          {closed ? <WiseButton onClick={reopen}>Re-Open</WiseButton> : <WiseButton onClick={() => setClosing(true)}>Close Ticket</WiseButton>}
          <WiseButton onClick={() => toast('Report wird generiert … (im Demo nicht umgesetzt)')}>Report</WiseButton>
          <WiseButton onClick={() => setShowCustomer(true)}>Show Customer Details</WiseButton>
          <WiseButton title="Knowledge Base" onClick={() => toast('Knowledge Base: keine passenden Artikel gefunden.')}>
            <GraduationCap size={15} />
          </WiseButton>
          <WiseButton title="Favorite" onClick={() => setStarred(!starred)}>
            <Star size={14} fill={starred ? '#555' : 'none'} />
          </WiseButton>
          {!closed ? (
            <span className="ml-3">
              <PP kind="pain" ids={['PP16']} label="Verrechnung nur via Status" />
            </span>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap items-stretch border-b border-[#e6e6e6] px-2">
          {tabs.map(({ id: tid, icon: I, label }) => {
            const active = (pendingTab ?? tab) === tid
            return (
              <button
                key={tid}
                onClick={() => tid !== tab && setPendingTab(tid)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] whitespace-nowrap transition ${
                  active ? 'bg-[#2e7474] text-white' : 'text-[#888] hover:text-[#2e7474]'
                }`}
              >
                {pendingTab === tid ? <Spinner size={14} /> : <I size={14} />}
                {label}
              </button>
            )
          })}
        </div>

        <div className="min-h-[200px] px-2 pt-5">
          {pendingTab ? (
            <div className="flex items-center gap-2 text-[12.5px] text-[#888]">
              <Spinner /> Loading …
            </div>
          ) : tab === 'description' ? (
            <Description text={t.formText} />
          ) : tab === 'mail' ? (
            <MailTab t={t} onSend={sendMail} />
          ) : tab === 'time' ? (
            <SpentTimeTab t={t} onAdd={addTime} />
          ) : tab === 'attachments' ? (
            <Attachments files={t.attachments} />
          ) : tab === 'comments' ? (
            <Comments t={t} onAdd={addComment} />
          ) : tab === 'history' ? (
            <HistoryTab t={t} />
          ) : (
            <p className="text-[13px] text-[#888]">No software changes linked to this ticket.</p>
          )}
        </div>
      </section>

      <Link to={`${BASE}/inbox`} className="mt-6 inline-block text-[13.5px] text-[#999] hover:text-[#2e7474] hover:underline">
        Back to "{t.company}"
      </Link>

      {closing ? (
        <CloseModal
          onClose={() => setClosing(false)}
          onConfirm={(status) => {
            changeStatus(status)
            setClosing(false)
            toast(`Ticket geschlossen – Status «${status}»`)
          }}
        />
      ) : null}
      {showCustomer ? <CustomerModal t={t} onClose={() => setShowCustomer(false)} /> : null}
    </div>
  )
}

function Row({ lk, lv, rk, rv }: { lk: string; lv: ReactNode; rk: string; rv: ReactNode }) {
  return (
    <>
      <div className="py-[2px] font-semibold text-[#222]">{lk}</div>
      <div className="py-[2px]">{lv}</div>
      <div className="py-[2px] font-semibold text-[#222]">{rk}</div>
      <div className="py-[2px]">{rv}</div>
    </>
  )
}

function Description({ text }: { text: string }) {
  if (!text.trim()) return <p className="text-[13px] text-[#888]">No description available.</p>
  return (
    <div className="text-[13.5px] leading-[1.6] text-[#333]">
      {text.split('\n').map((line, i) => (
        <div key={i} className={line.trim().endsWith(':') ? 'font-semibold' : ''}>
          {line || ' '}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MAIL – einzelne Mails, nicht chronologisch, ohne Zitierfunktion
// ---------------------------------------------------------------------------

function MailTab({ t, onSend }: { t: LegacyTicket; onSend: (m: LegacyMail) => void }) {
  const [open, setOpen] = useState<string[]>([])
  const [compose, setCompose] = useState(false)
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  const startCompose = () => {
    setTo(t.email)
    setSubject(`RE: ${t.title} [#${t.id}]`)
    setBody('')
    setCompose(true)
  }

  const send = () => {
    if (!to.trim() || !body.trim()) {
      toast('Bitte Empfänger und Text eingeben.', 'warn')
      return
    }
    onSend({ id: uid('lm'), direction: 'out', from: SUPPORT_ADDRESS, to: to.trim(), subject: subject.trim(), body, at: now() })
    setCompose(false)
  }

  const toggle = (id: string) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]))

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {!compose ? (
          <WiseButton onClick={startCompose}>
            <Mail size={14} /> New Mail
          </WiseButton>
        ) : null}
        <PP kind="pain" ids={['PP11']} label="nicht chronologisch" />
      </div>

      {compose ? (
        <div className="border border-[#e6e6e6] bg-[#fafafa] p-4">
          <div className="grid grid-cols-[80px_1fr] items-center gap-2 text-[13px]">
            <label className="font-semibold text-[#333]">To</label>
            <input className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
            <label className="font-semibold text-[#333]">Subject</label>
            <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} />
            <label className="self-start pt-1.5 font-semibold text-[#333]">Body</label>
            <textarea className={`${inputCls} min-h-[160px]`} spellCheck={false} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <DiffNote kind="pain" ids={['PP11']} className="mt-3 ml-[88px]">
            Mails werden einzeln verschickt, nicht als Verlauf: Es gibt keine Zitier-Funktion – der letzte Text des Kunden muss von Hand aus der
            Mail oben herauskopiert und hier eingefügt werden.
          </DiffNote>
          <div className="mt-3 ml-[88px] flex gap-1">
            <WiseButton primary onClick={send}>
              <Send size={13} /> Send
            </WiseButton>
            <WiseButton onClick={() => setCompose(false)}>Cancel</WiseButton>
          </div>
        </div>
      ) : null}

      <DiffNote kind="pain" ids={['PP11']}>
        E-Mail-Verlauf muss zusammengesucht werden: Die Mails erscheinen in der Reihenfolge, in der sie abgelegt wurden – nicht chronologisch.
      </DiffNote>

      {t.mails.length === 0 ? (
        <p className="text-[13px] text-[#888]">No mails.</p>
      ) : (
        <div className="border border-[#e6e6e6] text-[12.5px]">
          <div className="grid grid-cols-[18px_18px_130px_220px_1fr] gap-3 border-b border-[#e6e6e6] bg-[#f5f5f5] px-3 py-1.5 font-semibold text-[#555]">
            <span />
            <span />
            <span>Date</span>
            <span>From</span>
            <span>Subject</span>
          </div>
          {t.mails.map((m) => {
            const isOpen = open.includes(m.id)
            return (
              <div key={m.id} className="border-b border-[#eee] last:border-b-0">
                <button
                  onClick={() => toggle(m.id)}
                  className="grid w-full grid-cols-[18px_18px_130px_220px_1fr] items-center gap-3 px-3 py-1.5 text-left text-[#444] hover:bg-[#f7f7f7]"
                >
                  {isOpen ? <ChevronDown size={14} className="text-[#999]" /> : <ChevronRight size={14} className="text-[#999]" />}
                  {m.direction === 'in' ? (
                    <ArrowDownLeft size={15} className="text-[#2e7474]" aria-label="incoming" />
                  ) : (
                    <ArrowUpRight size={15} className="text-[#999]" aria-label="outgoing" />
                  )}
                  <span className="text-[#777] tabular-nums">{fmtDate(m.at)}</span>
                  <span className="truncate">{m.from}</span>
                  <span className="truncate">{m.subject}</span>
                </button>
                {isOpen ? (
                  <div className="border-t border-[#f0f0f0] bg-[#fcfcfc] px-12 py-3">
                    <div className="mb-2 text-[11.5px] text-[#999]">
                      From: {m.from} · To: {m.to} · {fmtDate(m.at)}
                    </div>
                    <div className="text-[13px] leading-[1.55] whitespace-pre-wrap text-[#333]">{m.body}</div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SPENT TIME – Stundensatz fix CHF 200, Spezialverträge nur im Kopf
// ---------------------------------------------------------------------------

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function SpentTimeTab({ t, onAdd }: { t: LegacyTicket; onAdd: (e: LegacySpentTime) => void }) {
  const [date, setDate] = useState(todayStr)
  const [hours, setHours] = useState('')
  const [rate, setRate] = useState('200.00')
  const [text, setText] = useState('')

  const totalHours = t.spentTime.reduce((s, e) => s + e.hours, 0)
  const totalAmount = t.spentTime.reduce((s, e) => s + e.hours * e.rate, 0)

  const add = () => {
    const h = parseFloat(hours.replace(',', '.'))
    const r = parseFloat(rate.replace(',', '.'))
    if (!(h > 0) || !(r >= 0)) {
      toast('Bitte gültige Stunden und Stundensatz eingeben.', 'warn')
      return
    }
    onAdd({ id: uid('lt'), date: new Date(`${date || todayStr()}T12:00:00`).toISOString(), user: USER, hours: h, rate: r, text })
    setHours('')
    setText('')
    setRate('200.00')
  }

  const special = t.customerNr === '0815'

  return (
    <div className="space-y-4">
      <table className="w-full border-collapse border border-[#ddd] text-[12.5px]">
        <thead>
          <tr className="bg-[#f2f2f2] text-left text-[#444]">
            <th className="border border-[#ddd] px-2 py-1.5 font-semibold">Date</th>
            <th className="border border-[#ddd] px-2 py-1.5 font-semibold">User</th>
            <th className="border border-[#ddd] px-2 py-1.5 text-right font-semibold">Hours</th>
            <th className="border border-[#ddd] px-2 py-1.5 text-right font-semibold">Rate CHF</th>
            <th className="border border-[#ddd] px-2 py-1.5 text-right font-semibold">Amount CHF</th>
            <th className="border border-[#ddd] px-2 py-1.5 font-semibold">Billing text</th>
          </tr>
        </thead>
        <tbody>
          {t.spentTime.length === 0 ? (
            <tr>
              <td colSpan={6} className="border border-[#e3e3e3] px-2 py-3 text-center text-[#999]">
                No spent time recorded.
              </td>
            </tr>
          ) : (
            t.spentTime.map((e) => (
              <tr key={e.id}>
                <td className="border border-[#e3e3e3] px-2 py-1 tabular-nums">{fmtDay(e.date)}</td>
                <td className="border border-[#e3e3e3] px-2 py-1">{e.user}</td>
                <td className="border border-[#e3e3e3] px-2 py-1 text-right tabular-nums">{e.hours.toFixed(2)}</td>
                <td className="border border-[#e3e3e3] px-2 py-1 text-right tabular-nums">{chf(e.rate)}</td>
                <td className="border border-[#e3e3e3] px-2 py-1 text-right tabular-nums">{chf(e.hours * e.rate)}</td>
                <td className="border border-[#e3e3e3] px-2 py-1">{e.text}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className="bg-[#fafafa] font-semibold">
            <td className="border border-[#ddd] px-2 py-1" colSpan={2}>
              Total
            </td>
            <td className="border border-[#ddd] px-2 py-1 text-right tabular-nums">{totalHours.toFixed(2)}</td>
            <td className="border border-[#ddd] px-2 py-1" />
            <td className="border border-[#ddd] px-2 py-1 text-right tabular-nums">{chf(totalAmount)}</td>
            <td className="border border-[#ddd] px-2 py-1" />
          </tr>
        </tfoot>
      </table>

      <div className="border border-[#e6e6e6] bg-[#fafafa] p-4">
        <div className="mb-3 font-raleway text-[13px] tracking-wide text-[#666] uppercase">Add spent time</div>
        <div className="grid grid-cols-[130px_220px_1fr] items-center gap-x-3 gap-y-2 text-[13px]">
          <label className="font-semibold text-[#333]">Date</label>
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          <span />
          <label className="font-semibold text-[#333]">Hours</label>
          <input type="number" step={0.25} min={0} className={inputCls} value={hours} onChange={(e) => setHours(e.target.value)} placeholder="0.00" />
          <span />
          <label className="font-semibold text-[#333]">Stundensatz CHF</label>
          <input className={inputCls} value={rate} onChange={(e) => setRate(e.target.value)} />
          <span>
            <PP kind="pain" ids={[]} label="fix 200.00 – nicht aus Kundenvertrag" />
          </span>
          <label className="self-start pt-1.5 font-semibold text-[#333]">Billing text</label>
          <textarea
            className={`${inputCls} col-span-1 min-h-[70px]`}
            spellCheck={false}
            autoCorrect="off"
            placeholder="Verrechnungsgrund"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <span className="self-start pt-1">
            <PP kind="pain" ids={['PP14']} label="keine Rechtschreibprüfung" />
          </span>
          <span />
          <div className="flex gap-1">
            <WiseButton primary onClick={add}>
              <Save size={13} /> Save
            </WiseButton>
          </div>
        </div>
        <DiffNote kind="pain" ids={[]} className="mt-3">
          {special ? (
            <>
              <b>Spezialvertrag Sebi-Sport: CHF 180 statt 200</b> muss manuell erfasst werden – Wissen nur im Kopf der Mitarbeitenden (steht höchstens
              irgendwo in den Kundennotizen).
            </>
          ) : (
            <>Der Stundensatz ist immer mit CHF 200.00 vorbelegt – abweichende Kundenkonditionen muss man kennen und von Hand eintragen.</>
          )}
        </DiffNote>
      </div>
    </div>
  )
}

function Attachments({ files }: { files: string[] }) {
  if (!files.length) return <p className="text-[13px] text-[#888]">No attachments.</p>
  return (
    <ul className="space-y-1.5 text-[13px]">
      {files.map((f, i) => (
        <li key={f + i} className="flex items-center gap-2">
          <File size={14} className="text-[#999]" />
          <button className="text-[#2e7474] hover:underline" onClick={() => toast('Download im Demo nicht verfügbar')}>
            {f}
          </button>
        </li>
      ))}
    </ul>
  )
}

function Comments({ t, onAdd }: { t: LegacyTicket; onAdd: (text: string) => void }) {
  const [text, setText] = useState('')
  return (
    <div className="space-y-3">
      {t.comments.length === 0 ? (
        <p className="text-[13px] text-[#888]">No comments.</p>
      ) : (
        <div className="space-y-2">
          {t.comments.map((c) => (
            <div key={c.id} className="border border-[#eee] bg-[#fcfcfc] px-3 py-2 text-[13px]">
              <div className="mb-0.5 text-[11.5px] text-[#999]">
                {c.user} · {fmtDate(c.at)}
              </div>
              <div className="whitespace-pre-wrap text-[#333]">{c.text}</div>
            </div>
          ))}
        </div>
      )}
      <div className="max-w-[720px]">
        <textarea
          className={`${inputCls} min-h-[70px]`}
          spellCheck={false}
          placeholder="Add a comment …"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-2 flex items-center gap-3">
          <WiseButton
            primary
            onClick={() => {
              if (!text.trim()) return
              onAdd(text.trim())
              setText('')
            }}
          >
            Add Comment
          </WiseButton>
          <PP kind="pain" ids={['PP18']} label="kein @-Erwähnen" />
        </div>
      </div>
      <DiffNote kind="pain" ids={['PP18']}>
        Kommentare sind reine Notizen – Kolleginnen und Kollegen können nicht markiert werden und erfahren nichts davon. Wer mithelfen soll, muss
        separat (mündlich, Teams, E-Mail) informiert werden.
      </DiffNote>
    </div>
  )
}

function HistoryTab({ t }: { t: LegacyTicket }) {
  return (
    <table className="w-full border-collapse border border-[#ddd] text-[12.5px]">
      <thead>
        <tr className="bg-[#f2f2f2] text-left text-[#444]">
          <th className="w-[140px] border border-[#ddd] px-2 py-1.5 font-semibold">Date</th>
          <th className="w-[160px] border border-[#ddd] px-2 py-1.5 font-semibold">User</th>
          <th className="border border-[#ddd] px-2 py-1.5 font-semibold">Text</th>
        </tr>
      </thead>
      <tbody>
        {t.history.map((h) => (
          <tr key={h.id}>
            <td className="border border-[#e3e3e3] px-2 py-1 text-[#777] tabular-nums">{fmtDate(h.at)}</td>
            <td className="border border-[#e3e3e3] px-2 py-1">{h.user}</td>
            <td className="border border-[#e3e3e3] px-2 py-1">{h.text}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------

function CloseModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (status: string) => void }) {
  const [status, setStatus] = useState(CLOSE_OPTIONS[0])
  return (
    <Modal title="Close Ticket" onClose={onClose} width={500}>
      <div className="font-noto text-[13px] text-[#333]">
        <label className="mb-1 block font-semibold">Status</label>
        <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
          {CLOSE_OPTIONS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <DiffNote kind="pain" ids={['PP16']} className="mt-3">
          Status manuell setzen, damit die Buchhaltung weiss, ob verrechnet werden kann. Keine Rückmeldung an den Kunden, keine Bestätigung der
          Lösung, kein Feedback-Loop.
        </DiffNote>
        <div className="mt-4 flex justify-end gap-1">
          <WiseButton onClick={onClose}>Cancel</WiseButton>
          <WiseButton primary onClick={() => onConfirm(status)}>
            Save
          </WiseButton>
        </div>
      </div>
    </Modal>
  )
}

const SEBI_NOTES = [
  '2009: Einführung TimeTool Zeiterfassung (3 Standorte). Ansprechperson damals Hr. Baumann, nicht mehr im Unternehmen.',
  '2010: Zusatzmodul Absenzen, Import Feriensaldi aus Excel (einmalig).',
  '2011: Migration auf Version 3, diverse Anpassungen Schichtplanung Filiale Thun.',
  '2012: Telefonische Anfragen bitte nur über Zentrale (Hr. Baumann).',
  '2013: Badge-Leser Eingang Süd ersetzt (Garantiefall).',
  '2014: Schulung Personalabteilung vor Ort (2 Tage).',
  '2015: Filiale Interlaken eröffnet, 2 Terminals nachgeliefert.',
  '… Kunde seit 2009, Spezialvertrag: Stundensatz CHF 180.– (bitte manuell erfassen) …',
  '2016: Zutrittskontrolle Lager erweitert, Offerte angenommen.',
  '2018: Rechnungen bitte immer an Buchhaltung z. Hd. Fr. Zaugg, nicht an HR.',
  '2020: Homeoffice-Regelung, Zeitkonten angepasst. Kein Support am Samstag gewünscht.',
  '2022: Neue HR-Ansprechperson Sebi Sutter.',
  '2024: Modul PEP lizenziert, aber nicht eingeführt.',
].join('\n')

function CustomerModal({ t, onClose }: { t: LegacyTicket; onClose: () => void }) {
  const sebi = t.customerNr === '0815'
  const city = SEED_CUSTOMERS.find((c) => c.nr === t.customerNr)?.city ?? 'Thun'
  const notes = sebi
    ? SEBI_NOTES
    : `Kunde seit ${2010 + (Number(t.customerNr) % 12 || 3)}. Standard-Supportvertrag.\nAnsprechperson: ${t.contact}.\nKeine besonderen Vereinbarungen bekannt.`
  const rows: [string, string][] = [
    ['Company', t.company],
    ['Customer Nr', t.customerNr || 'N/A'],
    ['Address', sebi ? 'Seestrasse 12' : 'Industriestrasse 7'],
    ['', sebi ? '3700 Spiez' : `3600 ${city}`],
    ['Contact', t.contact || 'N/A'],
    ['Phone', t.phone || 'N/A'],
    ['Email', t.email || 'N/A'],
  ]
  return (
    <Modal title={`Customer Details – ${t.company}`} onClose={onClose} width={620}>
      <div className="font-noto text-[13px] text-[#333]">
        <div className="grid grid-cols-[120px_1fr] gap-y-1">
          {rows.map(([k, v], i) => (
            <div key={i} className="contents">
              <div className="font-semibold">{k}</div>
              <div>{v}</div>
            </div>
          ))}
        </div>
        <label className="mt-4 mb-1 block font-semibold">Notes</label>
        <textarea readOnly className={`${inputCls} h-[110px] resize-y bg-[#fcfcfc] leading-[1.5]`} value={notes} />
        <DiffNote kind="pain" ids={[]} className="mt-3">
          Vertragskonditionen stehen nur im Freitext der Kundennotizen – beim Erfassen der Spent Time wird der Stundensatz nicht übernommen.
        </DiffNote>
      </div>
    </Modal>
  )
}
