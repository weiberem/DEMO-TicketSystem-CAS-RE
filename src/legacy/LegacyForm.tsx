import { useEffect, useRef, useState, type ComponentType, type CSSProperties, type DragEvent, type ReactNode } from 'react'
import {
  Bold,
  Check,
  ChevronDown,
  Clipboard,
  ClipboardPaste,
  Code,
  Copy,
  FileText,
  Flag,
  Italic,
  Link as LinkIcon,
  List,
  ListIndentDecrease,
  ListIndentIncrease,
  ListOrdered,
  Maximize,
  Minus,
  Omega,
  Paperclip,
  Quote,
  Redo2,
  RefreshCw,
  RemoveFormatting,
  Scissors,
  SpellCheck,
  Strikethrough,
  Table,
  Undo2,
  Unlink,
} from 'lucide-react'
import type { LegacyTicket } from '../lib/types'
import { nextLegacyId, now, saveLegacy, uid } from '../lib/actions'
import { usePref } from '../lib/store'
import { DemoBar, DiffNote, PP, fakeFiles, fmtSize } from '../components/ui'

// ---------------------------------------------------------------------------
// Ist-Zustand: öffentliches Kontaktformular auf timetool.ch (Rollenspiel Folie 2)
// Bewusst OHNE Kategorie, Anfragetyp, Priorität, SLA-Hinweis und Login.
// ---------------------------------------------------------------------------

type View = 'landing' | 'form' | 'done' | 'error'
type Icon = ComponentType<{ size?: number; className?: string; strokeWidth?: number }>

interface FormState {
  customerNr: string
  company: string
  short: string
  details: string
  name: string
  phone: string
  email: string
}

const EMPTY: FormState = { customerNr: '', company: '', short: '', details: '', name: '', phone: '', email: '' }

const TEAL = '#2e7474'

const STEPS: [string, string][] = [
  ['Angaben zur Firma', 'Wem können wir helfen?'],
  ['Details zur Anfrage', 'Wie können wir behilflich sein?'],
  ['Kontaktangaben', 'Wie erreichen wir Sie?'],
]

const RULES: [string, string][] = [
  [
    'Kurzbeschreibung der Anfrage',
    'Bitte nutzen Sie bereits im Betreff einen prägnanten, verständlichen Titel, beispielsweise «Frage zur IST-Zeit bei Mitarbeiter XY am 12.12.2025».',
  ],
  ['Beschreibung der Problemstellung', 'Schildern Sie uns möglichst prägnant die aufgetretene Störung in wenigen Sätzen.'],
  [
    'Wer ist betroffen?',
    'Nennen Sie den Namen, die Personalnummer und den Login der betroffenen Person. Im Rahmen der Projektzeiterfassung ergänzen Sie bitte das betroffene Projekt resp. bei Planung den Planungstag.',
  ],
  ['Zeitpunkt der Störung', 'Geben Sie das Datum an, an dem die Störung bei einer Person oder einem Projekt auftrat (in Zeitpunkt-bezogenen Fällen).'],
  ['Betroffene Ansicht', 'Teilen Sie uns mit, in welchem Programm-Bereich oder welcher Ansicht (Eingabemaske) das Problem sichtbar ist.'],
  ['Screenshots', 'Bilder sagen mehr als Worte. Fügen Sie, wenn möglich, Screenshots hinzu, um das Problem klar darzustellen.'],
]

/** Speichert die Übermittlung als Ticket im Altsystem (erscheint in WISE unter «Triage»). */
function saveSubmission(f: FormState, files: string[]) {
  const ts = now()
  const short = f.short.trim()
  const details = f.details.trim()
  const formText = [
    `Online-Formular erhalten am ${new Date().toLocaleString('de-CH')} von der IP-Adresse: 10.10.20.1`,
    'Firmenname:',
    f.company.trim(),
    'Anliegen/Betreff:',
    ...(short ? [short] : []),
    ...(details ? details.split('\n') : []),
    'Erreichbarkeit:',
    'N/A',
    'Lösung:',
    'N/A',
  ].join('\n')
  const t: LegacyTicket = {
    id: nextLegacyId(),
    title: short || '(ohne Betreff)',
    status: 'New',
    priority: 'Normal',
    srType: 'Web-Formular',
    srSubtype: 'N/A',
    createdAt: ts,
    updatedAt: ts,
    company: f.company.trim(),
    customerNr: f.customerNr.trim(),
    contact: f.name.trim(),
    phone: f.phone.trim(),
    email: f.email.trim(),
    assignedTo: 'N/A',
    externalId: Math.random().toString(36).slice(2, 10).toUpperCase(),
    billed: 0,
    fixBetrag: 0,
    formText,
    attachments: files,
    mails: [],
    spentTime: [],
    comments: [],
    history: [{ id: uid('lh'), at: ts, user: 'System', text: 'Ticket aus Online-Formular erstellt' }],
    notificationUnread: false,
  }
  saveLegacy(t)
}

export default function LegacyForm() {
  const [view, setView] = useState<View>('landing')
  const [step, setStep] = useState(1)
  const [f, setF] = useState<FormState>(EMPTY)
  const [files, setFiles] = useState<{ name: string; size: number }[]>([])
  const [captcha, setCaptcha] = useState<'off' | 'checking' | 'ok'>('off')
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'captcha', string>>>({})
  const [sending, setSending] = useState(false)
  const [failPref, setFailPref] = usePref('legacy-form-fail', '0')
  const fail = failPref === '1'

  const set = (k: keyof FormState) => (v: string) => {
    setF((s) => ({ ...s, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const resetAll = () => {
    setF(EMPTY)
    setFiles([])
    setCaptcha('off')
    setErrors({})
    setStep(1)
  }

  useEffect(() => {
    if (captcha !== 'checking') return
    const tm = setTimeout(() => setCaptcha('ok'), 600)
    return () => clearTimeout(tm)
  }, [captcha])

  useEffect(() => {
    if (!sending) return
    const tm = setTimeout(
      () => {
        setSending(false)
        if (fail) {
          setView('error')
          return
        }
        saveSubmission(
          f,
          files.map((x) => x.name),
        )
        setView('done')
      },
      fail ? 1500 : 900,
    )
    return () => clearTimeout(tm)
  }, [sending, fail, f, files])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view, step])

  const next = () => {
    const e: typeof errors = {}
    if (step === 1) {
      if (!f.company.trim()) e.company = 'Dieses Feld ist ein Pflichtfeld.'
      if (captcha !== 'ok') e.captcha = 'Bitte bestätigen Sie, dass Sie kein Roboter sind.'
    }
    if (step === 3) {
      if (!f.name.trim()) e.name = 'Dieses Feld ist ein Pflichtfeld.'
      if (!f.email.trim()) e.email = 'Dieses Feld ist ein Pflichtfeld.'
      else if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.'
    }
    setErrors(e)
    if (Object.keys(e).length) return
    if (step < 3) setStep(step + 1)
    else setSending(true)
  }

  if (view === 'landing') {
    return (
      <>
        <Landing onStart={() => setView('form')} />
        <DemoBar label="Ist · Kontaktformular" />
      </>
    )
  }

  if (view === 'error') {
    return (
      <>
        <ServerError
          onBack={() => {
            resetAll()
            setView('form')
          }}
        />
        <DemoBar label="Ist · Kontaktformular" />
      </>
    )
  }

  return (
    <div className="min-h-full bg-[#f7f9fb] font-noto text-[#333]">
      <div className="mx-auto flex min-h-screen max-w-[1100px] flex-col bg-[#fbfcfd] shadow-[0_0_28px_rgba(0,0,0,0.07)]">
        <FormHeader onLogo={() => setView('landing')} />

        <div className="flex-1 px-5 pb-10 md:px-[50px]">
          <div className="pt-8">
            <h1 className="flex flex-wrap items-center gap-3 font-raleway text-[32px] leading-tight font-light text-[#2f3b43]">
              <span className="uppercase">Neue Anfrage</span>
              <PP kind="pain" ids={['PP01']} label="öffentlich, ohne Login" />
            </h1>
            <p className="font-raleway text-[19px] font-light text-[#8a959c]">Erstellen Sie in wenigen Schritten eine neue Support-Anfrage</p>
          </div>

          <div className="mt-9 border border-[#e3e7ea] bg-white px-5 pt-6 pb-8 md:px-10">
            {view === 'done' ? (
              <ThankYou
                onNew={() => {
                  resetAll()
                  setView('form')
                }}
              />
            ) : (
              <>
                <Stepper step={step} />
                <div className="mt-12">
                  {step === 1 ? (
                    <Step1 f={f} set={set} errors={errors} captcha={captcha} onCaptcha={() => {
                        if (captcha !== 'off') return
                        setCaptcha('checking')
                        setErrors((e) => ({ ...e, captcha: undefined }))
                      }} />
                  ) : step === 2 ? (
                    <Step2 f={f} set={set} files={files} onFiles={(l) => setFiles((x) => [...x, ...l])} />
                  ) : (
                    <Step3 f={f} set={set} errors={errors} disabled={sending} />
                  )}
                </div>
                <div className={`mt-10 flex items-center ${step > 1 ? 'justify-between' : 'justify-end'}`}>
                  {step > 1 ? (
                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => setStep(step - 1)}
                      className="h-[36px] rounded-[2px] border border-[#ddd] bg-white px-3 text-[15px] text-[#555] hover:bg-[#f5f5f5] disabled:opacity-50"
                    >
                      Zurück
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={sending}
                    onClick={next}
                    className="inline-flex h-[36px] items-center gap-2 rounded-[2px] px-3 text-[15px] text-white hover:brightness-110 disabled:opacity-80"
                    style={{ background: TEAL }}
                  >
                    {sending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
                    {step < 3 ? 'Weiter' : 'Anfrage senden'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <footer className="px-5 pt-6 pb-20 text-center">
          <div className="text-[15px] text-[#666]">
            © Copyright 2026 - <span className="text-[#5f8f96]">TimeTool AG</span>; Alle Rechte vorbehalten.
          </div>
          <label className="mt-6 inline-flex cursor-pointer items-center gap-1.5 text-[10.5px] text-[#b3bcc2] select-none hover:text-[#7c878e]">
            <input type="checkbox" className="h-3 w-3" checked={fail} onChange={(e) => setFailPref(e.target.checked ? '1' : '0')} />
            Demo: Übermittlungsfehler simulieren
          </label>
        </footer>
      </div>
      <DemoBar label="Ist · Kontaktformular" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Kopfbereich: Wortmarke, Banner, Sprach-Flaggen
// ---------------------------------------------------------------------------

function BlueT() {
  return (
    <span className="relative inline-block">
      T<span className="absolute top-[4px] right-[-1px] left-[-3px] h-[5px] bg-[#1c8fc8]" />
    </span>
  )
}

function Wordmark({ light = false }: { light?: boolean }) {
  const c = light ? 'text-white' : 'text-[#3a4750]'
  return (
    <div className="flex items-start gap-2 select-none">
      <div>
        <div className={`font-raleway text-[52px] leading-[0.95] font-medium tracking-[-0.045em] ${c}`}>
          <BlueT />
          ime
          <BlueT />
          ool
        </div>
        <div className={`-mt-0.5 text-right font-noto text-[17px] italic ${c}`}>it's your time</div>
      </div>
      {!light ? (
        <div
          className="mt-0.5 flex h-[70px] w-[21px] flex-col items-center bg-[#1c8fc8] pt-1 text-white"
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 86%, 0 100%)' }}
        >
          <span className="text-[11px] leading-none font-bold">25</span>
          <span className="text-[4.5px] leading-none tracking-tight">YEARS</span>
        </div>
      ) : null}
    </div>
  )
}

function Flags() {
  return (
    <div className="flex gap-2.5">
      <span className="flex h-[22px] w-[30px] overflow-hidden" title="Français">
        <span className="flex-1 bg-[#002395]" />
        <span className="flex-1 bg-white" />
        <span className="flex-1 bg-[#ed2939]" />
      </span>
      <span className="flex h-[22px] w-[30px] overflow-hidden" title="Italiano">
        <span className="flex-1 bg-[#009246]" />
        <span className="flex-1 bg-white" />
        <span className="flex-1 bg-[#ce2b37]" />
      </span>
      <span
        className="relative h-[22px] w-[30px] overflow-hidden"
        title="English"
        style={{ background: 'repeating-linear-gradient(180deg, #b22234 0 1.7px, #fff 1.7px 3.4px)' }}
      >
        <span className="absolute top-0 left-0 h-[12px] w-[13px] bg-[#3c3b6e]" />
      </span>
    </div>
  )
}

function Banner() {
  const pennant = (color: string, style: CSSProperties) => (
    <span className="absolute" style={{ ...style, background: color, clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
  )
  return (
    <div
      className="relative hidden flex-1 overflow-hidden md:block"
      style={{ background: 'linear-gradient(120deg, #d8eef9 0%, #aad8f3 40%, #7cc0ec 100%)' }}
    >
      {/* Riesenrad-Speichen */}
      <span className="absolute top-[-30px] left-[10px] h-[2px] w-[320px] origin-left rotate-[18deg] bg-white/80" />
      <span className="absolute top-[10px] left-[-20px] h-[2px] w-[300px] origin-left rotate-[-8deg] bg-white/70" />
      <span className="absolute top-[70px] left-[30px] h-[2px] w-[260px] origin-left rotate-[-28deg] bg-white/60" />
      {/* Turm */}
      <span className="absolute top-0 left-[340px] h-full w-[10px] bg-[repeating-linear-gradient(180deg,#fff_0_6px,#e33_6px_9px)] opacity-90" />
      <span className="absolute top-[26px] left-[300px] h-[34px] w-[90px] rounded-b-[40px] bg-[#f3f6f8]/90" />
      {/* Wimpel */}
      {pennant('#f5d90a', { top: -10, left: 8, width: 40, height: 70, transform: 'rotate(-18deg)' })}
      {pennant('#2fb24c', { top: -14, left: 140, width: 52, height: 90, transform: 'rotate(-6deg)' })}
      {pennant('#f2d40c', { top: 40, left: 290, width: 50, height: 80, transform: 'rotate(12deg)' })}
      {pennant('#ef6fb0', { top: 88, left: 470, width: 46, height: 44, transform: 'rotate(-24deg)', opacity: 0.8 })}
      <div className="absolute top-[44px] right-[30px]">
        <Flags />
      </div>
    </div>
  )
}

function FormHeader({ onLogo }: { onLogo: () => void }) {
  return (
    <div className="flex h-[117px] items-stretch">
      <button type="button" onClick={onLogo} className="flex w-full shrink-0 items-center pl-5 text-left md:w-[360px] md:pl-[45px]" title="Zur Support-Seite">
        <Wordmark />
      </button>
      <Banner />
    </div>
  )
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="relative grid grid-cols-3">
      <div className="absolute top-[28px] right-[16.66%] left-[16.66%] h-[5px] bg-[#cfcfcf]" />
      {STEPS.map(([title, sub], i) => {
        const active = step === i + 1
        return (
          <div key={title} className="relative z-10 flex flex-col items-center text-center">
            <div
              className="flex h-[60px] w-[60px] items-center justify-center rounded-full text-[22px] font-semibold text-white"
              style={{ background: active ? TEAL : '#cfcfcf' }}
            >
              {i + 1}
            </div>
            <div className={`mt-2.5 text-[15px] font-semibold md:text-[17px] ${active ? 'text-[#444]' : 'text-[#9a9a9a]'}`}>{title}</div>
            <div className={`mt-1 text-[13px] md:text-[16px] ${active ? 'text-[#666]' : 'text-[#b5b5b5]'}`}>{sub}</div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Formularschritte
// ---------------------------------------------------------------------------

const inputCls =
  'h-[46px] w-full rounded-[2px] border border-[#dcdfe2] bg-white px-4 text-[16px] text-[#333] outline-none placeholder:text-[#9aa1a6] focus:border-[#8fb8b8] disabled:bg-[#f7f7f7]'

function Row({
  label,
  required,
  children,
  help,
  error,
  note,
}: {
  label: string
  required?: boolean
  children: ReactNode
  help?: ReactNode
  error?: string
  note?: ReactNode
}) {
  return (
    <div className="mb-6 grid grid-cols-1 items-start gap-x-0 gap-y-1 md:grid-cols-[160px_minmax(0,610px)_auto] md:gap-x-0">
      <label className="pt-2.5 text-[17px] font-semibold whitespace-nowrap text-[#333] md:overflow-hidden">
        {label}
        {required ? <span className="text-[#a00]">*</span> : null}
        {note ? <div className="mt-2 whitespace-normal">{note}</div> : null}
      </label>
      <div>
        {children}
        {error ? <div className="mt-1 text-[13px] text-[#c0392b]">{error}</div> : null}
      </div>
      <div className="md:pl-7">{help}</div>
    </div>
  )
}

function HelpButton({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onBlur={() => setOpen(false)}
        className="flex h-[44px] w-[50px] items-center justify-center rounded-[2px] border border-[#dcdfe2] bg-white text-[15px] font-bold text-[#333] hover:bg-[#f7f7f7]"
      >
        ?
      </button>
      {open ? (
        <div className="absolute top-[50px] right-0 z-20 w-[260px] rounded-[3px] bg-[#333] px-3 py-2 text-[12.5px] leading-snug text-white shadow-lg">
          {text}
        </div>
      ) : null}
    </div>
  )
}

type Setter = (k: keyof FormState) => (v: string) => void
type Errors = Partial<Record<keyof FormState | 'captcha', string>>

function Step1({ f, set, errors, captcha, onCaptcha }: { f: FormState; set: Setter; errors: Errors; captcha: 'off' | 'checking' | 'ok'; onCaptcha: () => void }) {
  return (
    <div>
      <Row label="Kundennummer" help={<HelpButton text="Ihre Kundennummer finden Sie auf unseren Rechnungen. Falls Sie sie nicht kennen, lassen Sie das Feld einfach leer." />}>
        <input className={inputCls} placeholder="z.B. 1234" value={f.customerNr} onChange={(e) => set('customerNr')(e.target.value)} />
      </Row>
      <Row label="Firmenname" required error={errors.company}>
        <input className={inputCls} placeholder="z.B. Hans Müller GmbH" value={f.company} onChange={(e) => set('company')(e.target.value)} />
      </Row>

      <div className="mt-12 flex flex-col items-end">
        <div className="flex h-[78px] w-[304px] items-center justify-between rounded-[3px] border border-[#d3d3d3] bg-[#f9f9f9] pr-2 pl-3 shadow-[0_0_4px_1px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCaptcha}
              aria-label="Ich bin kein Roboter"
              className={`flex h-[30px] w-[30px] items-center justify-center rounded-[2px] bg-white ${captcha === 'off' ? 'border-2 border-[#c1c1c1] hover:border-[#b2b2b2]' : ''}`}
            >
              {captcha === 'checking' ? <span className="h-[24px] w-[24px] animate-spin rounded-full border-[3px] border-[#d6e4f7] border-t-[#4a90e2]" /> : null}
              {captcha === 'ok' ? <Check size={30} strokeWidth={3.2} className="text-[#009e55]" /> : null}
            </button>
            <span className="text-[14.5px] text-black" style={{ fontFamily: 'Roboto, Arial, sans-serif' }}>
              Ich bin kein Roboter.
            </span>
          </div>
          <div className="flex w-[70px] flex-col items-center text-[#555]" style={{ fontFamily: 'Roboto, Arial, sans-serif' }}>
            <RefreshCw size={30} strokeWidth={2.4} className="text-[#4a90e2]" />
            <span className="mt-0.5 text-[10px]">reCAPTCHA</span>
          </div>
        </div>
        {errors.captcha ? <div className="mt-1 text-[13px] text-[#c0392b]">{errors.captcha}</div> : null}
      </div>

      <DiffNote kind="pain" ids={['PP01']} className="mt-8 max-w-[760px]">
        Jede Person kann das Formular ausfüllen – ohne Login. Die Kundennummer ist freiwillig, und es wird nicht geprüft, ob eine berechtigte
        HR-Ansprechperson schreibt.
      </DiffNote>
    </div>
  )
}

const TB_ROW1: Icon[][] = [[Scissors, Copy, Clipboard, ClipboardPaste, FileText], [Undo2, Redo2], [SpellCheck], [LinkIcon, Unlink, Flag]]
const TB_ROW3: Icon[][] = [[Bold, Italic, Strikethrough], [RemoveFormatting], [ListOrdered, List], [ListIndentDecrease, ListIndentIncrease], [Quote]]

function ToolGroup({ icons, children }: { icons: Icon[]; children?: ReactNode }) {
  return (
    <span className="flex items-center border-r border-[#d8d8d8] pr-1.5 mr-1.5 last:border-r-0">
      {icons.map((I, i) => (
        <span key={i} className="flex h-[24px] w-[24px] items-center justify-center text-[#6f6f6f]">
          <I size={14} strokeWidth={2.2} />
        </span>
      ))}
      {children}
    </span>
  )
}

function FakeEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="border border-[#d1d1d1] bg-white">
      <div className="space-y-1 border-b border-[#d1d1d1] bg-[#f8f8f8] px-2 py-1.5 select-none" aria-hidden>
        <div className="flex flex-wrap items-center">
          {TB_ROW1.map((g, i) => (
            <ToolGroup key={i} icons={g}>
              {g[0] === SpellCheck ? <ChevronDown size={10} className="-ml-1 text-[#777]" /> : null}
            </ToolGroup>
          ))}
        </div>
        <div className="flex flex-wrap items-center">
          <ToolGroup icons={[Table, Minus, Omega]} />
          <ToolGroup icons={[Maximize]} />
          <ToolGroup icons={[Code]}>
            <span className="text-[12.5px] text-[#444]">Quellcode</span>
          </ToolGroup>
        </div>
        <div className="flex flex-wrap items-center">
          {TB_ROW3.map((g, i) => (
            <ToolGroup key={i} icons={g} />
          ))}
        </div>
        <div className="flex items-center gap-2 pb-0.5 text-[12.5px] text-[#444]">
          <span className="flex w-[88px] items-center justify-between border-r border-[#d8d8d8] pr-2 pl-2">
            Stil <ChevronDown size={10} />
          </span>
          <span className="flex w-[88px] items-center justify-between border-r border-[#d8d8d8] pr-2 pl-1">
            Format <ChevronDown size={10} />
          </span>
        </div>
      </div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} className="block h-[200px] w-full resize-none px-3 py-2 text-[14px] outline-none" />
      <div className="flex h-[22px] items-center justify-end border-t border-[#d1d1d1] bg-[#f8f8f8] pr-1">
        <span className="h-[8px] w-[8px] bg-[#bbb]" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
      </div>
    </div>
  )
}

function Step2({
  f,
  set,
  files,
  onFiles,
}: {
  f: FormState
  set: Setter
  files: { name: string; size: number }[]
  onFiles: (l: { name: string; size: number }[]) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const drop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    onFiles(fakeFiles(e.dataTransfer.files))
  }
  return (
    <div>
      <Row label="Kurzbeschreibung" help={<HelpButton text="Ein kurzer Titel für Ihre Anfrage." />}>
        <input className={inputCls} placeholder="z.B. Neue Mitarbeiterin erfassen" value={f.short} onChange={(e) => set('short')(e.target.value)} />
      </Row>
      <Row label="Details" note={<PP kind="pain" ids={['PP02', 'PP08']} label="nur Freitext" />}>
        <FakeEditor value={f.details} onChange={set('details')} />
      </Row>
      <Row label="Anhänge" help={<HelpButton text="Screenshots helfen uns, Ihr Anliegen schneller zu verstehen." />}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => input.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={drop}
          className={`flex h-[300px] cursor-pointer items-center justify-center border px-10 text-center text-[36px] leading-[1.35] text-[#444] ${
            over ? 'border-[#8fb8b8] bg-[#eaf3f3]' : 'border-[#ddd] bg-[#f3f3f3]'
          }`}
        >
          Dateien hierhin ziehen…
        </div>
        <input
          ref={input}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            onFiles(fakeFiles(e.target.files))
            e.target.value = ''
          }}
        />
        {files.length ? (
          <ul className="mt-2 space-y-1 text-[14px] text-[#555]">
            {files.map((x, i) => (
              <li key={x.name + i} className="flex items-center gap-2">
                <Paperclip size={14} className="text-[#999]" />
                {x.name} <span className="text-[12px] text-[#999]">({fmtSize(x.size)})</span>
              </li>
            ))}
          </ul>
        ) : null}
      </Row>

      <div className="mt-4 grid max-w-[760px] gap-2">
        <DiffNote kind="pain" ids={['PP02', 'PP08']}>
          Nur Freitext: Die sechs Regeln der Supportseite (Wer ist betroffen? Zeitpunkt? Betroffene Ansicht? …) werden nicht abgefragt –
          unvollständige Angaben führen zu Rückfragen.
        </DiffNote>
        <DiffNote kind="pain" ids={['PP09', 'PP10']}>
          Keine Kategorie, kein Anfragetyp, keine Priorität, kein SLA-Hinweis – und kein Hinweis, dringende Störungen zusätzlich telefonisch zu
          melden.
        </DiffNote>
      </div>
    </div>
  )
}

function Step3({ f, set, errors, disabled }: { f: FormState; set: Setter; errors: Errors; disabled: boolean }) {
  return (
    <div>
      <Row label="Name" required error={errors.name}>
        <input className={inputCls} disabled={disabled} placeholder="z.B. Hans Müller" value={f.name} onChange={(e) => set('name')(e.target.value)} />
      </Row>
      <Row label="Telefon">
        <input className={inputCls} disabled={disabled} placeholder="z.B. 033 123 45 67" value={f.phone} onChange={(e) => set('phone')(e.target.value)} />
      </Row>
      <Row label="E-Mail" required error={errors.email}>
        <input
          className={inputCls}
          disabled={disabled}
          type="email"
          placeholder="z.B. hans.mueller@firma.ch"
          value={f.email}
          onChange={(e) => set('email')(e.target.value)}
        />
      </Row>
    </div>
  )
}

function ThankYou({ onNew }: { onNew: () => void }) {
  return (
    <div className="py-10 text-center">
      <h2 className="font-raleway text-[26px] font-light text-[#2f3b43]">Vielen Dank! Ihre Anfrage wurde übermittelt.</h2>
      <button
        type="button"
        onClick={onNew}
        className="mt-8 h-[36px] rounded-[2px] px-4 text-[15px] text-white hover:brightness-110"
        style={{ background: TEAL }}
      >
        Neue Anfrage erfassen
      </button>
      <div className="mx-auto mt-10 grid max-w-[640px] gap-2 text-left">
        <DiffNote kind="pain" ids={['PP04', 'PP05']}>
          Keine Ticketnummer, keine Eingangsbestätigung per E-Mail und keine Übersicht der eigenen Anfragen – der Kunde weiss nicht, ob und wann
          sich jemand meldet.
        </DiffNote>
        <DiffNote kind="pain" ids={['PP06']}>
          Viele Kunden schreiben stattdessen (oder zusätzlich) direkt an support@timetool.ch – zwei parallele Kanäle, kein Single Point of Contact.
        </DiffNote>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Übermittlungsfehler (PP03) – absichtlich hässlich, Daten sind weg
// ---------------------------------------------------------------------------

function ServerError({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-full bg-white px-6 py-6 text-black" style={{ fontFamily: 'Verdana, Arial, sans-serif' }}>
      <h1 className="text-[22px] text-[#cc0000]" style={{ fontFamily: 'Verdana, sans-serif' }}>
        Server Error in '/support/anfrage' Application.
      </h1>
      <hr className="my-2 border-[#c0c0c0]" />
      <h2 className="text-[17px] text-[#800000] italic">Error 500 – Die Anfrage konnte nicht verarbeitet werden. Bitte versuchen Sie es später erneut.</h2>
      <p className="mt-4 text-[11.5px]">
        <b>Description:</b> An unhandled exception occurred during the execution of the current web request. Please review the stack trace for more
        information about the error and where it originated in the code.
      </p>
      <p className="mt-3 text-[11.5px]">
        <b>Exception Details:</b> System.Data.SqlClient.SqlException: Timeout expired. The timeout period elapsed prior to completion of the operation
        or the server is not responding.
      </p>
      <pre className="mt-3 overflow-x-auto bg-[#ffffcc] p-3 text-[11px] leading-[1.45]" style={{ fontFamily: '"Lucida Console", monospace' }}>
        {`[SqlException (0x80131904): Timeout expired.]
   System.Data.SqlClient.SqlConnection.OnError(SqlException exception) +2154
   Wise.Web.ContactForm.SaveRequest(FormData data) in D:\\Build\\Wise\\ContactForm.cs:line 212
   Wise.Web.ContactForm.btnSubmit_Click(Object sender, EventArgs e) +88
   System.Web.UI.Page.ProcessRequestMain(Boolean includeStagesBeforeAsyncPoint) +1720`}
      </pre>
      <hr className="my-3 border-[#c0c0c0]" />
      <p className="text-[11px]">
        <b>Version Information:</b> Microsoft .NET Framework Version:4.0.30319; ASP.NET Version:4.7.3930.0
      </p>

      <DiffNote kind="pain" ids={['PP03']} className="mt-6 max-w-[640px]">
        Alle eingegebenen Daten sind verloren – der Kunde muss alles neu erfassen (oder gibt auf und schreibt eine E-Mail).
      </DiffNote>

      <button type="button" onClick={onBack} className="mt-6 text-[12px] text-[#0000ee] underline">
        Zurück zum Formular
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Support-Seite vor dem Formular (kompakt nach timetool.ch/support)
// ---------------------------------------------------------------------------

function Landing({ onStart }: { onStart: () => void }) {
  const [ok, setOk] = useState(false)
  const [warn, setWarn] = useState(false)
  return (
    <div className="min-h-full bg-[#36474f] font-noto text-white">
      <div className="mx-auto max-w-[1100px] px-5 md:px-10">
        <div className="flex items-center justify-between py-4">
          <div className="origin-left scale-[0.62]">
            <Wordmark light />
          </div>
          <nav className="hidden gap-6 text-[13px] text-white/70 md:flex">
            <span>Produkte</span>
            <span>Lösungen</span>
            <span className="text-white">Support</span>
            <span>Kontakt</span>
          </nav>
        </div>

        <div
          className="relative overflow-hidden rounded-b-[60px] px-6 py-12 md:px-10"
          style={{ background: 'linear-gradient(110deg, #4b5d66 0%, #5d7078 55%, #3d4f58 100%)' }}
        >
          <span className="absolute top-[-80px] right-[-90px] h-[340px] w-[340px] rounded-full bg-[#0086c3]" />
          <span className="absolute right-[240px] bottom-[18px] h-[18px] w-[18px] rounded-full bg-[#0086c3]" />
          <div className="relative max-w-[560px]">
            <h1 className="text-[40px] leading-tight font-normal md:text-[46px]">TimeTool Support</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-white/90">
              Schnell, professionell und immer für Sie da – unser Support-Team steht Ihnen bei allen Fragen rund um Ihre TimeTool-Lösungen zur Seite.
            </p>
          </div>
        </div>

        <section className="mt-12 grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-[28px] font-semibold">Wie können wir Ihnen helfen?</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/90">
              Sind Sie die zentrale Ansprechperson, beispielsweise aus der HR-, IT- oder Personalabteilung, und benötigen Unterstützung zu Ihrer
              TimeTool-Lösung?
            </p>
          </div>
          <div className="text-[13.5px] leading-relaxed text-white/90 md:pt-14">
            <p>Unser fachkundiges Support-Team steht Ihnen während der Betriebszeiten zur Seite und hilft Ihnen gerne bei Ihren Anliegen.</p>
            <p className="mt-3">Klicken Sie am Ende der Seite auf den Button «Ticket erstellen» und erfassen Sie rasch und unkompliziert Ihre Support-Anfrage.</p>
            <p className="mt-6 font-semibold text-white">Unsere Telefonzeiten sind:</p>
            <p className="mt-2 font-semibold text-white">Montag bis Donnerstag</p>
            <p>09:00 – 11:00 Uhr und 14:00 – 16:00 Uhr</p>
            <p className="mt-2 font-semibold text-white">Freitag</p>
            <p>09:00 – 11:00 Uhr</p>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-[22px] font-normal">Wichtige Informationen für Ihre Support-Anfrage</h2>
          <p className="mt-3 max-w-[720px] text-[14px] leading-relaxed text-white/90">
            Damit wir Ihnen gezielt und effizient weiterhelfen können, bitten wir Sie, folgende Informationen/Regeln bei Ihrer Anfrage zu
            berücksichtigen. Diese Angaben helfen uns, Ihr Anliegen schnell zu verstehen und effizient zu bearbeiten.
          </p>
          <ol className="mt-8 max-w-[720px] space-y-6">
            {RULES.map(([title, text], i) => (
              <li key={title} className="flex items-start gap-5">
                <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[#8fdcff] text-[22px] text-[#36474f]">
                  {i + 1}
                </span>
                <div>
                  <div className="text-[15px] font-semibold">{title}</div>
                  <div className="mt-1 text-[13.5px] leading-relaxed text-white/85">{text}</div>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex items-center gap-2 text-[13px] text-white/85">
            <FileText size={16} /> Weitere Informationen zu TimeTool-Supportanfragen
          </div>
        </section>

        <section className="mt-10 pb-6">
          <label className="flex cursor-pointer items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={ok}
              onChange={(e) => {
                setOk(e.target.checked)
                setWarn(false)
              }}
            />
            Ich bestätige, dass ich die Regeln gelesen und verstanden habe.
            <PP kind="pain" ids={['PP02']} label="wird nur bestätigt" />
          </label>
          {warn ? <div className="mt-1 text-[12.5px] text-[#ffb3a7]">Bitte bestätigen Sie, dass Sie die Regeln gelesen haben.</div> : null}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => (ok ? onStart() : setWarn(true))}
              className="rounded-md bg-[#7fd3fb] px-14 py-2 text-[13px] text-[#1e2a30] hover:bg-[#9adcfc]"
            >
              Ticket erstellen
            </button>
            <PP kind="pain" ids={['PP01']} label="öffentlich, ohne Login" />
          </div>
          <DiffNote kind="pain" ids={['PP02', 'PP08']} className="mt-5 max-w-[640px]">
            Die Regeln werden nur per Checkbox bestätigt – das Formular fragt sie danach nicht strukturiert ab. In der Praxis werden sie oft ignoriert.
          </DiffNote>
        </section>
      </div>
      <footer className="mt-10 border-t border-white/10 py-8 pb-24 text-center text-[11.5px] text-[#6cc6f0]">Copyright © 2026 · TimeTool AG</footer>
    </div>
  )
}
