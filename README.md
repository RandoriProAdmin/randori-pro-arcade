# RANDORI PRO Arcade

Eine Sammlung von 4 Kampfsport-Minispielen im RANDORI PRO Corporate Design.
Built mit React + Vite + TypeScript + Tailwind, Backend via Supabase.

## Spiele

| Slug              | Titel             | Inspiriert von |
| ----------------- | ----------------- | -------------- |
| `snake`           | Gürtelschlange    | Snake          |
| `tetris`          | Kata Blocks       | Tetris         |
| `sudoku`          | Dojo Sudoku       | Sudoku         |
| `space-invaders`  | Dojo Defenders    | Space Invaders |

## Setup

```bash
# 1. Dependencies
npm install

# 2. Environment
cp .env.example .env
# danach Supabase URL + Anon Key eintragen

# 3. Dev-Server
npm run dev
```

## Supabase

1. Neues Projekt auf [supabase.com](https://supabase.com) anlegen.
2. Project URL + Anon Key in `.env` eintragen (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
3. SQL aus `supabase/migrations/001_initial_schema.sql` im Supabase SQL-Editor ausführen
   (oder via `npx supabase db push`, sobald die Supabase CLI verbunden ist).

Ohne Supabase-Konfiguration läuft die App im **Gast-Modus** — Spiele funktionieren,
aber Highscores werden nicht gespeichert.

## Deployment (empfohlen: Vercel)

1. Repo auf GitHub pushen.
2. Auf [vercel.com](https://vercel.com) Projekt mit dem Repo verbinden.
3. Environment Variables setzen: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. Build-Befehl: `npm run build`, Output: `dist/`.

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 3.4
- **Routing:** react-router-dom
- **Backend:** Supabase (Auth, Postgres, RLS)
- **Hosting:** Vercel (oder Netlify / Cloudflare Pages)

## Projektstruktur

```
src/
├── components/   Layout, GameCard, Leaderboard, Modals
├── games/        4 Spiele (Snake, Tetris, Sudoku, Space Invaders)
├── pages/        Home, GamePage, LeaderboardPage
├── lib/          Supabase-Client, Auth-Helper
├── hooks/        useAuth
├── types/        Shared TypeScript Types
└── styles/       Theme-Konstanten
supabase/
└── migrations/   SQL-Migrationen
```

## Stand

**Phase 1 — Scaffold + Design-System:** ✅
- Vite + React + TS + Tailwind
- RANDORI PRO Farben + Typografie
- Layout, Navbar, Footer
- Home, GamePage, LeaderboardPage
- Supabase-Client, Auth-Hook, Migrations-SQL

**Phase 2 — Spiele-Implementierung:** ⏳
1. Gürtelschlange (Snake)
2. Kata Blocks (Tetris)
3. Dojo Sudoku
4. Dojo Defenders (Space Invaders)

**Phase 3 — Auth, Leaderboard, Mobile-Polish, Deploy.**

## Lizenz

© 2026 RANDORI PRO Kampfsportschulen. Alle Rechte vorbehalten.
