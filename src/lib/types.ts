// ---------- Soll-System (Prototyp) ----------

export type Priority = 'hoch' | 'mittel' | 'tief'
export type RequestType = 'incident' | 'problem' | 'bug' | 'service' | 'frage' | 'change'
export type Status = 'neu' | 'in_arbeit' | 'warten_kunde' | 'second_level' | 'geloest' | 'geschlossen'
export type Channel = 'portal' | 'email' | 'telefon'
export type Team = 'first' | 'second'
export type BillingStatus = 'offen' | 'verrechenbar' | 'nicht_verrechenbar' | 'uebermittelt'

export interface Attachment {
  name: string
  size: number
}

export interface Customer {
  id: string
  nr: string
  name: string
  rate: number // CHF pro Stunde
  contract: string
  city: string
}

export interface Contact {
  id: string
  customerId: string
  name: string
  email: string
  phone: string
  role: 'HR' | 'Mitarbeiter'
  active: boolean
  initials: string
}

export interface Agent {
  id: string
  name: string
  short: string
  initials: string
  team: Team | 'lead'
  roleLabel: string
  color: string
}

export interface Ticket {
  id: string
  key: string
  number: number
  customerId: string
  contactId: string
  type: RequestType
  category: string
  priority: Priority
  subject: string
  description: string
  attachments: Attachment[]
  status: Status
  channel: Channel
  team: Team
  assigneeId: string | null
  escalationReason?: string
  phoneConfirmed?: boolean
  createdAt: string
  updatedAt: string
  firstResponseAt?: string
  resolvedAt?: string
  closedAt?: string
  billing: BillingStatus
  reopenedCount: number
  customerUpdate?: boolean // neue Kundenaktivität, noch nicht gesehen
  createdByAgentId?: string
}

export type EventKind =
  | 'created'
  | 'reply_customer'
  | 'reply_agent'
  | 'note'
  | 'status'
  | 'assign'
  | 'escalate'
  | 'email_out'
  | 'time'
  | 'feedback'
  | 'priority'
  | 'reopen'
  | 'system'

export interface Actor {
  type: 'customer' | 'agent' | 'system'
  id?: string
  name: string
}

export interface TicketEvent {
  id: string
  ticketId: string
  at: string
  kind: EventKind
  actor: Actor
  text?: string
  public: boolean
  via?: Channel
  attachments?: Attachment[]
  mentions?: string[]
}

export interface TimeEntry {
  id: string
  ticketId: string
  agentId: string
  minutes: number
  note: string
  at: string
  billable: boolean
  rate: number
}

export interface Email {
  id: string
  toContactId: string
  subject: string
  body: string
  at: string
  ticketKey?: string
}

export interface Notification {
  id: string
  target: string // Agent-ID oder 'team:first' / 'team:second'
  text: string
  ticketKey: string
  at: string
  readBy: string[]
}

export interface AgentStatus {
  id: string // = Agent-ID
  absent: boolean
  absentNote?: string
}

// ---------- Ist-System (WISE Enterprise Portal, Altsystem) ----------

export interface LegacyMail {
  id: string
  direction: 'in' | 'out'
  from: string
  to: string
  subject: string
  body: string
  at: string
}

export interface LegacySpentTime {
  id: string
  date: string
  user: string
  hours: number
  rate: number
  text: string
}

export interface LegacyHistory {
  id: string
  at: string
  user: string
  text: string
}

export interface LegacyTicket {
  id: string // z.B. "24482"
  title: string
  status: string
  priority: string
  srType: string
  srSubtype: string
  createdAt: string
  updatedAt: string
  closedAt?: string
  company: string
  customerNr: string
  contact: string
  phone: string
  email: string
  assignedTo: string
  externalId: string
  billed: number
  fixBetrag: number
  formText: string // "Description" – Originaltext aus dem Kontaktformular
  attachments: string[]
  mails: LegacyMail[]
  spentTime: LegacySpentTime[]
  comments: { id: string; at: string; user: string; text: string }[]
  history: LegacyHistory[]
  notificationUnread: boolean
  notificationText?: string
}

// ---------- Generischer Speicher ----------

export type Kind =
  | 'ticket'
  | 'event'
  | 'time'
  | 'email'
  | 'notification'
  | 'customer'
  | 'agentstatus'
  | 'legacy'
  | 'meta'

export interface Rec<T = unknown> {
  id: string
  kind: Kind
  data: T
  updated_at?: string
}
