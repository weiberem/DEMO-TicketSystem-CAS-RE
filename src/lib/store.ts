import { useMemo, useSyncExternalStore } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Kind, Rec } from './types'
import { buildSeed } from './seed'

// ---------------------------------------------------------------------------
// Persistenz: Browser (localStorage) oder Supabase (geteilt, live).
// Alle Daten liegen als generische Datensätze {id, kind, data} vor. So bleibt der
// Supabase-Teil auf eine einzige Tabelle beschränkt (siehe supabase/schema.sql).
// ---------------------------------------------------------------------------

type Change = { type: 'put'; rec: Rec } | { type: 'remove'; id: string } | { type: 'reload' }

interface Backend {
  mode: 'local' | 'supabase'
  loadAll(): Promise<Rec[]>
  put(recs: Rec[]): Promise<void>
  insert(rec: Rec): Promise<boolean> // false bei Konflikt (ID existiert)
  clear(): Promise<void>
  subscribe(cb: (c: Change) => void): () => void
}

const LS_KEY = 'tt-demo:data:v1'

class LocalBackend implements Backend {
  mode = 'local' as const
  private read(): Record<string, Rec> {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || '{}')
    } catch {
      return {}
    }
  }
  private write(all: Record<string, Rec>) {
    localStorage.setItem(LS_KEY, JSON.stringify(all))
  }
  async loadAll() {
    return Object.values(this.read())
  }
  async put(recs: Rec[]) {
    const all = this.read()
    for (const r of recs) all[r.id] = r
    this.write(all)
  }
  async insert(rec: Rec) {
    const all = this.read()
    if (all[rec.id]) return false
    all[rec.id] = rec
    this.write(all)
    return true
  }
  async clear() {
    localStorage.removeItem(LS_KEY)
  }
  subscribe(cb: (c: Change) => void) {
    // Andere Tabs / iFrames (Split-Screen) erhalten ein storage-Event.
    const h = (e: StorageEvent) => {
      if (e.key === LS_KEY || e.key === null) cb({ type: 'reload' })
    }
    window.addEventListener('storage', h)
    return () => window.removeEventListener('storage', h)
  }
}

const TABLE = 'demo_records'

class SupabaseBackend implements Backend {
  mode = 'supabase' as const
  private sb: SupabaseClient
  constructor(url: string, key: string) {
    this.sb = createClient(url, key, { auth: { persistSession: false } })
  }
  async loadAll() {
    const out: Rec[] = []
    const page = 1000
    for (let from = 0; ; from += page) {
      const { data, error } = await this.sb.from(TABLE).select('id,kind,data,updated_at').range(from, from + page - 1)
      if (error) throw error
      out.push(...((data as Rec[]) ?? []))
      if (!data || data.length < page) break
    }
    return out
  }
  async put(recs: Rec[]) {
    if (!recs.length) return
    const rows = recs.map((r) => ({ id: r.id, kind: r.kind, data: r.data, updated_at: new Date().toISOString() }))
    const { error } = await this.sb.from(TABLE).upsert(rows)
    if (error) console.error('Supabase upsert', error)
  }
  async insert(rec: Rec) {
    const { error } = await this.sb.from(TABLE).insert({ id: rec.id, kind: rec.kind, data: rec.data })
    if (error) {
      if (error.code === '23505') return false
      console.error('Supabase insert', error)
    }
    return true
  }
  async clear() {
    const { error } = await this.sb.from(TABLE).delete().neq('id', '')
    if (error) console.error('Supabase delete', error)
  }
  subscribe(cb: (c: Change) => void) {
    const ch = this.sb
      .channel('demo-records')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (p) => {
        if (p.eventType === 'DELETE') cb({ type: 'remove', id: (p.old as { id: string }).id })
        else cb({ type: 'put', rec: p.new as Rec })
      })
      .subscribe()
    return () => {
      void this.sb.removeChannel(ch)
    }
  }
}

const SB_URL = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL) as string | undefined
const SB_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) as string | undefined

class Store {
  private recs = new Map<string, Rec>()
  private listeners = new Set<() => void>()
  private newRecListeners = new Set<(r: Rec) => void>()
  version = 0
  ready = false
  error: string | null = null
  backend: Backend = SB_URL && SB_KEY ? new SupabaseBackend(SB_URL, SB_KEY) : new LocalBackend()

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }
  getVersion = () => this.version

  /** Wird aufgerufen, wenn ein Datensatz neu auftaucht (lokal oder von einem anderen Gerät). */
  onNewRecord(fn: (r: Rec) => void): () => void {
    this.newRecListeners.add(fn)
    return () => {
      this.newRecListeners.delete(fn)
    }
  }

  private emit() {
    this.version++
    this.listeners.forEach((l) => l())
  }

  private replaceAll(list: Rec[], announce = false) {
    const before = this.recs
    this.recs = new Map(list.map((r) => [r.id, r]))
    if (announce) for (const r of list) if (!before.has(r.id)) this.newRecListeners.forEach((l) => l(r))
    this.emit()
  }

  async init() {
    try {
      let all = await this.backend.loadAll()
      if (!all.some((r) => r.kind === 'meta')) {
        all = buildSeed()
        await this.backend.put(all)
      }
      this.replaceAll(all)
      this.backend.subscribe(async (c) => {
        if (c.type === 'reload') {
          this.replaceAll(await this.backend.loadAll(), true)
        } else if (c.type === 'remove') {
          if (this.recs.delete(c.id)) this.emit()
        } else {
          const isNew = !this.recs.has(c.rec.id)
          this.recs.set(c.rec.id, c.rec)
          if (isNew) this.newRecListeners.forEach((l) => l(c.rec))
          this.emit()
        }
      })
    } catch (e) {
      console.error(e)
      this.error = e instanceof Error ? e.message : String(e)
      // Fallback: lokale Daten, damit die Demo trotzdem läuft
      this.backend = new LocalBackend()
      let all = await this.backend.loadAll()
      if (!all.some((r) => r.kind === 'meta')) {
        all = buildSeed()
        await this.backend.put(all)
      }
      this.replaceAll(all)
    }
    this.ready = true
    this.emit()
  }

  all<T>(kind: Kind): T[] {
    const out: T[] = []
    for (const r of this.recs.values()) if (r.kind === kind) out.push(r.data as T)
    return out
  }

  get<T>(id: string): T | undefined {
    return this.recs.get(id)?.data as T | undefined
  }

  put(kind: Kind, id: string, data: unknown) {
    this.putMany([{ id, kind, data }])
  }

  putMany(recs: Rec[]) {
    for (const r of recs) this.recs.set(r.id, r)
    this.emit()
    void this.backend.put(recs)
  }

  /** Legt einen Datensatz nur an, wenn die ID noch frei ist (Ticketnummern). */
  async insertUnique(rec: Rec): Promise<boolean> {
    if (this.recs.has(rec.id)) return false
    const ok = await this.backend.insert(rec)
    if (!ok) return false
    this.recs.set(rec.id, rec)
    this.emit()
    return true
  }

  async reset() {
    await this.backend.clear()
    const seed = buildSeed()
    await this.backend.put(seed)
    this.replaceAll(seed)
  }
}

export const store = new Store()

export function useStoreVersion() {
  return useSyncExternalStore(store.subscribe, store.getVersion)
}

/** Selektor-Hook: wird bei jeder Datenänderung neu berechnet. */
export function useData<T>(fn: () => T, deps: unknown[] = []): T {
  const v = useStoreVersion()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(fn, [v, ...deps])
}

// ---------------------------------------------------------------------------
// Lokale Einstellungen pro Browser (nicht geteilt): aktive Rolle, Anmerkungen …
// ---------------------------------------------------------------------------

const prefListeners = new Set<() => void>()
const prefCache = new Map<string, string | null>()

function readPref(key: string): string | null {
  if (!prefCache.has(key)) {
    try {
      prefCache.set(key, localStorage.getItem('tt-demo:pref:' + key))
    } catch {
      prefCache.set(key, null)
    }
  }
  return prefCache.get(key) ?? null
}

export function setPref(key: string, value: string | null) {
  prefCache.set(key, value)
  try {
    if (value === null) localStorage.removeItem('tt-demo:pref:' + key)
    else localStorage.setItem('tt-demo:pref:' + key, value)
  } catch {
    /* ignorieren */
  }
  prefListeners.forEach((l) => l())
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key?.startsWith('tt-demo:pref:')) {
      prefCache.delete(e.key.slice('tt-demo:pref:'.length))
      prefListeners.forEach((l) => l())
    }
  })
}

export function usePref(key: string, fallback: string): [string, (v: string | null) => void] {
  const val = useSyncExternalStore(
    (fn) => {
      prefListeners.add(fn)
      return () => prefListeners.delete(fn)
    },
    () => readPref(key),
  )
  return [val ?? fallback, (v) => setPref(key, v)]
}
