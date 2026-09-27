import type {
  AgentStatus,
  Email,
  LegacyMail,
  LegacyTicket,
  Notification,
  Rec,
  Ticket,
  TicketEvent,
  TimeEntry,
  Actor,
} from './types'
import { AGENTS, CONTACTS, SEED_CUSTOMERS, HOTLINE } from './constants'

const MIN = 60_000
const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * MIN).toISOString()
const H = 60
const D = 24 * 60

let n = 0
const sid = (p: string) => `${p}-seed-${++n}`

const cust = (contactId: string): Actor => {
  const c = CONTACTS.find((x) => x.id === contactId)!
  return { type: 'customer', id: c.id, name: c.name }
}
const ag = (id: string): Actor => {
  const a = AGENTS.find((x) => x.id === id)!
  return { type: 'agent', id: a.id, name: a.name }
}
const sys: Actor = { type: 'system', name: 'System' }

interface SeedTicket extends Omit<Ticket, 'id' | 'key' | 'attachments' | 'reopenedCount' | 'updatedAt'> {
  attachments?: Ticket['attachments']
  reopenedCount?: number
  events?: Omit<TicketEvent, 'id' | 'ticketId'>[]
  time?: Omit<TimeEntry, 'id' | 'ticketId' | 'rate'>[]
}

function rateOf(customerId: string) {
  return SEED_CUSTOMERS.find((c) => c.id === customerId)!.rate
}

export function buildSeed(): Rec[] {
  n = 0
  const recs: Rec[] = []

  const seedTickets: SeedTicket[] = [
    {
      number: 1042,
      customerId: 'c-buehler',
      contactId: 'p-brunner',
      type: 'incident',
      category: 'Zugang / Login',
      priority: 'hoch',
      subject: 'Login nach Update nicht mehr möglich',
      description:
        'Seit dem Update von heute Morgen können sich unsere Mitarbeitenden nicht mehr am Terminal und im Web-Client anmelden. Fehlermeldung: «Benutzer oder Passwort ungültig».\n\nBetroffen: alle Mitarbeitenden (ca. 180 Personen)\nZeitpunkt: seit ca. 07:30 Uhr\nAnsicht: Login-Maske Web-Client und Terminal Eingang Nord',
      attachments: [{ name: 'screenshot_login_fehler.png', size: 184_220 }],
      status: 'in_arbeit',
      channel: 'portal',
      team: 'first',
      assigneeId: 'rw',
      phoneConfirmed: true,
      createdAt: at(2 * H + 12),
      billing: 'offen',
      events: [
        { at: at(2 * H + 12), kind: 'created', actor: cust('p-brunner'), public: true, via: 'portal', text: 'Ticket über das Kundenportal erfasst.' },
        { at: at(2 * H + 12), kind: 'system', actor: sys, public: true, text: `Hinweis angezeigt: Priorität «Hoch» – bitte zusätzlich telefonisch melden (${HOTLINE}).` },
        { at: at(2 * H + 2), kind: 'note', actor: ag('rw'), public: false, text: 'Kundin hat telefonisch über die Hotline bestätigt. Übernehme das Ticket.' },
        { at: at(2 * H + 1), kind: 'assign', actor: ag('rw'), public: false, text: 'Zugewiesen an R. Weibel' },
      ],
      time: [{ agentId: 'rw', minutes: 25, note: 'Analyse Logfiles Update', at: at(90), billable: true }],
    },
    {
      number: 1041,
      customerId: 'c-meier',
      contactId: 'p-meier',
      type: 'bug',
      category: 'Schnittstelle / Export',
      priority: 'hoch',
      subject: 'Zeiterfassung exportiert falsche Stunden',
      description:
        'Beim Lohnexport für September werden bei Teilzeitmitarbeitenden die Sollstunden doppelt gezählt. Der Lohnlauf ist morgen – bitte dringend prüfen.\n\nBetroffen: 12 Teilzeitmitarbeitende (z. B. Personalnr. 4411)\nZeitpunkt: Export vom 26.09.\nAnsicht: Export → Lohndaten',
      attachments: [{ name: 'export_september.csv', size: 22_410 }],
      status: 'neu',
      channel: 'email',
      team: 'first',
      assigneeId: null,
      createdAt: at(86),
      billing: 'offen',
      events: [
        { at: at(86), kind: 'created', actor: cust('p-meier'), public: true, via: 'email', text: 'E-Mail an support@timetool.ch – automatisch mit Kunde Meier Transport AG verknüpft.' },
      ],
    },
    {
      number: 1040,
      customerId: 'c-roth',
      contactId: 'p-roth',
      type: 'service',
      category: 'Zugang / Login',
      priority: 'mittel',
      subject: 'Neuer Mitarbeitender benötigt Zugang',
      description: 'Per 1. Oktober beginnt Herr Luca Bianchi (Personalnr. 2231) als Bauführer. Bitte Zugang für Web-Client und Mobile App einrichten.',
      status: 'in_arbeit',
      channel: 'portal',
      team: 'first',
      assigneeId: 'sw',
      createdAt: at(D - 3 * H - 20),
      firstResponseAt: at(D - 4 * H),
      billing: 'offen',
      events: [
        { at: at(D - 3 * H - 20), kind: 'created', actor: cust('p-roth'), public: true, via: 'portal', text: 'Ticket über das Kundenportal erfasst.' },
        { at: at(D - 4 * H), kind: 'reply_agent', actor: ag('sw'), public: true, text: 'Guten Tag Frau Roth\n\nVielen Dank, wir richten den Zugang ein und melden uns, sobald er bereit ist.\n\nFreundliche Grüsse\nSebastian Wright' },
      ],
      time: [{ agentId: 'sw', minutes: 15, note: 'Benutzer angelegt', at: at(D - 5 * H), billable: true }],
    },
    {
      number: 1039,
      customerId: 'c-buehler',
      contactId: 'p-brunner',
      type: 'frage',
      category: 'Reporting',
      priority: 'tief',
      subject: 'Frage zur Auswertung Monatsrapport',
      description: 'Im Monatsrapport August erscheinen die Überstunden nicht mehr separat. Wo kann ich die Spalte wieder einblenden?',
      status: 'warten_kunde',
      channel: 'portal',
      team: 'first',
      assigneeId: 'jg',
      createdAt: at(2 * D + 3 * H),
      firstResponseAt: at(2 * D),
      billing: 'offen',
      events: [
        { at: at(2 * D + 3 * H), kind: 'created', actor: cust('p-brunner'), public: true, via: 'portal', text: 'Ticket über das Kundenportal erfasst.' },
        { at: at(2 * D), kind: 'reply_agent', actor: ag('jg'), public: true, text: 'Guten Tag Frau Brunner\n\nKönnen Sie uns bitte einen Screenshot der Rapport-Einstellungen senden (Reporting → Monatsrapport → Layout)? Dann können wir die Spalte gezielt wieder einblenden.\n\nFreundliche Grüsse\nJosé Gómez' },
        { at: at(2 * D), kind: 'status', actor: ag('jg'), public: false, text: 'Status: In Arbeit → Warten auf Kunde' },
      ],
    },
    {
      number: 1038,
      customerId: 'c-roth',
      contactId: 'p-roth',
      type: 'problem',
      category: 'Schnittstelle / Export',
      priority: 'mittel',
      subject: 'Schnittstelle Lohnexport prüfen',
      description: 'Der Lohnexport bricht seit drei Wochen sporadisch ab (ca. jeder dritte Lauf). Ein erneuter Start funktioniert meistens.',
      status: 'second_level',
      channel: 'portal',
      team: 'second',
      assigneeId: 'lh',
      escalationReason: 'Benötigt Entwickler-Analyse: Timeout in der Exportschnittstelle, im First Level nicht reproduzierbar.',
      createdAt: at(D + 5 * H),
      firstResponseAt: at(D + 3 * H),
      billing: 'offen',
      events: [
        { at: at(D + 5 * H), kind: 'created', actor: cust('p-roth'), public: true, via: 'portal', text: 'Ticket über das Kundenportal erfasst.' },
        { at: at(D + 3 * H), kind: 'reply_agent', actor: ag('sw'), public: true, text: 'Guten Tag Frau Roth\n\nWir analysieren die Logfiles der letzten Exportläufe und melden uns.\n\nFreundliche Grüsse\nSebastian Wright' },
        { at: at(D + H), kind: 'escalate', actor: ag('sw'), public: false, text: 'An Second Level eskaliert. Grund: Benötigt Entwickler-Analyse: Timeout in der Exportschnittstelle, im First Level nicht reproduzierbar.' },
        { at: at(D + H), kind: 'note', actor: ag('sw'), public: false, text: '@L. Hebeisen kannst du dir das Timeout im Exportjob ansehen? Logfiles hängen an.', mentions: ['lh'] },
      ],
      time: [
        { agentId: 'sw', minutes: 40, note: 'Analyse Logfiles Export', at: at(D + 2 * H), billable: true },
        { agentId: 'lh', minutes: 30, note: 'Reproduktion Testsystem', at: at(3 * H), billable: true },
      ],
    },
    {
      number: 1037,
      customerId: 'c-meier',
      contactId: 'p-meier',
      type: 'incident',
      category: 'Mobile App',
      priority: 'mittel',
      subject: 'Mobile Ansicht friert ein',
      description: 'Die Mobile App friert beim Stempeln ein, wenn keine Netzverbindung besteht (Chauffeure unterwegs). Buchungen fehlen danach.',
      status: 'neu',
      channel: 'email',
      team: 'first',
      assigneeId: null,
      createdAt: at(D - 58),
      billing: 'offen',
      events: [
        { at: at(D - 58), kind: 'created', actor: cust('p-meier'), public: true, via: 'email', text: 'E-Mail an support@timetool.ch – automatisch mit Kunde Meier Transport AG verknüpft.' },
      ],
    },
    {
      number: 1036,
      customerId: 'c-roth',
      contactId: 'p-roth',
      type: 'change',
      category: 'Lizenz & Vertrag',
      priority: 'tief',
      subject: 'Wunsch: Sammelrechnung pro Quartal',
      description: 'Könnten die Lizenzkosten künftig quartalsweise in einer Sammelrechnung verrechnet werden?',
      status: 'warten_kunde',
      channel: 'portal',
      team: 'first',
      assigneeId: 'sw',
      createdAt: at(4 * D),
      firstResponseAt: at(3 * D),
      billing: 'offen',
      events: [
        { at: at(4 * D), kind: 'created', actor: cust('p-roth'), public: true, via: 'portal', text: 'Ticket über das Kundenportal erfasst.' },
        { at: at(3 * D), kind: 'reply_agent', actor: ag('sw'), public: true, text: 'Guten Tag Frau Roth\n\nGerne klären wir das mit unserer Buchhaltung. Ab welchem Quartal wünschen Sie die Umstellung?\n\nFreundliche Grüsse\nSebastian Wright' },
      ],
    },
    {
      number: 1035,
      customerId: 'c-buehler',
      contactId: 'p-brunner',
      type: 'service',
      category: 'Zugang / Login',
      priority: 'tief',
      subject: 'Passwort-Reset für HR-Kontakt',
      description: 'Unsere neue HR-Mitarbeiterin Frau Anna Kunz benötigt einen Zugang zum Kundenportal (als zweite HR-Ansprechperson).',
      status: 'in_arbeit',
      channel: 'portal',
      team: 'first',
      assigneeId: 'rw',
      createdAt: at(3 * D + 2 * H),
      firstResponseAt: at(3 * D),
      billing: 'offen',
      events: [
        { at: at(3 * D + 2 * H), kind: 'created', actor: cust('p-brunner'), public: true, via: 'portal', text: 'Ticket über das Kundenportal erfasst.' },
        { at: at(3 * D), kind: 'reply_agent', actor: ag('rw'), public: true, text: 'Guten Tag Frau Brunner\n\nWir legen Frau Kunz als zusätzliche HR-Ansprechperson an. Sie erhält eine Einladung per E-Mail.\n\nFreundliche Grüsse\nRémy Weibel' },
      ],
    },
    {
      number: 1034,
      customerId: 'c-sebi',
      contactId: 'p-sutter',
      type: 'bug',
      category: 'Absenzen',
      priority: 'mittel',
      subject: 'Ferienguthaben wird falsch berechnet',
      description: 'Bei Mitarbeitenden mit Eintritt unter dem Jahr wird das Ferienguthaben nicht pro rata berechnet.\n\nBetroffen: Personalnr. 311, 318\nAnsicht: Absenzen → Saldi',
      status: 'in_arbeit',
      channel: 'portal',
      team: 'first',
      assigneeId: 'nr',
      createdAt: at(5 * H),
      firstResponseAt: at(4 * H),
      billing: 'offen',
      events: [
        { at: at(5 * H), kind: 'created', actor: cust('p-sutter'), public: true, via: 'portal', text: 'Ticket über das Kundenportal erfasst.' },
        { at: at(4 * H), kind: 'reply_agent', actor: ag('nr'), public: true, text: 'Guten Tag Herr Sutter\n\nDanke für die Beispiele. Wir prüfen die Pro-rata-Regel im Absenzenmodul.\n\nFreundliche Grüsse\nNicole Riesen' },
      ],
      time: [{ agentId: 'nr', minutes: 35, note: 'Analyse Saldoberechnung', at: at(3 * H), billable: true }],
    },
    {
      number: 1033,
      customerId: 'c-keller',
      contactId: 'p-keller',
      type: 'incident',
      category: 'Zutrittskontrolle',
      priority: 'hoch',
      subject: 'Badge-Leser Eingang Ost offline',
      description: 'Der Badge-Leser am Personaleingang Ost reagiert nicht mehr. Mitarbeitende können nicht stempeln.',
      status: 'geloest',
      channel: 'portal',
      team: 'first',
      assigneeId: 'nr',
      phoneConfirmed: true,
      createdAt: at(6 * H),
      firstResponseAt: at(5 * H + 30),
      resolvedAt: at(3 * H),
      billing: 'verrechenbar',
      events: [
        { at: at(6 * H), kind: 'created', actor: cust('p-keller'), public: true, via: 'portal', text: 'Ticket über das Kundenportal erfasst.' },
        { at: at(5 * H + 30), kind: 'reply_agent', actor: ag('nr'), public: true, text: 'Guten Tag Frau Keller\n\nWir verbinden uns per Fernwartung mit dem Terminal.\n\nFreundliche Grüsse\nNicole Riesen' },
        { at: at(3 * H), kind: 'reply_agent', actor: ag('nr'), public: true, text: 'Lösung: Der Badge-Leser hatte nach einem Stromunterbruch keine Netzwerkadresse mehr. Wir haben die Konfiguration neu geladen – das Terminal ist wieder online und die Buchungen wurden nachsynchronisiert.\n\nBitte bestätigen Sie im Portal, ob das Problem gelöst ist.' },
        { at: at(3 * H), kind: 'status', actor: ag('nr'), public: true, text: 'Status: In Arbeit → Gelöst (wartet auf Bestätigung durch Kundin)' },
      ],
      time: [{ agentId: 'nr', minutes: 45, note: 'Fernwartung Terminal, Konfiguration neu geladen', at: at(3 * H), billable: true }],
    },
    {
      number: 1030,
      customerId: 'c-sebi',
      contactId: 'p-sutter',
      type: 'service',
      category: 'Personaleinsatzplanung (PEP)',
      priority: 'tief',
      subject: 'Anfrage Testinstanz für Anpassungen im Modul PEP',
      description:
        'Wir möchten gerne anfragen, ob uns eine Testinstanz zur Verfügung gestellt werden kann, damit wir Anpassungen im Modul PEP prüfen können, ohne direkt in das Livesystem einzugreifen.',
      status: 'geschlossen',
      channel: 'portal',
      team: 'first',
      assigneeId: 'nr',
      createdAt: at(23 * D),
      firstResponseAt: at(23 * D - 3 * H),
      resolvedAt: at(21 * D),
      closedAt: at(20 * D),
      billing: 'verrechenbar',
      events: [
        { at: at(23 * D), kind: 'created', actor: cust('p-sutter'), public: true, via: 'portal', text: 'Ticket über das Kundenportal erfasst.' },
        { at: at(23 * D - 3 * H), kind: 'reply_agent', actor: ag('nr'), public: true, text: 'Guten Tag Herr Sutter\n\nGerne richten wir eine Testinstanz ein. Diese ist bis Ende Monat verfügbar.\n\nFreundliche Grüsse\nNicole Riesen' },
        { at: at(22 * D), kind: 'reply_customer', actor: cust('p-sutter'), public: true, via: 'portal', text: 'Vielen Dank! Wie melden wir uns auf der Testinstanz an?' },
        { at: at(21 * D), kind: 'reply_agent', actor: ag('nr'), public: true, text: 'Lösung: Die Testinstanz ist unter test.sebi-sport.timetool.example erreichbar. Die Zugangsdaten entsprechen dem Livesystem.' },
        { at: at(21 * D), kind: 'status', actor: ag('nr'), public: true, text: 'Status: In Arbeit → Gelöst (wartet auf Bestätigung durch Kunde)' },
        { at: at(20 * D), kind: 'feedback', actor: cust('p-sutter'), public: true, text: 'Kunde ist mit der Lösung einverstanden – Ticket geschlossen.' },
      ],
      time: [
        { agentId: 'nr', minutes: 60, note: 'Testinstanz eingerichtet', at: at(22 * D), billable: true },
        { agentId: 'nr', minutes: 30, note: 'Instruktion Kunde', at: at(21 * D), billable: true },
      ],
    },
    {
      number: 1031,
      customerId: 'c-meier',
      contactId: 'p-meier',
      type: 'frage',
      category: 'Personaleinsatzplanung (PEP)',
      priority: 'tief',
      subject: 'Schichtplan-Vorlage kopieren',
      description: 'Wie kann ich eine bestehende Schichtplan-Vorlage für eine neue Abteilung kopieren?',
      status: 'geschlossen',
      channel: 'portal',
      team: 'first',
      assigneeId: 'sw',
      createdAt: at(12 * D),
      firstResponseAt: at(12 * D - 2 * H),
      resolvedAt: at(12 * D - 2 * H),
      closedAt: at(11 * D),
      billing: 'nicht_verrechenbar',
      events: [
        { at: at(12 * D), kind: 'created', actor: cust('p-meier'), public: true, via: 'portal', text: 'Ticket über das Kundenportal erfasst.' },
        { at: at(12 * D - 2 * H), kind: 'reply_agent', actor: ag('sw'), public: true, text: 'Lösung: PEP → Vorlagen → Rechtsklick «Duplizieren». Anleitung siehe Knowledge Base Artikel KB-112.' },
        { at: at(11 * D), kind: 'feedback', actor: cust('p-meier'), public: true, text: 'Kunde ist mit der Lösung einverstanden – Ticket geschlossen.' },
      ],
      time: [{ agentId: 'sw', minutes: 15, note: 'Kurze Instruktion (Kulanz)', at: at(12 * D - 2 * H), billable: false }],
    },
    {
      number: 1029,
      customerId: 'c-keller',
      contactId: 'p-keller',
      type: 'frage',
      category: 'Zeiterfassung',
      priority: 'tief',
      subject: 'Monatsabschluss Zeitkonten',
      description: 'Wie schliessen wir die Zeitkonten per Monatsende ab, damit keine Nachbuchungen mehr möglich sind?',
      status: 'geschlossen',
      channel: 'portal',
      team: 'first',
      assigneeId: 'rw',
      createdAt: at(9 * D),
      firstResponseAt: at(9 * D - H),
      resolvedAt: at(8 * D),
      closedAt: at(8 * D - 2 * H),
      billing: 'verrechenbar',
      events: [
        { at: at(9 * D), kind: 'created', actor: cust('p-keller'), public: true, via: 'portal', text: 'Ticket über das Kundenportal erfasst.' },
        { at: at(8 * D), kind: 'reply_agent', actor: ag('rw'), public: true, text: 'Lösung: Zeitwirtschaft → Periodenabschluss → Monat wählen → «Abschliessen». Nachbuchungen sind danach nur noch mit Admin-Recht möglich.' },
        { at: at(8 * D - 2 * H), kind: 'feedback', actor: cust('p-keller'), public: true, text: 'Kundin ist mit der Lösung einverstanden – Ticket geschlossen.' },
      ],
      time: [{ agentId: 'rw', minutes: 60, note: 'Schulung Periodenabschluss per Teams', at: at(8 * D), billable: true }],
    },
    {
      number: 1021,
      customerId: 'c-buehler',
      contactId: 'p-brunner',
      type: 'service',
      category: 'Lizenz & Vertrag',
      priority: 'tief',
      subject: 'Neue Nutzerlizenz bestellen',
      description: 'Wir benötigen 10 zusätzliche Lizenzen für die Mobile App.',
      status: 'geschlossen',
      channel: 'portal',
      team: 'first',
      assigneeId: 'jg',
      createdAt: at(18 * D),
      firstResponseAt: at(18 * D - 2 * H),
      resolvedAt: at(16 * D),
      closedAt: at(15 * D),
      billing: 'verrechenbar',
      events: [
        { at: at(18 * D), kind: 'created', actor: cust('p-brunner'), public: true, via: 'portal', text: 'Ticket über das Kundenportal erfasst.' },
        { at: at(16 * D), kind: 'reply_agent', actor: ag('jg'), public: true, text: 'Lösung: Die 10 Lizenzen sind freigeschaltet und in Ihrer Lizenzübersicht sichtbar.' },
        { at: at(15 * D), kind: 'feedback', actor: cust('p-brunner'), public: true, text: 'Kundin ist mit der Lösung einverstanden – Ticket geschlossen.' },
      ],
      time: [{ agentId: 'jg', minutes: 30, note: 'Lizenzen freigeschaltet', at: at(16 * D), billable: true }],
    },
    {
      number: 1018,
      customerId: 'c-buehler',
      contactId: 'p-brunner',
      type: 'change',
      category: 'Schnittstelle / Export',
      priority: 'tief',
      subject: 'Exportformat Lohndaten anpassen',
      description: 'Das Lohnsystem erwartet neu das Datumsformat JJJJ-MM-TT.',
      status: 'geschlossen',
      channel: 'portal',
      team: 'first',
      assigneeId: 'rw',
      createdAt: at(34 * D),
      firstResponseAt: at(34 * D - 3 * H),
      resolvedAt: at(30 * D),
      closedAt: at(29 * D),
      billing: 'uebermittelt',
      events: [
        { at: at(34 * D), kind: 'created', actor: cust('p-brunner'), public: true, via: 'portal', text: 'Ticket über das Kundenportal erfasst.' },
        { at: at(30 * D), kind: 'reply_agent', actor: ag('rw'), public: true, text: 'Lösung: Das Exportprofil «Lohn» verwendet neu das Format JJJJ-MM-TT.' },
        { at: at(29 * D), kind: 'feedback', actor: cust('p-brunner'), public: true, text: 'Kundin ist mit der Lösung einverstanden – Ticket geschlossen.' },
      ],
      time: [{ agentId: 'rw', minutes: 120, note: 'Exportprofil angepasst und getestet', at: at(30 * D), billable: true }],
    },
  ]

  for (const s of seedTickets) {
    const { events = [], time = [], ...rest } = s
    const id = `TS-${s.number}`
    const lastAt = [s.createdAt, ...events.map((e) => e.at)].sort().at(-1)!
    const t: Ticket = {
      ...rest,
      id,
      key: id,
      attachments: s.attachments ?? [],
      reopenedCount: s.reopenedCount ?? 0,
      updatedAt: lastAt,
    }
    recs.push({ id, kind: 'ticket', data: t })
    for (const e of events) {
      const eid = sid('ev')
      recs.push({ id: eid, kind: 'event', data: { ...e, id: eid, ticketId: id } satisfies TicketEvent })
    }
    for (const te of time) {
      const tid = sid('time')
      recs.push({ id: tid, kind: 'time', data: { ...te, id: tid, ticketId: id, rate: rateOf(s.customerId) } satisfies TimeEntry })
    }
  }

  // Simulierte E-Mails an HR-Kontakte (Eingangsbestätigungen etc.)
  const emails: Omit<Email, 'id'>[] = [
    {
      toContactId: 'p-brunner',
      subject: '[TS-1042] Eingangsbestätigung: Login nach Update nicht mehr möglich',
      body: 'Guten Tag Monika Brunner\n\nIhre Anfrage ist eingegangen und hat die Ticketnummer TS-1042.\nPriorität: Hoch – garantierte Reaktionszeit: 2 Stunden.\n\nBitte melden Sie Störungen mit Priorität «Hoch» zusätzlich telefonisch: ' + HOTLINE + '\n\nStatus und Verlauf: Kundenportal → Meine Anfragen → TS-1042',
      at: at(2 * H + 12),
      ticketKey: 'TS-1042',
    },
    {
      toContactId: 'p-brunner',
      subject: '[TS-1039] Neue Antwort vom TimeTool Support',
      body: 'Guten Tag Monika Brunner\n\nZu Ihrer Anfrage TS-1039 gibt es eine neue Antwort. Bitte antworten Sie direkt im Kundenportal – so bleibt der gesamte Verlauf im Ticket.\n\n→ Ticket TS-1039 im Portal öffnen',
      at: at(2 * D),
      ticketKey: 'TS-1039',
    },
  ]
  for (const e of emails) {
    const id = sid('mail')
    recs.push({ id, kind: 'email', data: { ...e, id } satisfies Email })
  }

  const notes: Omit<Notification, 'id'>[] = [
    { target: 'team:first', text: 'Neues Ticket TS-1041 (Hoch) · Meier Transport AG · via E-Mail', ticketKey: 'TS-1041', at: at(86), readBy: [] },
    { target: 'lh', text: 'S. Wright hat dich in TS-1038 erwähnt', ticketKey: 'TS-1038', at: at(D + H), readBy: [] },
  ]
  for (const x of notes) {
    const id = sid('notif')
    recs.push({ id, kind: 'notification', data: { ...x, id } satisfies Notification })
  }

  for (const c of SEED_CUSTOMERS) recs.push({ id: c.id, kind: 'customer', data: { ...c } })

  const statuses: AgentStatus[] = AGENTS.map((a) =>
    a.id === 'jg' ? { id: a.id, absent: true, absentNote: 'Ferien bis 09.10.' } : { id: a.id, absent: false },
  )
  for (const s of statuses) recs.push({ id: 'status-' + s.id, kind: 'agentstatus', data: s })

  for (const l of buildLegacySeed()) recs.push({ id: 'legacy-' + l.id, kind: 'legacy', data: l })

  recs.push({ id: 'meta', kind: 'meta', data: { seededAt: new Date().toISOString(), version: 1 } })
  return recs
}

// ---------------------------------------------------------------------------
// Altsystem «WISE Enterprise Portal» – Ist-Zustand
// ---------------------------------------------------------------------------

function buildLegacySeed(): LegacyTicket[] {
  const lid = (p: string) => sid('l' + p)
  const mk = (partial: Partial<LegacyTicket> & Pick<LegacyTicket, 'id' | 'title' | 'status' | 'company' | 'customerNr' | 'contact' | 'createdAt'>): LegacyTicket => ({
    priority: 'Normal',
    srType: 'Software',
    srSubtype: 'Support (general)',
    updatedAt: partial.createdAt,
    phone: '+41 33 555 00 00',
    email: 'hr@example.ch',
    assignedTo: 'N/A',
    externalId: Math.random().toString(36).slice(2, 10).toUpperCase(),
    billed: 0,
    fixBetrag: 0,
    formText: '',
    attachments: [],
    mails: [],
    spentTime: [],
    comments: [],
    history: [],
    notificationUnread: false,
    ...partial,
  })

  const sebiForm = [
    `Online-Formular erhalten am ${new Date(Date.now() - 23 * D * MIN).toLocaleString('de-CH')} von der IP-Adresse: 10.10.20.1`,
    'Firmenname:',
    'Sebi-Sport AG',
    'Anliegen/Betreff:',
    'Guten Tag',
    'Wir möchten gerne anfragen, ob uns eine Testinstanz zur Verfügung gestellt werden kann, damit wir Anpassungen im System prüfen und testen können, ohne direkt in das Livesystem einzugreifen.',
    'Konkret geht es um die Nutzung des Moduls PEP. Dieses Modul wurde bei uns in der Vergangenheit nicht aktiv genutzt. Aufgrund personeller Veränderungen sind zudem viele Informationen und das frühere Wissen zur Einrichtung und Nutzung dieses Moduls verloren gegangen.',
    'Wir möchten deshalb gerne in einer Testumgebung prüfen, wie das Modul aufgebaut ist, welche Einstellungen für uns relevant sind und welche Anpassungen sinnvoll wären, bevor wir Änderungen im produktiven System vornehmen.',
    'Könnten Sie uns bitte mitteilen, ob eine solche Testinstanz möglich ist und wie das weitere Vorgehen wäre?',
    'Besten Dank für Ihre Rückmeldung.',
    'Erreichbarkeit:',
    'Mo, Di, Do, Fr: 08:00 - 17:00',
    'Lösung:',
    'N/A',
  ].join('\n')

  const S = 'hr@sebi-sport.example'
  const T = 'support@timetool.ch'
  // Absichtlich NICHT chronologisch sortiert (PP11) – so wie das Altsystem sie anzeigt.
  const sebiMails: LegacyMail[] = [
    { id: lid('m'), direction: 'out', from: T, to: S, subject: 'RE: Anfrage Testinstanz [#24482]', body: 'Guten Tag Herr Sutter\n\nDie Testinstanz ist nun eingerichtet. Zugang wie Livesystem.\n\nFreundliche Grüsse\nNicole Riesen', at: at(21 * D) },
    { id: lid('m'), direction: 'in', from: S, to: T, subject: 'AW: RE: Anfrage Testinstanz [#24482]', body: 'Guten Tag Frau Riesen\n\nDanke vielmals! Noch eine Frage: Können wir auf der Testinstanz auch einen zweiten Benutzer für unsere Personalplanerin erhalten? Sie soll die PEP-Vorlagen vorbereiten.\n\nFreundliche Grüsse\nSebi Sutter', at: at(2 * D) },
    { id: lid('m'), direction: 'out', from: T, to: S, subject: 'Ticket #24482 erfasst', body: 'Ihre Anfrage wurde erfasst.', at: at(23 * D - 2 * H) },
    { id: lid('m'), direction: 'in', from: S, to: T, subject: 'AW: Anfrage Testinstanz [#24482]', body: 'Wie melden wir uns an? Sebi Sutter', at: at(22 * D) },
    { id: lid('m'), direction: 'out', from: T, to: S, subject: 'RE: AW: Anfrage Testinstanz [#24482]', body: 'Guten Tag Herr Sutter\n\n> Wie melden wir uns an?\n\nMit den Zugangsdaten des Livesystems.\n\nFreundliche Grüsse\nNicole Riesen', at: at(21 * D - 3 * H) },
    { id: lid('m'), direction: 'in', from: S, to: T, subject: 'Testinstanz PEP', body: 'Hallo, ist die Testinstanz schon bereit? Gruss S. Sutter', at: at(22 * D - 5 * H) },
    { id: lid('m'), direction: 'out', from: T, to: S, subject: 'RE: Testinstanz PEP', body: 'Wir sind dran. Gruss N. Riesen', at: at(22 * D - 4 * H) },
  ]

  const sebi = mk({
    id: '24482',
    title: 'Anfrage Testinstanz für Anpassungen im Modul PEP',
    status: 'Closed, unbilled',
    company: 'Sebi-Sport AG',
    customerNr: '0815',
    contact: 'Sebi Sutter',
    phone: '+41 33 555 08 15',
    email: S,
    assignedTo: 'Nicole Riesen',
    externalId: 'QW9ZP3GW',
    createdAt: at(23 * D),
    updatedAt: at(2 * D),
    closedAt: at(20 * D),
    formText: sebiForm,
    attachments: ['PEP_Einstellungen.png', 'Mitarbeiterliste.xlsx', 'Screenshot_1.png', 'Screenshot_2.png', 'Vorlage_Schichtplan.pdf'],
    mails: sebiMails,
    spentTime: [{ id: lid('t'), date: at(21 * D), user: 'Nicole Riesen', hours: 1.5, rate: 180, text: 'Testinstanz eingerichtet, Instruktion' }],
    comments: [{ id: lid('c'), at: at(22 * D), user: 'Nicole Riesen', text: 'Testinstanz über Ops beantragt.' }],
    history: [
      { id: lid('h'), at: at(23 * D), user: 'System', text: 'Ticket aus Online-Formular erstellt' },
      { id: lid('h'), at: at(23 * D - 2 * H), user: 'Triage', text: 'Zugewiesen an Nicole Riesen (11:30-Meeting)' },
      { id: lid('h'), at: at(21 * D), user: 'Nicole Riesen', text: 'Spent Time erfasst: 1.5 h à CHF 180.00' },
      { id: lid('h'), at: at(20 * D), user: 'Nicole Riesen', text: 'Status geändert: In Progress → Closed, unbilled' },
      { id: lid('h'), at: at(2 * D), user: 'System', text: 'Neue E-Mail vom Kunden auf geschlossenes Ticket empfangen' },
    ],
    notificationUnread: true,
    notificationText: 'Neue Nachricht zu geschlossenem Ticket #24482 (Sebi-Sport AG)',
  })

  const others: LegacyTicket[] = [
    mk({ id: '24495', title: 'Login nach Update nicht mehr möglich', status: 'Open', priority: 'Normal', company: 'Bühler AG', customerNr: '1042', contact: 'Monika Brunner', createdAt: at(2 * H + 12), assignedTo: 'N/A', formText: 'Online-Formular erhalten\nFirmenname:\nBühler AG\nAnliegen/Betreff:\nLogin geht nicht mehr seit Update!!! Bitte dringend melden.' }),
    mk({ id: '24493', title: 'Zeiterfassung exportiert falsche Stunden', status: 'Open', company: 'Meier Transport AG', customerNr: '1187', contact: 'Daniel Meier', createdAt: at(86), srType: 'E-Mail', formText: 'E-Mail empfangen von d.meier@meier-transport.example\n\nexport falsch, bitte anschauen' }),
    mk({ id: '24490', title: 'Neuer Mitarbeiter braucht Zugang', status: 'In Progress', company: 'Roth Bau GmbH', customerNr: '1203', contact: 'Sandra Roth', createdAt: at(D - 3 * H), assignedTo: 'Sebastian Wright' }),
    mk({ id: '24488', title: 'Frage Monatsrapport', status: 'On Hold', company: 'Bühler AG', customerNr: '1042', contact: 'Monika Brunner', createdAt: at(2 * D + 3 * H), assignedTo: 'José Gómez' }),
    mk({ id: '24485', title: 'Schnittstelle Lohnexport', status: 'In Progress', company: 'Roth Bau GmbH', customerNr: '1203', contact: 'Sandra Roth', createdAt: at(D + 5 * H), assignedTo: 'Livia Hebeisen' }),
    mk({ id: '24479', title: 'Mobile Ansicht friert ein', status: 'Open', company: 'Meier Transport AG', customerNr: '1187', contact: 'Daniel Meier', createdAt: at(D - 58) }),
    mk({ id: '24470', title: 'Badge-Leser offline', status: 'Closed, billed', company: 'Keller Gastro AG', customerNr: '1311', contact: 'Laura Keller', createdAt: at(6 * D), assignedTo: 'Nicole Riesen', closedAt: at(5 * D) }),
    mk({ id: '24466', title: 'Monatsabschluss Zeitkonten', status: 'Closed, unbilled', company: 'Keller Gastro AG', customerNr: '1311', contact: 'Laura Keller', createdAt: at(9 * D), assignedTo: 'Rémy Weibel', closedAt: at(8 * D) }),
  ]
  return [sebi, ...others]
}
