import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown, Database, GitCompareArrows, Globe, Headset, Lightbulb, MonitorSmartphone, RotateCcw, Columns2, FileWarning, LayoutDashboard, BarChart3 } from 'lucide-react'
import { store } from '../lib/store'
import { PAIN_POINTS } from '../lib/constants'
import { toast, useAnnotations } from '../components/ui'

const NAVY = '#1C3A52'
const GOLD = '#E0C449'

interface DemoCard {
  to: string
  title: string
  kicker: string
  who: string
  icon: ReactNode
  desc: string
  pps: string[]
  steps: string[]
  extra?: { to: string; label: string }[]
}

const IST: DemoCard[] = [
  {
    to: '/ist/formular',
    title: 'Kunde meldet ein Problem',
    kicker: 'Öffentliches Kontaktformular',
    who: 'Folie 2 · Sebi',
    icon: <Globe size={20} />,
    desc: 'Rollenspiel aus Kundensicht: 3-Schritte-Formular ohne Login, Freitext ohne Kategorie, keine Priorität, keine Ticketnummer – und danach keine Übersicht.',
    pps: ['PP01', 'PP02', 'PP03', 'PP04', 'PP08', 'PP10'],
    steps: [
      'Support-Seite: Regeln lesen, «Ticket erstellen»',
      'Schritt 1: Kundennummer und Firma eingeben (jede Person kann das)',
      'Schritt 2: Kurzbeschreibung und Freitext, Screenshot anhängen',
      'Schritt 3: Name, Telefon, E-Mail – absenden',
      'Danach: «Vielen Dank» – ohne Ticketnummer, ohne Bestätigung',
      'Optional: Übermittlungsfehler simulieren (Daten weg, PP03)',
    ],
  },
  {
    to: '/ist/wise/ticket/24482',
    title: 'Ticket bearbeiten im heutigen System',
    kicker: 'WISE Enterprise Portal',
    who: 'Folie 4 · Nicole · Livia',
    icon: <FileWarning size={20} />,
    desc: 'Einarbeitung einer neuen Support-Mitarbeiterin am Ticket #24482 von Sebi-Sport: E-Mail-Verlauf zusammensuchen, Re-Open, Antwort per E-Mail, Stundensatz CHF 180 manuell, Status für die Buchhaltung.',
    pps: ['PP07', 'PP11', 'PP12', 'PP13', 'PP16', 'PP18'],
    steps: [
      'Home: roter Hinweis «New Notifications» – einmal geöffnet, für immer weg',
      'Ticket #24482: Status «Closed, unbilled» – Tab MAIL: Verlauf nicht chronologisch',
      '«Re-Open» klicken, Description zeigt die Original-Formularanfrage',
      'New Mail: Kundentext von Hand hineinkopieren',
      'Spent Time: Stundensatz 200 → 180 manuell überschreiben',
      'Close Ticket: Status «Closed, unbilled» für die Buchhaltung setzen',
      'Shift Manager öffnen: 39 Sekunden Ladezeit',
    ],
    extra: [
      { to: '/ist/wise', label: 'Startseite' },
      { to: '/ist/wise/shift-manager', label: 'Shift Manager (39 s)' },
    ],
  },
]

const SOLL: DemoCard[] = [
  {
    to: '/portal',
    title: 'Kundenportal – Anfrage erfassen',
    kicker: 'Soll-Prozess · Kundensicht',
    who: 'Folie 10 / 14 · Rémy',
    icon: <MonitorSmartphone size={20} />,
    desc: 'Login nur für HR-Ansprechpersonen, Anfragetyp/Kategorie/Priorität per Auswahl, Pflichtangaben, Telefon-Hinweis bei «Hoch», Eingangsbestätigung mit Ticketnummer, Status und chronologischer Verlauf, Lösung bestätigen oder wiedereröffnen.',
    pps: ['PP01', 'PP02', 'PP03', 'PP04', 'PP05', 'PP08', 'PP10', 'PP11', 'PP12', 'PP15'],
    steps: [
      'Login: Peter Muster (kein HR) wird abgewiesen → Monika Brunner (Bühler AG) anmelden',
      'Anfrage: Incident · Zeiterfassung · Hoch → Telefon-Hinweis erscheint',
      'Pflichtangaben ausfüllen, Entwurf wird automatisch gespeichert',
      'Absenden → Ticketnummer + Eingangsbestätigung (E-Mail ansehen)',
      'Meine Anfragen → Status und Verlauf; auf gelöstes Ticket antworten',
      'Als Laura Keller: TS-1033 «Lösung bestätigen» (Use Case 03)',
    ],
  },
  {
    to: '/desk',
    title: 'Agenten-Queue – Triage & Bearbeitung',
    kicker: 'Soll-Prozess · Support-Sicht',
    who: 'Folie 10 / 15 · Rémy',
    icon: <Headset size={20} />,
    desc: 'Eine Queue für Portal, E-Mail und Telefon, SLA-Uhr pro Ticket, Zuweisung an Person oder Team, Eskalation mit Grund, @-Markierung, Zeiterfassung mit Kundentarif, Ticket lösen mit Kundenbestätigung, Reports und Leistungsdaten.',
    pps: ['PP06', 'PP07', 'PP09', 'PP11', 'PP12', 'PP13', 'PP14', 'PP16', 'PP17', 'PP18'],
    steps: [
      'Queue «Alle offenen Tickets»: sortiert nach Priorität, SLA-Uhr läuft',
      'Neues Ticket (aus dem Portal) «Mir zuweisen» → antworten → SLA erfüllt',
      'TS-1041 an Second Level eskalieren (Grund) · @L. Hebeisen markieren',
      'TS-1034 Sebi-Sport: Zeit erfassen → Tarif CHF 180 automatisch',
      '«Ticket lösen» → Lösung, Zeitaufwand, Status für Buchhaltung',
      'Reports → Leistungsdaten an Buchhaltung übermitteln',
    ],
    extra: [
      { to: '/desk/queue/second', label: 'Second Level' },
      { to: '/desk/reports', label: 'Reports' },
      { to: '/desk/kunden', label: 'Tarife & Team' },
    ],
  },
]

export default function Hub() {
  const [on, setOn] = useAnnotations()
  const [confirmReset, setConfirmReset] = useState(false)
  const mode = store.backend.mode

  return (
    <div className="min-h-full bg-[#F7F9FA] font-sans text-[#1A1A1A]">
      <header style={{ background: NAVY }} className="text-white">
        <div className="mx-auto max-w-[1240px] px-5 pt-10 pb-12 sm:px-8">
          <div className="text-[12.5px] tracking-wide text-white/70">TimeTool AG · Ticketing-System · CAS RE FS26 · La Ultima Cerveza</div>
          <h1 className="mt-3 max-w-[900px] text-[30px] leading-[1.15] font-semibold sm:text-[42px]">Neues Ticketing-System für den Kundensupport</h1>
          <div className="mt-2 h-1 w-24 rounded" style={{ background: GOLD }} />
          <p className="mt-4 max-w-[760px] text-[15.5px] text-white/85">
            Demo-Plattform zur Abschlusspräsentation vom 29. September 2026. Wählen Sie ein Mockup – links der heutige Ist-Zustand, rechts der Soll-Prozess als Klick-Prototyp mit fiktiven Daten.
          </p>
          <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['39 s → < 2 s', 'Ladezeit Shift Manager → Antwortzeit neu'],
              ['2 h / 1 Arbeitstag', 'SLA Hoch / Mittel – abbildbar und prüfbar'],
              ['2 Kanäle → 1 Kanal', 'Formular und E-Mail → ein Kundenportal'],
              ['18 Pain Points', 'aus Ist-Prozess und Workshop'],
            ].map(([a, b]) => (
              <div key={a} className="rounded-lg border border-white/15 bg-white/5 px-4 py-3">
                <div className="text-[19px] font-semibold" style={{ color: GOLD }}>
                  {a}
                </div>
                <div className="text-[12.5px] text-white/75">{b}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-[#DDE3E7] bg-white px-4 py-3 text-[14px]">
          <Lightbulb size={18} className="text-[#b89a1f]" />
          <span className="flex-1">
            <b>Unterschiede einblenden:</b> markiert in jedem Mockup, welcher Pain Point im Ist-System auftritt <Chip kind="pain">⚠ PP07</Chip> und wo der Soll-Prozess ihn löst <Chip kind="fix">✓ PP07</Chip>.
          </span>
          <button onClick={() => setOn(!on)} className={`rounded-full px-4 py-1.5 font-semibold ${on ? 'text-[#1A1A1A]' : 'bg-slate-100 text-slate-600'}`} style={on ? { background: GOLD } : undefined}>
            {on ? 'Eingeblendet' : 'Ausgeblendet'}
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <Column tone="ist" title="Ist-Zustand · heute" subtitle="Eigenentwicklung seit über zehn Jahren – kein Know-how mehr im Haus" cards={IST} />
          <Column tone="soll" title="Soll-Prozess · Prototyp" subtitle="Konfigurierter Klick-Prototyp – zeigt den Prozess, nicht das Produkt" cards={SOLL} />
        </div>

        <section className="mt-10">
          <h2 className="text-[20px] font-semibold" style={{ color: NAVY }}>
            Unterschiede zeigen
          </h2>
          <p className="mb-4 text-[14px] text-[#5A6570]">Ist und Soll direkt nebeneinander – ideal für die Live-Demo auf dem Beamer.</p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <CompareCard to="/vergleich" icon={<GitCompareArrows size={20} />} title="Ist vs. Soll – Szenario für Szenario" desc="8 Szenarien mit Direktlinks in beide Systeme und Pain-Point-Bezug." />
            <CompareCard to="/split?l=/ist/formular&r=/portal" icon={<Columns2 size={20} />} title="Split: Anfrage erfassen" desc="Links öffentliches Formular, rechts Kundenportal." />
            <CompareCard to="/split?l=/ist/wise/ticket/24482&r=/desk/ticket/TS-1030" icon={<Columns2 size={20} />} title="Split: Ticket bearbeiten" desc="Links WISE #24482, rechts dasselbe Ticket im Soll-System." />
            <CompareCard to="/split?l=/portal&r=/desk" icon={<LayoutDashboard size={20} />} title="Split: Kunde ↔ Support live" desc="Ticket im Portal erfassen, erscheint sofort in der Queue." />
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-lg border border-[#DDE3E7] bg-white p-5">
            <h3 className="mb-3 flex items-center gap-2 text-[16px] font-semibold" style={{ color: NAVY }}>
              <BarChart3 size={18} /> Pain Points aus der Ist-Analyse
            </h3>
            <div className="grid gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-2">
              {Object.entries(PAIN_POINTS).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="w-10 shrink-0 font-semibold text-[#5A6570]">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-lg border border-[#DDE3E7] bg-white p-5 text-[14px]">
              <h3 className="mb-2 flex items-center gap-2 text-[16px] font-semibold" style={{ color: NAVY }}>
                <Database size={18} /> Demo-Daten
              </h3>
              <p className="text-[#5A6570]">
                Modus: {mode === 'supabase' ? <b className="text-emerald-700">Supabase – geteilt und live über alle Geräte</b> : <b>Browser-lokal</b>}
                {mode === 'local' && ' – Daten bleiben in diesem Browser; alle Tabs und der Split-Screen sind live synchron.'}
              </p>
              {store.error && <p className="mt-1 text-[12.5px] text-red-700">Supabase nicht erreichbar ({store.error}) – lokaler Modus aktiv.</p>}
              <div className="mt-3">
                {!confirmReset ? (
                  <button onClick={() => setConfirmReset(true)} className="flex items-center gap-2 rounded-md border border-[#DDE3E7] px-3 py-1.5 font-medium hover:bg-slate-50">
                    <RotateCcw size={15} /> Demo-Daten zurücksetzen
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px]">Alle erfassten Tickets verwerfen{mode === 'supabase' ? ' (für alle Geräte)' : ''}?</span>
                    <button
                      onClick={async () => {
                        await store.reset()
                        setConfirmReset(false)
                        toast('Demo-Daten zurückgesetzt – SLA-Uhren starten neu.', 'success')
                      }}
                      className="rounded-md bg-red-600 px-3 py-1.5 font-semibold text-white"
                    >
                      Ja, zurücksetzen
                    </button>
                    <button onClick={() => setConfirmReset(false)} className="rounded-md px-3 py-1.5 hover:bg-slate-100">
                      Abbrechen
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-2 text-[12px] text-[#5A6570]">Tipp: Kurz vor der Präsentation zurücksetzen, damit die SLA-Uhren der Beispieltickets realistisch laufen.</p>
            </div>
            <div className="rounded-lg border border-[#DDE3E7] bg-white p-5 text-[13px] text-[#5A6570]">
              <b className="text-[#1A1A1A]">Abgrenzung:</b> Verrechnung bleibt ausserhalb des Systems – Leistungsdaten gehen über eine Schnittstelle an die Buchhaltung. Direktzuweisung an Fachverantwortliche: Entscheid der Geschäftsleitung. Alle Namen, Kunden und Tickets sind fiktiv.
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#DDE3E7] bg-white">
        <div className="mx-auto max-w-[1240px] px-5 py-5 text-[12.5px] text-[#5A6570] sm:px-8">
          Lerngruppe La Ultima Cerveza: José Gómez · Livia Hebeisen · Nicole Riesen · Rémy Weibel · Sebastian Wright — Auftraggeberin TimeTool AG, Thun · Lerncoach Patrick Joder · Berner Fachhochschule
        </div>
      </footer>
    </div>
  )
}

function Chip({ kind, children }: { kind: 'pain' | 'fix'; children: ReactNode }) {
  return (
    <span className={`mx-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${kind === 'pain' ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}`}>{children}</span>
  )
}

function Column({ tone, title, subtitle, cards }: { tone: 'ist' | 'soll'; title: string; subtitle: string; cards: DemoCard[] }) {
  const accent = tone === 'ist' ? '#C0392B' : '#1E8E5A'
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <span className="h-8 w-1.5 rounded" style={{ background: accent }} />
        <div>
          <h2 className="text-[20px] font-semibold" style={{ color: NAVY }}>
            {title}
          </h2>
          <p className="text-[13.5px] text-[#5A6570]">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-4">
        {cards.map((c) => (
          <Card key={c.to} c={c} accent={accent} tone={tone} />
        ))}
      </div>
    </section>
  )
}

function Card({ c, accent, tone }: { c: DemoCard; accent: string; tone: 'ist' | 'soll' }) {
  const [open, setOpen] = useState(false)
  return (
    <article className="overflow-hidden rounded-xl border border-[#DDE3E7] bg-white shadow-sm transition hover:shadow-md">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: accent }}>
            {c.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 text-[12px] font-semibold tracking-wide text-[#5A6570] uppercase">
              {c.kicker} <span className="font-normal normal-case">· {c.who}</span>
            </div>
            <h3 className="text-[18px] font-semibold" style={{ color: NAVY }}>
              {c.title}
            </h3>
          </div>
        </div>
        <p className="mt-3 text-[14px] leading-relaxed text-[#3b4650]">{c.desc}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {c.pps.map((p) => (
            <span key={p} title={PAIN_POINTS[p]} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${tone === 'ist' ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}`}>
              {tone === 'ist' ? '⚠' : '✓'} {p}
            </span>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link to={c.to} className="flex items-center gap-2 rounded-lg px-4 py-2 text-[14px] font-semibold text-white" style={{ background: NAVY }}>
            Demo öffnen <ArrowRight size={16} />
          </Link>
          {c.extra?.map((x) => (
            <Link key={x.to} to={x.to} className="rounded-lg border border-[#DDE3E7] px-3 py-2 text-[13px] text-[#3b4650] hover:bg-slate-50">
              {x.label}
            </Link>
          ))}
          <button onClick={() => setOpen(!open)} className="ml-auto flex items-center gap-1 rounded-lg px-2 py-2 text-[13px] text-[#5A6570] hover:bg-slate-50">
            Drehbuch <ChevronDown size={15} className={`transition ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      {open && (
        <ol className="space-y-1.5 border-t border-[#DDE3E7] bg-[#F7F9FA] px-5 py-4 text-[13.5px]">
          {c.steps.map((s, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-[#1A1A1A]" style={{ background: GOLD }}>
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
      )}
    </article>
  )
}

function CompareCard({ to, icon, title, desc }: { to: string; icon: ReactNode; title: string; desc: string }) {
  return (
    <Link to={to} className="group rounded-xl border border-[#DDE3E7] bg-white p-4 shadow-sm transition hover:border-[#1C3A52] hover:shadow-md">
      <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: '#EEF1F3', color: NAVY }}>
        {icon}
      </span>
      <div className="text-[15px] font-semibold" style={{ color: NAVY }}>
        {title}
      </div>
      <div className="mt-1 text-[13px] text-[#5A6570]">{desc}</div>
      <div className="mt-2 flex items-center gap-1 text-[13px] font-semibold opacity-0 transition group-hover:opacity-100" style={{ color: NAVY }}>
        Öffnen <ArrowRight size={14} />
      </div>
    </Link>
  )
}
