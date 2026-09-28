import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Columns2, X, Check } from 'lucide-react'
import { PAIN_POINTS } from '../lib/constants'

const NAVY = '#1C3A52'
const GOLD = '#E0C449'

interface Scenario {
  title: string
  pps: string[]
  ist: { text: string; to: string; label: string }
  soll: { text: string; to: string; label: string }
}

export const SCENARIOS: Scenario[] = [
  {
    title: 'Wer darf ein Ticket erfassen?',
    pps: ['PP01'],
    ist: { text: 'Öffentliches Kontaktformular – auch Mitarbeitende der Kundenfirmen oder Ehemalige können Anfragen stellen.', to: '/ist/formular', label: 'Kontaktformular' },
    soll: { text: 'Login nur für aktive HR-Ansprechpersonen, verknüpft mit der Kundennummer. «Peter Muster» (kein HR) wird abgewiesen.', to: '/portal', label: 'Portal-Login' },
  },
  {
    title: 'Anfrage strukturiert erfassen',
    pps: ['PP02', 'PP03', 'PP08'],
    ist: { text: 'Kurzbeschreibung und Freitext – die sechs Regeln auf der Support-Seite werden oft ignoriert. Bei einem Übermittlungsfehler sind alle Daten weg.', to: '/ist/formular', label: 'Formular Schritt 2' },
    soll: { text: 'Anfragetyp, Kategorie und Priorität per Auswahl, Pflichtangaben (betroffene Person, Zeitpunkt, Ansicht). Entwurf wird laufend gespeichert.', to: '/portal', label: 'Neue Anfrage' },
  },
  {
    title: 'Dringlichkeit und SLA',
    pps: ['PP09', 'PP10'],
    ist: { text: 'Alle Tickets «Normal». Kein Hinweis, dass «Hoch» zusätzlich telefonisch gemeldet werden muss. SLA-Einhaltung nicht belegbar.', to: '/ist/wise/shift-manager', label: 'Shift Manager' },
    soll: { text: 'Priorität gemäss SLA (2 h / 1 Arbeitstag / Best Effort), SLA-Uhr pro Ticket, Telefon-Hinweis im Formular, Queue «SLA-Frist bald».', to: '/desk/queue/sla', label: 'Queue SLA-Frist' },
  },
  {
    title: 'Bestätigung und Transparenz für den Kunden',
    pps: ['PP04', 'PP05'],
    ist: { text: '«Vielen Dank» – keine Ticketnummer, keine Eingangsbestätigung, keine Übersicht über offene Anfragen.', to: '/ist/formular', label: 'Danke-Seite' },
    soll: { text: 'Eingangsbestätigung per E-Mail mit Ticketnummer und Link, «Meine Anfragen» mit Status, Zuständigkeit und SLA.', to: '/portal/anfragen', label: 'Meine Anfragen' },
  },
  {
    title: 'Kommunikation und Verlauf',
    pps: ['PP06', 'PP11', 'PP14'],
    ist: { text: 'E-Mails werden einzeln versendet, der Verlauf ist nicht chronologisch. Der Kundentext muss von Hand in die Antwort kopiert werden.', to: '/ist/wise/ticket/24482', label: 'WISE #24482 · Mail' },
    soll: { text: 'Antworten im Ticket, chronologischer Verlauf für Kunde und Support, E-Mail nur als Benachrichtigung mit Link zurück ins Portal.', to: '/desk/ticket/TS-1030', label: 'TS-1030 Verlauf' },
  },
  {
    title: 'Rückmeldung auf ein geschlossenes Ticket',
    pps: ['PP12', 'PP13'],
    ist: { text: 'Nur ein einmaliger roter Hinweis unter «New Notifications». Ist die Person abwesend, bleibt die Nachricht in ihrer persönlichen Inbox liegen.', to: '/ist/wise', label: 'WISE Home' },
    soll: { text: 'Das Ticket wird wiedereröffnet. Ist die zuständige Person abwesend (J. Gómez, Ferien), landet es in der Team-Queue. Benachrichtigungen lassen sich als ungelesen markieren.', to: '/split?l=%2Fportal%2Fticket%2FTS-1021%3Fas%3Dp-brunner&r=%2Fdesk%2Fqueue%2Frueckmeldung', label: 'Portal ↔ Queue' },
  },
  {
    title: 'Ticket abschliessen (Use Case 03)',
    pps: ['PP12'],
    ist: { text: 'Ticket per Status «Closed» abschliessen – der Kunde wird nicht gefragt, ob das Problem gelöst ist.', to: '/ist/wise/ticket/24482', label: 'WISE #24482' },
    soll: { text: '«Ticket lösen»: Lösung an den Kunden, Zeitaufwand erfasst, Kunde bestätigt im Portal – sonst automatische Wiedereröffnung. Verrechnung ist out of scope.', to: '/portal/ticket/TS-1033?as=p-keller', label: 'TS-1033 bestätigen' },
  },
  {
    title: 'Performance und Zusammenarbeit',
    pps: ['PP07', 'PP15', 'PP17', 'PP18'],
    ist: { text: 'Shift Manager lädt 39 Sekunden, 2–10 s pro Klick, keine mobile Version, keine Auto-Aktualisierung, kein Markieren von Kolleg:innen – Koordination im 11:30-Meeting.', to: '/ist/wise/shift-manager', label: 'Shift Manager (39 s)' },
    soll: { text: 'Queue in Millisekunden, live aktualisiert, responsive. Eskalation an Second Level mit Grund, @-Markierung in internen Notizen.', to: '/desk/queue/alle', label: 'Agenten-Queue' },
  },
]

export default function Compare() {
  return (
    <div className="min-h-full bg-[#F7F9FA] font-sans text-[#1A1A1A]">
      <header style={{ background: NAVY }} className="text-white">
        <div className="mx-auto max-w-[1240px] px-5 py-7 sm:px-8">
          <Link to="/" className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-white/75 hover:text-white">
            <ArrowLeft size={14} /> Demo-Auswahl
          </Link>
          <h1 className="text-[28px] font-semibold sm:text-[34px]">Ist vs. Soll – Szenario für Szenario</h1>
          <div className="mt-2 h-1 w-20 rounded" style={{ background: GOLD }} />
          <p className="mt-3 max-w-[760px] text-[14.5px] text-white/85">Jede Zeile zeigt denselben Arbeitsschritt im heutigen System und im Zielprozess. «Nebeneinander» öffnet beide Mockups im Split-Screen.</p>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] space-y-4 px-5 py-8 sm:px-8">
        <div className="hidden grid-cols-[220px_1fr_1fr] gap-4 px-1 text-[12px] font-bold tracking-wider text-[#5A6570] uppercase lg:grid">
          <span>Szenario</span>
          <span className="text-[#C0392B]">Ist-Zustand · heute</span>
          <span className="text-[#1E8E5A]">Soll-Prozess · Prototyp</span>
        </div>
        {SCENARIOS.map((s, i) => (
          <div key={s.title} className="grid gap-4 rounded-xl border border-[#DDE3E7] bg-white p-4 shadow-sm lg:grid-cols-[220px_1fr_1fr]">
            <div>
              <div className="text-[12px] font-bold text-[#5A6570]">{String(i + 1).padStart(2, '0')}</div>
              <h2 className="text-[16px] leading-snug font-semibold" style={{ color: NAVY }}>
                {s.title}
              </h2>
              <div className="mt-2 flex flex-wrap gap-1">
                {s.pps.map((p) => (
                  <span key={p} title={PAIN_POINTS[p]} className="rounded-full bg-[#EEF1F3] px-2 py-0.5 text-[11px] font-semibold text-[#5A6570]">
                    {p}
                  </span>
                ))}
              </div>
              {!s.soll.to.startsWith('/split') && (
                <Link to={`/split?l=${encodeURIComponent(s.ist.to)}&r=${encodeURIComponent(s.soll.to)}`} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#DDE3E7] px-3 py-1.5 text-[12.5px] font-semibold hover:bg-slate-50" style={{ color: NAVY }}>
                  <Columns2 size={14} /> Nebeneinander
                </Link>
              )}
            </div>
            <Side tone="ist" {...s.ist} />
            <Side tone="soll" {...s.soll} />
          </div>
        ))}
      </main>
    </div>
  )
}

function Side({ tone, text, to, label }: { tone: 'ist' | 'soll'; text: string; to: string; label: string }) {
  const ist = tone === 'ist'
  return (
    <div className={`flex flex-col rounded-lg border-l-4 p-3.5 ${ist ? 'border-[#C0392B] bg-[#FDF3F2]' : 'border-[#1E8E5A] bg-[#EFF8F3]'}`}>
      <div className="flex flex-1 gap-2 text-[14px] leading-relaxed">
        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white ${ist ? 'bg-[#C0392B]' : 'bg-[#1E8E5A]'}`}>{ist ? <X size={12} /> : <Check size={12} />}</span>
        <span>{text}</span>
      </div>
      <Link to={to} className={`mt-3 inline-flex items-center gap-1.5 self-start rounded-md px-3 py-1.5 text-[13px] font-semibold text-white ${ist ? 'bg-[#C0392B]' : 'bg-[#1E8E5A]'}`}>
        {ist ? 'Im Ist-System zeigen' : 'Im Soll-System zeigen'}: {label} <ArrowRight size={14} />
      </Link>
    </div>
  )
}
