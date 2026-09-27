import type { Agent, Contact, Customer, Priority, RequestType, Status, BillingStatus, Channel } from './types'

export const HOTLINE = '+41 33 334 10 20'
export const SUPPORT_MAIL = 'support@timetool.ch'
export const SERVICE_HOURS = 'Mo–Do 09:00–11:00 und 14:00–16:00 · Fr 09:00–11:00'

// Stammdaten (fiktiv). Die Kunden liegen zusätzlich als bearbeitbare Datensätze im Speicher,
// damit der Stundensatz pro Kunde in einer Tabelle gepflegt werden kann.
export const SEED_CUSTOMERS: Customer[] = [
  { id: 'c-buehler', nr: '1042', name: 'Bühler AG', rate: 200, contract: 'Standard-Supportvertrag', city: 'Thun' },
  { id: 'c-meier', nr: '1187', name: 'Meier Transport AG', rate: 200, contract: 'Standard-Supportvertrag', city: 'Bern' },
  { id: 'c-roth', nr: '1203', name: 'Roth Bau GmbH', rate: 200, contract: 'Standard-Supportvertrag', city: 'Biel' },
  { id: 'c-sebi', nr: '0815', name: 'Sebi-Sport AG', rate: 180, contract: 'Spezialvertrag (Altkunde seit 2009)', city: 'Spiez' },
  { id: 'c-keller', nr: '1311', name: 'Keller Gastro AG', rate: 195, contract: 'Rahmenvertrag 2022', city: 'Interlaken' },
]

export const CONTACTS: Contact[] = [
  { id: 'p-brunner', customerId: 'c-buehler', name: 'Monika Brunner', email: 'm.brunner@buehler-ag.example', phone: '+41 33 555 10 42', role: 'HR', active: true, initials: 'MB' },
  { id: 'p-sutter', customerId: 'c-sebi', name: 'Sebi Sutter', email: 'hr@sebi-sport.example', phone: '+41 33 555 08 15', role: 'HR', active: true, initials: 'SS' },
  { id: 'p-meier', customerId: 'c-meier', name: 'Daniel Meier', email: 'd.meier@meier-transport.example', phone: '+41 31 555 11 87', role: 'HR', active: true, initials: 'DM' },
  { id: 'p-roth', customerId: 'c-roth', name: 'Sandra Roth', email: 's.roth@roth-bau.example', phone: '+41 32 555 12 03', role: 'HR', active: true, initials: 'SR' },
  { id: 'p-keller', customerId: 'c-keller', name: 'Laura Keller', email: 'l.keller@keller-gastro.example', phone: '+41 33 555 13 11', role: 'HR', active: true, initials: 'LK' },
  // Negativfälle für die Login-Regel (PP01): nur aktive HR-Ansprechpersonen
  { id: 'p-muster', customerId: 'c-buehler', name: 'Peter Muster', email: 'p.muster@buehler-ag.example', phone: '', role: 'Mitarbeiter', active: true, initials: 'PM' },
  { id: 'p-frei', customerId: 'c-roth', name: 'Thomas Frei', email: 't.frei@roth-bau.example', phone: '', role: 'HR', active: false, initials: 'TF' },
]

export const AGENTS: Agent[] = [
  { id: 'rw', name: 'Rémy Weibel', short: 'R. Weibel', initials: 'RW', team: 'first', roleLabel: 'Support First Level', color: '#0052CC' },
  { id: 'nr', name: 'Nicole Riesen', short: 'N. Riesen', initials: 'NR', team: 'first', roleLabel: 'Support First Level', color: '#00A3BF' },
  { id: 'sw', name: 'Sebastian Wright', short: 'S. Wright', initials: 'SW', team: 'first', roleLabel: 'Support First Level', color: '#00875A' },
  { id: 'jg', name: 'José Gómez', short: 'J. Gómez', initials: 'JG', team: 'first', roleLabel: 'Triage Manager', color: '#6554C0' },
  { id: 'lh', name: 'Livia Hebeisen', short: 'L. Hebeisen', initials: 'LH', team: 'second', roleLabel: 'Second Level', color: '#403294' },
  { id: 'ls', name: 'Leitung Support', short: 'Leitung Support', initials: 'LS', team: 'lead', roleLabel: 'Leiter Support-Team', color: '#DE350B' },
]

export const TEAM_LABEL: Record<'first' | 'second', string> = {
  first: 'Team First Level',
  second: 'Team Second Level',
}

export const REQUEST_TYPES: { id: RequestType; label: string; short: string; hint: string }[] = [
  { id: 'incident', label: 'Incident – etwas funktioniert nicht', short: 'Incident', hint: 'Eine Funktion ist gestört oder nicht verfügbar.' },
  { id: 'problem', label: 'Problem – wiederkehrende Störung', short: 'Problem', hint: 'Eine Störung tritt wiederholt auf, Ursache unklar.' },
  { id: 'bug', label: 'Bug – Fehler in der Software', short: 'Bug', hint: 'Die Software liefert ein falsches Ergebnis.' },
  { id: 'service', label: 'Service-Anfrage – z. B. Zugang, Lizenz', short: 'Service-Anfrage', hint: 'Sie benötigen eine Leistung (Zugang, Lizenz, Einrichtung).' },
  { id: 'frage', label: 'Frage / Information (Support general)', short: 'Frage', hint: 'Sie haben eine Frage zur Bedienung.' },
  { id: 'change', label: 'Change / Feature Request', short: 'Feature Request', hint: 'Sie wünschen eine Anpassung oder neue Funktion.' },
]

export const CATEGORIES = [
  'Zeiterfassung',
  'Absenzen',
  'Personaleinsatzplanung (PEP)',
  'Leistungs- & Projekterfassung',
  'Zutrittskontrolle',
  'Reporting',
  'Schnittstelle / Export',
  'Zugang / Login',
  'Mobile App',
  'Lizenz & Vertrag',
]

// SLA-Auszug (TimeTool AG, 2023): Hoch / Mittel / Tief
export const SLA_TABLE: Record<Priority, { reaction: string; intervention: string; problem: string; solution: string }> = {
  hoch: { reaction: '2 Stunden', intervention: '4 Stunden', problem: '8 Stunden', solution: '1 Monat' },
  mittel: { reaction: '1 Arbeitstag', intervention: '2 Arbeitstage', problem: '4 Arbeitstage', solution: '2 Monate' },
  tief: { reaction: 'Best Effort', intervention: 'Best Effort', problem: 'Best Effort', solution: 'Best Effort' },
}

export const PRIORITY_META: Record<Priority, { label: string; color: string; desc: string }> = {
  hoch: {
    label: 'Hoch',
    color: '#DE350B',
    desc: 'Schaden nimmt schnell zu, Aufgaben sind zeitkritisch. Zusätzlich telefonische Meldung zwingend.',
  },
  mittel: { label: 'Mittel', color: '#FF8B00', desc: 'Schaden nimmt im Verlauf der Zeit zu, mässig zeitkritisch.' },
  tief: { label: 'Tief', color: '#36B37E', desc: 'Kein zunehmender Schaden, z. B. Frage oder Change – nicht zeitkritisch.' },
}

/** Welche Prioritäten je Anfragetyp zulässig sind (Auszug SLA, Tabelle 2). */
export function allowedPriorities(type: RequestType): Priority[] {
  if (type === 'incident' || type === 'problem' || type === 'bug') return ['hoch', 'mittel', 'tief']
  if (type === 'service') return ['mittel', 'tief']
  return ['tief']
}

export function defaultPriority(type: RequestType): Priority {
  return allowedPriorities(type).includes('mittel') ? 'mittel' : 'tief'
}

export const STATUS_META: Record<Status, { label: string; customer: string; bg: string; fg: string }> = {
  neu: { label: 'Neu', customer: 'Eingegangen', bg: '#DEEBFF', fg: '#0747A6' },
  in_arbeit: { label: 'In Arbeit', customer: 'In Arbeit', bg: '#FFF0B3', fg: '#172B4D' },
  warten_kunde: { label: 'Warten auf Kunde', customer: 'Rückmeldung benötigt', bg: '#DFE1E6', fg: '#42526E' },
  second_level: { label: 'Second Level', customer: 'In Abklärung', bg: '#EAE6FF', fg: '#403294' },
  geloest: { label: 'Gelöst', customer: 'Gelöst – bitte bestätigen', bg: '#E3FCEF', fg: '#006644' },
  geschlossen: { label: 'Geschlossen', customer: 'Erledigt', bg: '#E3FCEF', fg: '#006644' },
}

export const BILLING_META: Record<BillingStatus, { label: string; bg: string; fg: string }> = {
  offen: { label: 'Offen', bg: '#DFE1E6', fg: '#42526E' },
  verrechenbar: { label: 'Verrechenbar', bg: '#E3FCEF', fg: '#006644' },
  nicht_verrechenbar: { label: 'Nicht verrechenbar', bg: '#FFEBE6', fg: '#BF2600' },
  uebermittelt: { label: 'An Buchhaltung übermittelt', bg: '#DEEBFF', fg: '#0747A6' },
}

export const CHANNEL_LABEL: Record<Channel, string> = {
  portal: 'Kundenportal',
  email: 'E-Mail → automatisch verknüpft',
  telefon: 'Telefon (durch Support erfasst)',
}

export const PAIN_POINTS: Record<string, string> = {
  PP01: 'Kontaktformular öffentlich – nicht nur HR-Ansprechpersonen',
  PP02: 'Anfrage als Freitext, Richtlinien werden ignoriert',
  PP03: 'Datenverlust bei Übermittlungsfehler',
  PP04: 'Keine Übersicht offener Tickets, keine Eingangsbestätigung',
  PP05: 'Kein Kundenportal mit Status',
  PP06: 'Formular und E-Mail parallel – kein Single Point of Contact',
  PP07: 'Shift Manager lädt 39 Sekunden',
  PP08: 'Unzureichende Angaben → Rückfragen',
  PP09: 'Keine Kategorisierung nach SLA-Dringlichkeit',
  PP10: 'Kein Hinweis auf telefonische Meldung bei «Hoch»',
  PP11: 'E-Mail-Verlauf nicht chronologisch',
  PP12: 'Rückmeldung auf geschlossenes Ticket nur einmalig sichtbar',
  PP13: 'Bei Abwesenheit bleibt Rückmeldung in persönlicher Inbox liegen',
  PP14: 'Automatische Korrektur von Texten fehlt',
  PP15: 'Keine mobile Version',
  PP16: 'Kein Dashboard zur Verrechnung (Ziel 75 %)',
  PP17: 'Keine Auto-Aktualisierung, Benachrichtigungen erst nach Reload',
  PP18: 'Kein Tagging weiterer Personen im Team',
}

export const agentById = (id?: string | null) => AGENTS.find((a) => a.id === id)
export const contactById = (id?: string | null) => CONTACTS.find((c) => c.id === id)
export const typeLabel = (t: RequestType) => REQUEST_TYPES.find((r) => r.id === t)?.short ?? t
