-- TimeTool Ticketing – Demo-Plattform
-- Einmalig im Supabase SQL Editor ausführen (Project → SQL Editor → New query → Run).
--
-- Alle Demo-Daten liegen generisch in EINER Tabelle ({id, kind, data}).
-- Die App legt die Beispieldaten beim ersten Aufruf selbst an.
--
-- ACHTUNG: Die Policies erlauben dem öffentlichen anon-Key Lesen UND Schreiben.
-- Das ist für eine Präsentations-Demo mit fiktiven Daten gewollt – keine echten
-- Kundendaten in dieser Datenbank speichern.

create table if not exists public.demo_records (
  id          text primary key,
  kind        text not null,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

create index if not exists demo_records_kind_idx on public.demo_records (kind);

alter table public.demo_records enable row level security;

drop policy if exists "demo read"   on public.demo_records;
drop policy if exists "demo insert" on public.demo_records;
drop policy if exists "demo update" on public.demo_records;
drop policy if exists "demo delete" on public.demo_records;

create policy "demo read"   on public.demo_records for select using (true);
create policy "demo insert" on public.demo_records for insert with check (true);
create policy "demo update" on public.demo_records for update using (true) with check (true);
create policy "demo delete" on public.demo_records for delete using (true);

-- Live-Aktualisierung (Realtime) für alle Geräte
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'demo_records'
  ) then
    alter publication supabase_realtime add table public.demo_records;
  end if;
end $$;
