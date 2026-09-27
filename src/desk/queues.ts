import type { Ticket } from '../lib/types'
import { slaState } from '../lib/sla'

export const isOpen = (t: Ticket) => t.status !== 'geloest' && t.status !== 'geschlossen'

export interface QueueDef {
  id: string
  label: string
  dot?: string
  group: 'queues' | 'kanaele' | 'archiv'
  test: (t: Ticket, now: number, me: string) => boolean
  chronological?: boolean
}

export const QUEUES: QueueDef[] = [
  { id: 'alle', label: 'Alle offenen Tickets', dot: '#0052CC', group: 'queues', test: isOpen },
  { id: 'hoch', label: 'Hohe Priorität', dot: '#DE350B', group: 'queues', test: (t) => isOpen(t) && t.priority === 'hoch' },
  { id: 'nicht-zugewiesen', label: 'Nicht zugewiesen', dot: '#97A0AF', group: 'queues', test: (t) => isOpen(t) && !t.assigneeId },
  { id: 'sla', label: 'SLA-Frist bald', dot: '#FF8B00', group: 'queues', test: (t, now) => isOpen(t) && ['soon', 'breached'].includes(slaState(t, now).kind) },
  { id: 'second', label: 'Second Level', dot: '#6554C0', group: 'queues', test: (t) => isOpen(t) && t.team === 'second', chronological: true },
  { id: 'meine', label: 'Meine Tickets', dot: '#36B37E', group: 'queues', test: (t, _n, me) => isOpen(t) && t.assigneeId === me },
  { id: 'rueckmeldung', label: 'Kundenrückmeldungen', dot: '#00B8D9', group: 'queues', test: (t) => !!t.customerUpdate && t.status !== 'geschlossen' },
  { id: 'portal', label: 'Kundenportal', group: 'kanaele', test: (t) => isOpen(t) && t.channel === 'portal' },
  { id: 'email', label: 'E-Mail-Anfragen', group: 'kanaele', test: (t) => isOpen(t) && t.channel === 'email' },
  { id: 'telefon', label: 'Telefon (im Namen erfasst)', group: 'kanaele', test: (t) => isOpen(t) && t.channel === 'telefon' },
  { id: 'geloest', label: 'Gelöst – Bestätigung offen', group: 'archiv', test: (t) => t.status === 'geloest' },
  { id: 'geschlossen', label: 'Geschlossen', group: 'archiv', test: (t) => t.status === 'geschlossen' },
]

const PRIO_RANK = { hoch: 0, mittel: 1, tief: 2 }

export function sortQueue(list: Ticket[], q: QueueDef, now: number) {
  if (q.chronological) return [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return [...list].sort((a, b) => {
    const p = PRIO_RANK[a.priority] - PRIO_RANK[b.priority]
    if (p) return p
    const da = slaState(a, now).due?.getTime() ?? Infinity
    const db = slaState(b, now).due?.getTime() ?? Infinity
    const ra = a.firstResponseAt ? Infinity : da
    const rb = b.firstResponseAt ? Infinity : db
    if (ra !== rb) return ra - rb
    return b.number - a.number
  })
}
