import type { Ticket } from './types'

const MIN = 60_000
const HOUR = 60 * MIN

/** Addiert Arbeitstage (Mo–Fr) – vereinfachtes Modell für den Prototyp. */
export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from)
  let left = days
  while (left > 0) {
    d.setDate(d.getDate() + 1)
    const wd = d.getDay()
    if (wd !== 0 && wd !== 6) left--
  }
  return d
}

export function firstResponseDue(t: Pick<Ticket, 'priority' | 'createdAt'>): Date | null {
  const created = new Date(t.createdAt)
  if (t.priority === 'hoch') return new Date(created.getTime() + 2 * HOUR)
  if (t.priority === 'mittel') return addBusinessDays(created, 1)
  return null
}

export function formatDuration(ms: number): string {
  const abs = Math.abs(ms)
  const days = Math.floor(abs / (24 * HOUR))
  const hours = Math.floor((abs % (24 * HOUR)) / HOUR)
  const mins = Math.floor((abs % HOUR) / MIN)
  if (days > 0) return `${days} Tag${days > 1 ? 'e' : ''}${hours ? ` ${hours} Std` : ''}`
  if (hours > 0) return `${hours} Std${mins ? ` ${mins} Min` : ''}`
  return `${Math.max(mins, 1)} Min`
}

export type SlaKind = 'met' | 'late' | 'breached' | 'soon' | 'running' | 'besteffort' | 'paused'

export interface SlaState {
  kind: SlaKind
  label: string
  color: string
  due: Date | null
}

export function slaState(t: Ticket, now = Date.now()): SlaState {
  const due = firstResponseDue(t)
  if (!due) return { kind: 'besteffort', label: 'Best Effort', color: '#36B37E', due }
  if (t.firstResponseAt) {
    const ok = new Date(t.firstResponseAt).getTime() <= due.getTime()
    return ok
      ? { kind: 'met', label: 'erfüllt ✓', color: '#36B37E', due }
      : { kind: 'late', label: 'verspätet beantwortet', color: '#DE350B', due }
  }
  if (t.status === 'geschlossen' || t.status === 'geloest') return { kind: 'paused', label: '—', color: '#6B778C', due }
  const rest = due.getTime() - now
  if (rest < 0) return { kind: 'breached', label: `überschritten · −${formatDuration(rest)}`, color: '#DE350B', due }
  if (rest < 60 * MIN) return { kind: 'soon', label: `in ${formatDuration(rest)}`, color: '#FF8B00', due }
  if (rest < 2 * HOUR && t.priority === 'hoch') return { kind: 'soon', label: `in ${formatDuration(rest)}`, color: '#FF8B00', due }
  return { kind: 'running', label: `in ${formatDuration(rest)}`, color: '#36B37E', due }
}

export function fmtDateTime(iso?: string): string {
  if (!iso) return '–'
  const d = new Date(iso)
  return d.toLocaleString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function fmtDate(iso?: string): string {
  if (!iso) return '–'
  return new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function fmtRelative(iso: string, now = Date.now()): string {
  const diff = now - new Date(iso).getTime()
  if (diff < MIN) return 'gerade eben'
  if (diff < HOUR) return `vor ${Math.floor(diff / MIN)} Min`
  if (diff < 24 * HOUR) return `vor ${Math.floor(diff / HOUR)} Std`
  const days = Math.floor(diff / (24 * HOUR))
  if (days < 14) return `vor ${days} Tag${days > 1 ? 'en' : ''}`
  return fmtDate(iso)
}

export function fmtHours(minutes: number): string {
  const h = minutes / 60
  return `${h.toLocaleString('de-CH', { maximumFractionDigits: 2 })} h`
}
