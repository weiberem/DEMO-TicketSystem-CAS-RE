import { store } from './store'
import type {
  Actor,
  AgentStatus,
  Attachment,
  Channel,
  Customer,
  Email,
  EventKind,
  LegacyTicket,
  Notification,
  Priority,
  Rec,
  RequestType,
  Status,
  Team,
  Ticket,
  TicketEvent,
  TimeEntry,
} from './types'
import { AGENTS, CONTACTS, HOTLINE, PRIORITY_META, SLA_TABLE, STATUS_META, agentById, contactById } from './constants'

const uid = (p: string) =>
  `${p}-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`
const now = () => new Date().toISOString()

// ---------------------------------------------------------------------------
// Lesezugriffe
// ---------------------------------------------------------------------------

export const getTickets = () => store.all<Ticket>('ticket')
export const getTicket = (key: string) => store.get<Ticket>(key)
export const getCustomers = () => store.all<Customer>('customer').sort((a, b) => a.name.localeCompare(b.name))
export const getCustomer = (id: string) => store.get<Customer>(id)
export const getEvents = (ticketId: string) =>
  store
    .all<TicketEvent>('event')
    .filter((e) => e.ticketId === ticketId)
    .sort((a, b) => a.at.localeCompare(b.at))
export const getTimeEntries = (ticketId?: string) =>
  store
    .all<TimeEntry>('time')
    .filter((t) => !ticketId || t.ticketId === ticketId)
    .sort((a, b) => a.at.localeCompare(b.at))
export const getEmails = (contactId: string) =>
  store
    .all<Email>('email')
    .filter((e) => e.toContactId === contactId)
    .sort((a, b) => b.at.localeCompare(a.at))
export const getAgentStatus = (id: string) => store.get<AgentStatus>('status-' + id) ?? { id, absent: false }
export const getNotifications = (agentId: string) => {
  const a = agentById(agentId)
  return store
    .all<Notification>('notification')
    .filter((n) => n.target === agentId || (a && a.team !== 'lead' && n.target === 'team:' + a.team) || (a?.team === 'lead' && n.target.startsWith('team:')))
    .sort((x, y) => y.at.localeCompare(x.at))
}
export const getLegacyTickets = () => store.all<LegacyTicket>('legacy').sort((a, b) => Number(b.id) - Number(a.id))
export const getLegacy = (id: string) => store.get<LegacyTicket>('legacy-' + id)

export const agentActor = (id: string): Actor => ({ type: 'agent', id, name: agentById(id)?.name ?? id })
export const contactActor = (id: string): Actor => ({ type: 'customer', id, name: contactById(id)?.name ?? id })
const systemActor: Actor = { type: 'system', name: 'System' }

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function ev(ticketId: string, kind: EventKind, actor: Actor, text: string, pub: boolean, extra: Partial<TicketEvent> = {}): Rec {
  const id = uid('ev')
  return { id, kind: 'event', data: { id, ticketId, at: now(), kind, actor, text, public: pub, ...extra } satisfies TicketEvent }
}

function mail(toContactId: string, subject: string, body: string, ticketKey?: string): Rec {
  const id = uid('mail')
  return { id, kind: 'email', data: { id, toContactId, subject, body, at: now(), ticketKey } satisfies Email }
}

function notif(target: string, text: string, ticketKey: string): Rec {
  const id = uid('notif')
  return { id, kind: 'notification', data: { id, target, text, ticketKey, at: now(), readBy: [] } satisfies Notification }
}

function tRec(t: Ticket): Rec {
  return { id: t.id, kind: 'ticket', data: { ...t, updatedAt: now() } }
}

const portalLink = (key: string) => `${location.origin}/portal/ticket/${key}`

function statusText(from: Status, to: Status) {
  return `Status: ${STATUS_META[from].label} → ${STATUS_META[to].label}`
}

// ---------------------------------------------------------------------------
// Ticket erstellen (Kundenportal, E-Mail oder im Namen des Kunden)
// ---------------------------------------------------------------------------

export interface NewTicketInput {
  customerId: string
  contactId: string
  type: RequestType
  category: string
  priority: Priority
  subject: string
  description: string
  attachments: Attachment[]
  channel: Channel
  createdByAgentId?: string
}

export async function createTicket(input: NewTicketInput): Promise<Ticket> {
  const numbers = getTickets().map((t) => t.number)
  let number = Math.max(1042, ...numbers) + 1
  const ts = now()
  let t: Ticket
  // Eindeutige Ticketnummer auch bei gleichzeitiger Erfassung von mehreren Geräten
  for (;;) {
    const key = `TS-${number}`
    t = {
      ...input,
      id: key,
      key,
      number,
      status: 'neu',
      team: 'first',
      assigneeId: null,
      createdAt: ts,
      updatedAt: ts,
      reopenedCount: 0,
    }
    if (await store.insertUnique({ id: key, kind: 'ticket', data: t })) break
    number++
  }
  const contact = contactById(input.contactId)
  const customer = getCustomer(input.customerId)
  const recs: Rec[] = []
  const actor = input.createdByAgentId ? agentActor(input.createdByAgentId) : contactActor(input.contactId)
  const how =
    input.channel === 'portal'
      ? 'Ticket über das Kundenportal erfasst.'
      : input.channel === 'email'
        ? `E-Mail an support@timetool.ch – automatisch mit Kunde ${customer?.name} verknüpft.`
        : `Telefonisch gemeldet – durch ${agentById(input.createdByAgentId)?.name} im Namen von ${contact?.name} erfasst.`
  recs.push(ev(t.id, 'created', actor, how, true, { via: input.channel, attachments: input.attachments }))
  if (input.priority === 'hoch' && input.channel === 'portal') {
    recs.push(ev(t.id, 'system', systemActor, `Hinweis angezeigt: Priorität «Hoch» – bitte zusätzlich telefonisch melden (${HOTLINE}).`, true))
  }
  const sla = SLA_TABLE[input.priority]
  recs.push(
    mail(
      input.contactId,
      `[${t.key}] Eingangsbestätigung: ${input.subject}`,
      `Guten Tag ${contact?.name}\n\nIhre Anfrage ist eingegangen und hat die Ticketnummer ${t.key}.\nPriorität: ${PRIORITY_META[input.priority].label} – garantierte Reaktionszeit: ${sla.reaction}.\n` +
        (input.priority === 'hoch' ? `\nBitte melden Sie Störungen mit Priorität «Hoch» zusätzlich telefonisch: ${HOTLINE}\n` : '') +
        `\nStatus und Verlauf jederzeit im Kundenportal:\n${portalLink(t.key)}\n\nFreundliche Grüsse\nTimeTool Support`,
      t.key,
    ),
  )
  recs.push(ev(t.id, 'email_out', systemActor, `Eingangsbestätigung mit Ticketnummer an ${contact?.email} gesendet.`, true))
  recs.push(
    notif('team:first', `Neues Ticket ${t.key} (${PRIORITY_META[input.priority].label}) · ${customer?.name} · via ${input.channel === 'email' ? 'E-Mail' : input.channel === 'telefon' ? 'Telefon' : 'Portal'}`, t.key),
  )
  store.putMany(recs)
  return t
}

// ---------------------------------------------------------------------------
// Support-Aktionen
// ---------------------------------------------------------------------------

export function agentReply(t: Ticket, agentId: string, text: string, attachments: Attachment[] = [], nextStatus?: Status) {
  const recs: Rec[] = []
  const nt: Ticket = { ...t, customerUpdate: false }
  if (!nt.firstResponseAt) nt.firstResponseAt = now()
  if (!nt.assigneeId) {
    nt.assigneeId = agentId
    recs.push(ev(t.id, 'assign', agentActor(agentId), `Zugewiesen an ${agentById(agentId)?.short}`, false))
  }
  const target = nextStatus ?? (t.status === 'neu' ? 'in_arbeit' : t.status)
  if (target !== t.status) {
    recs.push(ev(t.id, 'status', agentActor(agentId), statusText(t.status, target), true))
    nt.status = target
  }
  recs.push(ev(t.id, 'reply_agent', agentActor(agentId), text, true, { attachments }))
  recs.push(
    mail(
      t.contactId,
      `[${t.key}] Neue Antwort vom TimeTool Support`,
      `Guten Tag ${contactById(t.contactId)?.name}\n\nZu Ihrer Anfrage ${t.key} «${t.subject}» gibt es eine neue Antwort:\n\n${text}\n\nBitte antworten Sie direkt im Kundenportal – so bleibt der gesamte Verlauf im Ticket:\n${portalLink(t.key)}`,
      t.key,
    ),
  )
  recs.push(tRec(nt))
  store.putMany(recs)
}

export function agentNote(t: Ticket, agentId: string, text: string, mentions: string[]) {
  const recs: Rec[] = [ev(t.id, 'note', agentActor(agentId), text, false, { mentions })]
  for (const m of mentions) recs.push(notif(m, `${agentById(agentId)?.short} hat dich in ${t.key} erwähnt`, t.key))
  recs.push(tRec({ ...t, customerUpdate: false }))
  store.putMany(recs)
}

export function setStatus(t: Ticket, agentId: string, status: Status) {
  if (status === t.status) return
  const nt: Ticket = { ...t, status }
  if (status === 'geschlossen') nt.closedAt = now()
  if (status !== 'second_level' && t.status === 'second_level') nt.team = 'first'
  store.putMany([ev(t.id, 'status', agentActor(agentId), statusText(t.status, status), true), tRec(nt)])
}

export function assign(t: Ticket, actorId: string, assigneeId: string | null, team?: Team) {
  const nt: Ticket = { ...t, assigneeId, team: team ?? t.team }
  const recs: Rec[] = []
  const label = assigneeId ? `Zugewiesen an ${agentById(assigneeId)?.short}` : `Zuweisung aufgehoben – liegt in der Team-Queue (${nt.team === 'second' ? 'Second Level' : 'First Level'})`
  recs.push(ev(t.id, 'assign', agentActor(actorId), label, false))
  if (assigneeId && assigneeId !== actorId) recs.push(notif(assigneeId, `${agentById(actorId)?.short} hat dir ${t.key} zugewiesen`, t.key))
  if (t.status === 'neu' && assigneeId) {
    nt.status = 'in_arbeit'
    recs.push(ev(t.id, 'status', agentActor(actorId), statusText('neu', 'in_arbeit'), true))
  }
  recs.push(tRec(nt))
  store.putMany(recs)
}

export function escalate(t: Ticket, agentId: string, reason: string, assigneeId: string | null) {
  const nt: Ticket = { ...t, team: 'second', status: 'second_level', escalationReason: reason, assigneeId }
  const recs: Rec[] = [
    ev(t.id, 'escalate', agentActor(agentId), `An Second Level eskaliert. Grund: ${reason}`, false),
    ev(t.id, 'status', agentActor(agentId), statusText(t.status, 'second_level'), true),
    notif(assigneeId ?? 'team:second', `${t.key} an Second Level eskaliert: ${reason}`, t.key),
  ]
  if (assigneeId) recs.push(ev(t.id, 'assign', agentActor(agentId), `Zugewiesen an ${agentById(assigneeId)?.short}`, false))
  recs.push(tRec(nt))
  store.putMany(recs)
}

export function backToFirstLevel(t: Ticket, agentId: string, text: string) {
  const nt: Ticket = { ...t, team: 'first', status: 'in_arbeit', assigneeId: null }
  const recs: Rec[] = [
    ev(t.id, 'note', agentActor(agentId), `Zurück an First Level: ${text}`, false),
    ev(t.id, 'status', agentActor(agentId), statusText(t.status, 'in_arbeit'), true),
    notif('team:first', `${t.key} von Second Level zurück: ${text}`, t.key),
    tRec(nt),
  ]
  store.putMany(recs)
}

export function updateFields(t: Ticket, agentId: string, patch: Partial<Pick<Ticket, 'priority' | 'type' | 'category' | 'phoneConfirmed'>>) {
  const recs: Rec[] = []
  if (patch.priority && patch.priority !== t.priority)
    recs.push(ev(t.id, 'priority', agentActor(agentId), `Priorität: ${PRIORITY_META[t.priority].label} → ${PRIORITY_META[patch.priority].label} (SLA neu berechnet)`, true))
  if (patch.type && patch.type !== t.type) recs.push(ev(t.id, 'system', agentActor(agentId), `Anfragetyp angepasst`, false))
  if (patch.category && patch.category !== t.category)
    recs.push(ev(t.id, 'system', agentActor(agentId), `Kategorie: ${t.category} → ${patch.category}`, false))
  if (patch.phoneConfirmed && !t.phoneConfirmed) recs.push(ev(t.id, 'system', agentActor(agentId), 'Telefonische Meldung der Kundin/des Kunden bestätigt.', false))
  recs.push(tRec({ ...t, ...patch }))
  store.putMany(recs)
}

export function logTime(t: Ticket, agentId: string, minutes: number, note: string) {
  const id = uid('time')
  const te: TimeEntry = { id, ticketId: t.id, agentId, minutes, note, at: now() }
  store.putMany([
    { id, kind: 'time', data: te },
    ev(t.id, 'time', agentActor(agentId), `Zeitaufwand erfasst: ${minutes} Min – ${note}`, false),
  ])
}

/** Use Case 03 – Ticket schliessen: Lösung an Kunde, Zeitaufwand erfasst, Kunde bestätigt. */
export function resolveTicket(t: Ticket, agentId: string, solution: string) {
  const recs: Rec[] = []
  const nt: Ticket = { ...t, status: 'geloest', resolvedAt: now(), customerUpdate: false }
  if (!nt.firstResponseAt) nt.firstResponseAt = now()
  if (!nt.assigneeId) nt.assigneeId = agentId
  recs.push(ev(t.id, 'reply_agent', agentActor(agentId), `Lösung: ${solution}`, true))
  recs.push(ev(t.id, 'status', agentActor(agentId), `${statusText(t.status, 'geloest')} (wartet auf Bestätigung durch Kunde)`, true))
  recs.push(
    mail(
      t.contactId,
      `[${t.key}] Ihre Anfrage wurde gelöst – bitte bestätigen`,
      `Guten Tag ${contactById(t.contactId)?.name}\n\nWir haben Ihre Anfrage ${t.key} «${t.subject}» gelöst:\n\n${solution}\n\nSind Sie mit der Lösung einverstanden? Bitte bestätigen Sie im Kundenportal – oder melden Sie uns, falls das Problem weiterhin besteht:\n${portalLink(t.key)}`,
      t.key,
    ),
  )
  recs.push(tRec(nt))
  store.putMany(recs)
}

// ---------------------------------------------------------------------------
// Kunden-Aktionen (Portal)
// ---------------------------------------------------------------------------

/** Rückmeldung landet bei der zuständigen Person – ist sie abwesend, in der Team-Queue (PP13). */
function routeCustomerActivity(t: Ticket, recs: Rec[], text: string): Ticket {
  const nt: Ticket = { ...t, customerUpdate: true }
  if (t.assigneeId && getAgentStatus(t.assigneeId).absent) {
    const who = agentById(t.assigneeId)
    nt.assigneeId = null
    recs.push(
      ev(t.id, 'assign', systemActor, `${who?.short} ist abwesend (${getAgentStatus(t.assigneeId).absentNote ?? 'abwesend'}) – Ticket automatisch in die Team-Queue ${t.team === 'second' ? 'Second Level' : 'First Level'} verschoben.`, false),
    )
    recs.push(notif('team:' + t.team, `${text} – ${who?.short} abwesend, bitte übernehmen`, t.key))
  } else if (t.assigneeId) {
    recs.push(notif(t.assigneeId, text, t.key))
  } else {
    recs.push(notif('team:' + t.team, text, t.key))
  }
  return nt
}

export function customerReply(t: Ticket, contactId: string, text: string, attachments: Attachment[] = []) {
  const recs: Rec[] = [ev(t.id, 'reply_customer', contactActor(contactId), text, true, { via: 'portal', attachments })]
  let nt = routeCustomerActivity(t, recs, `Neue Kundenantwort in ${t.key}`)
  if (t.status === 'warten_kunde') {
    recs.push(ev(t.id, 'status', systemActor, statusText('warten_kunde', 'in_arbeit'), true))
    nt = { ...nt, status: 'in_arbeit' }
  }
  if (t.status === 'geschlossen' || t.status === 'geloest') {
    recs.push(ev(t.id, 'reopen', contactActor(contactId), 'Ticket durch Rückmeldung des Kunden wiedereröffnet.', true))
    recs.push(ev(t.id, 'status', systemActor, statusText(t.status, 'in_arbeit'), true))
    nt = { ...nt, status: 'in_arbeit', reopenedCount: t.reopenedCount + 1, closedAt: undefined }
  }
  recs.push(tRec(nt))
  store.putMany(recs)
}

export function customerFeedback(t: Ticket, contactId: string, accepted: boolean, comment: string) {
  const recs: Rec[] = []
  if (accepted) {
    recs.push(ev(t.id, 'feedback', contactActor(contactId), `Kunde ist mit der Lösung einverstanden – Ticket geschlossen.${comment ? `\n«${comment}»` : ''}`, true))
    recs.push(ev(t.id, 'status', systemActor, statusText('geloest', 'geschlossen'), true))
    if (t.assigneeId) recs.push(notif(t.assigneeId, `${t.key}: Kunde hat die Lösung bestätigt`, t.key))
    recs.push(tRec({ ...t, status: 'geschlossen', closedAt: now() }))
  } else {
    recs.push(ev(t.id, 'feedback', contactActor(contactId), `Kunde ist mit der Lösung NICHT einverstanden.${comment ? `\n«${comment}»` : ''}`, true))
    recs.push(ev(t.id, 'reopen', systemActor, 'Ticket wiedereröffnet (Use Case «Ticket wiedereröffnen»).', true))
    recs.push(ev(t.id, 'status', systemActor, statusText('geloest', 'in_arbeit'), true))
    const nt = routeCustomerActivity(t, recs, `${t.key}: Kunde ist mit Lösung nicht einverstanden`)
    recs.push(tRec({ ...nt, status: 'in_arbeit', reopenedCount: t.reopenedCount + 1, resolvedAt: undefined }))
  }
  store.putMany(recs)
}

export function markSeen(t: Ticket) {
  if (t.customerUpdate) store.put('ticket', t.id, { ...t, customerUpdate: false })
}

// ---------------------------------------------------------------------------
// Verwaltung, Benachrichtigungen
// ---------------------------------------------------------------------------

export function setNotificationRead(n: Notification, agentId: string, read: boolean) {
  const readBy = read ? Array.from(new Set([...n.readBy, agentId])) : n.readBy.filter((x) => x !== agentId)
  store.put('notification', n.id, { ...n, readBy })
}

export function markAllRead(agentId: string) {
  const recs = getNotifications(agentId)
    .filter((n) => !n.readBy.includes(agentId))
    .map((n) => ({ id: n.id, kind: 'notification' as const, data: { ...n, readBy: [...n.readBy, agentId] } }))
  store.putMany(recs)
}

export function setAbsent(agentId: string, absent: boolean, absentNote?: string) {
  store.put('agentstatus', 'status-' + agentId, { id: agentId, absent, absentNote } satisfies AgentStatus)
}

export const allAgents = () => AGENTS
export const hrContacts = () => CONTACTS

// ---------------------------------------------------------------------------
// Altsystem
// ---------------------------------------------------------------------------

export function saveLegacy(t: LegacyTicket) {
  store.put('legacy', 'legacy-' + t.id, { ...t })
}

export function nextLegacyId(): string {
  const ids = getLegacyTickets().map((t) => Number(t.id))
  return String(Math.max(24500, ...ids) + 1)
}

export { uid, now }
