# TimeTool Ticketing – Demo-Plattform

Klickbare Mockups zur Abschlusspräsentation **«Neues Ticketing-System für den Kundensupport»**
(Projektarbeit CAS Requirements Engineering FS26 · Lerngruppe La Ultima Cerveza · Auftraggeberin TimeTool AG).

Die Startseite ist ein Auswahl-Hub. Jedes Mockup ist voll bedienbar (Tickets erfassen, bearbeiten, zuweisen,
eskalieren, lösen, bestätigen, wiedereröffnen …). Alle Namen, Kunden und Tickets sind fiktiv.

| Bereich | Route | Folie | Zeigt |
|---|---|---|---|
| Demo-Auswahl | `/` | – | Hub mit Drehbüchern, Pain-Point-Liste, Daten-Reset |
| **Ist** · Kontaktformular | `/ist/formular` | 2 (Sebi) | Öffentliches 3-Schritte-Formular, Freitext, keine Ticketnummer, simulierter Datenverlust |
| **Ist** · WISE Enterprise Portal | `/ist/wise` | 4 (Nicole · Livia) | Ticket #24482: Re-Open, Mail-Verlauf, CHF 180 manuell, Status für Buchhaltung, Shift Manager 39 s |
| **Soll** · Kundenportal | `/portal` | 10 / 14 (Rémy) | HR-Login, strukturierte Erfassung, SLA/Telefon-Hinweis, Eingangsbestätigung, Status & Verlauf, Lösung bestätigen |
| **Soll** · Agenten-Queue | `/desk` | 10 / 15 (Rémy) | Queues, SLA-Uhr, Zuweisung, Eskalation, @-Markierung, Zeiterfassung mit Tarif, Use Case 03, Reports, Leistungsdaten |
| Vergleich | `/vergleich` | – | 8 Szenarien Ist vs. Soll mit Direktlinks |
| Split-Screen | `/split?l=…&r=…` | – | Zwei Mockups nebeneinander (live synchron) |

**Unterschiede einblenden** (Schalter unten links in jedem Mockup): markiert Pain Points PP01–PP18 –
rot im Ist-System, grün dort, wo der Soll-Prozess sie löst.

Nützliche Deep-Links: `/portal?as=p-brunner` (Monika Brunner, Bühler AG), `/portal/ticket/TS-1033?as=p-keller`
(Lösung bestätigen), `/desk/ticket/TS-1034` (Sebi-Sport, Tarif CHF 180).

## Lokal starten

```bash
npm install
npm run dev
```

## Daten: Browser-lokal oder Supabase

- **Ohne Konfiguration** speichert die Demo alles im `localStorage` des Browsers. Alle Tabs und der
  Split-Screen im selben Browser sind live synchron. «Demo-Daten zurücksetzen» auf der Startseite.
- **Mit Supabase** teilen alle Geräte dieselben Daten live (z. B. Publikum erfasst ein Ticket am Handy,
  es erscheint sofort in der Queue auf dem Beamer):
  1. Supabase-Projekt anlegen → SQL Editor → Inhalt von [`supabase/schema.sql`](supabase/schema.sql) ausführen.
  2. In Vercel (oder `.env.local`) setzen:
     `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY`
     (die Vercel-Supabase-Integration mit `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` funktioniert ebenfalls).
  3. Neu deployen. Die Startseite zeigt «Modus: Supabase».

> Die Tabelle ist bewusst für den öffentlichen anon-Key beschreibbar – nur für fiktive Demo-Daten verwenden.

## Deployment auf Vercel

Repository in Vercel importieren – Framework «Vite» wird automatisch erkannt
(Build `npm run build`, Output `dist`). `vercel.json` leitet alle Routen auf die SPA um.

## Technik

Vite · React 19 · TypeScript · Tailwind CSS 4 · React Router · optional `@supabase/supabase-js`.
Datenmodell und Geschäftslogik: `src/lib/` (Typen, Stammdaten, SLA-Berechnung, Aktionen, Seed-Daten).
