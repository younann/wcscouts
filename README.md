# WC Scouts — World Cup 2026 Prediction App

Mobile-first web app for a scouts group to predict World Cup matches, earn points, and compete on a colourful leaderboard.

Built with **Next.js 15 + Supabase + Tailwind**. Free to host (Vercel + Supabase free tiers).

---

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to https://supabase.com and create a free project.
2. From **Settings → API**, copy:
   - `Project URL`
   - `anon` public key
   - `service_role` secret key

### 3. Create `.env.local`

Copy `.env.local.example` to `.env.local` and fill it in:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

The service-role key is **server-only**. Never commit it.

### 4. Run the SQL migrations

In Supabase, open **SQL Editor** and run, in order:

1. `supabase/migrations/001_schema.sql` — tables, triggers
2. `supabase/migrations/002_rls.sql` — Row-Level Security policies
3. `supabase/migrations/003_functions.sql` — `score_match` + `leaderboard` view
4. `supabase/migrations/004_seed_teams.sql` — 48 WC 2026 teams (EN + AR)
5. `supabase/migrations/005_seed_matches.sql` — group stage fixtures (72 matches)
6. `supabase/migrations/006_team_aliases.sql` — TheSportsDB name → team-code map (for auto-sync)
7. `supabase/migrations/007_scoring_refactor.sql` — splits scoring into admin & internal helpers
8. `supabase/migrations/008_sync_results_function.sql` — `sync_match_results()` reading the latest pg_net cached response
9. `supabase/migrations/009_pg_cron.sql` — schedules the sync every 15 min
10. `supabase/migrations/010_seed_knockouts.sql` — 32 knockout slots (teams TBD)

> **Before running 009**, enable two extensions in Supabase Dashboard → Database → Extensions:
> - `pg_net` — async HTTP from Postgres (used by the sync function)
> - `pg_cron` — scheduler
>
> Both are on the free tier. Then run `009_pg_cron.sql`.

> The seeded fixtures are **placeholders**. Adjust them to the actual WC 2026 draw and kickoff times via **Admin → Matches** (or directly in SQL).

### 5. Create the admin user

1. In Supabase Dashboard → **Authentication → Add user**, create your account using
   an email like `admin@wcscouts.local` and a password of your choice.
2. Open SQL Editor, edit `supabase/scripts/promote_admin.sql` with your email, and run it.
3. You will sign into the app using just the prefix `admin` and your password.

### 6. Run locally

```bash
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`.

---

## How it works

### Users
- Created by the admin via **Admin → Users** (no public sign-up).
- Sign in with **username** (case-insensitive). Internally a synthetic email `<username>@wcscouts.local` is used so Supabase Auth is happy.
- Password reset is admin-driven — no email setup needed.

### Predictions
- Each user submits a final score (+/− steppers).
- For knockout matches, also pick a qualifier (who advances).
- Once `kickoff_at` has passed, the prediction is **locked** — enforced both in RLS and in the API.

### Scoring (configurable in Admin → Scoring)
| Outcome | Default points |
|---|---|
| Exact score (e.g. 2-1 → 2-1) | **5** |
| Correct outcome + correct goal difference | **3 + 2 = 5** |
| Correct outcome only (winner / draw) | **3** |
| Knockout: correct qualifier (additive) | **+3** |

**Auto-sync** (optional): if you enabled `http` + `pg_cron` and ran migration 008, results are pulled from **TheSportsDB** every 15 minutes. Finished WC 2026 matches are matched by team codes + kickoff date, scored automatically, and the leaderboard updates. The admin can also click **Sync from TheSportsDB** on `/admin/matches` for an instant manual sync.

To monitor the cron:
```sql
select * from cron.job;
select * from cron.job_run_details order by start_time desc limit 20;
```

**Manual entry** still works any time. Admin enters the result for a match, then clicks **Lock & score**. The Postgres function `score_match(match_id)` runs and:
- Awards `points_awarded` to every prediction for that match.
- Recomputes `profiles.total_points` for affected users.
- Marks the match `finished`.

### Leaderboard
A SQL view ranks users by `total_points desc, created_at asc`. Top 3 get a podium with gold/silver/bronze trophies. The current user's row is highlighted.

### Admin
- **Dashboard:** quick stats
- **Matches:** edit fixtures, enter results, trigger scoring
- **Users:** create users, reset passwords, list all
- **Scoring:** edit the 4 point values
- **Winners:** pick 1st / 2nd / 3rd manually (defaults to leaderboard order)
- **Export:** download leaderboard / predictions / matches CSV

### Languages
English + Arabic (RTL). Toggle from the top-right globe icon — choice is stored in a cookie. Add more languages by extending `src/lib/i18n/dictionaries.ts`.

---

## Deploy to Vercel

1. Push this folder to a Git repo.
2. Import the repo at https://vercel.com → New Project.
3. Add the three env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
4. Deploy. Vercel auto-detects Next.js.

In Supabase → **Authentication → URL configuration**, add your Vercel domain to **Site URL**.

---

## Tech stack

| Concern | Tool |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Styling | Tailwind CSS 3 |
| Components | shadcn-style local components + lucide-react icons |
| Animation | framer-motion |
| Auth + DB | Supabase (Postgres + Auth + RLS) |
| Hosting | Vercel (free tier) |

---

## Security highlights

- **RLS** is enforced on every table — even if the client lies, the database refuses unauthorized reads/writes.
- Predictions can only be written while `match.kickoff_at > now()` (checked both in RLS and API).
- Other users' predictions become readable only after a match has kicked off.
- Admin-only routes are gated in `middleware.ts` and re-checked in every admin API route.
- Service-role key only used on the server in `createServiceClient()`.

---

## What's deliberately out of MVP

- Email/SMS notifications and password reset by email
- Hebrew translation
- Live in-app chat / comments
- Mini-leagues / multiple groups
- PWA install banner (manifest is wired but not customised)

These can ship after the tournament.

---

## File map

```
src/
├─ app/
│  ├─ layout.tsx               # root layout, locale + dir
│  ├─ page.tsx                 # redirect → /home
│  ├─ login/                   # /login (public)
│  ├─ (app)/                   # authed user shell + bottom nav
│  │  ├─ home/ matches/ leaderboard/ profile/ predictions/
│  ├─ admin/                   # admin shell (middleware-guarded)
│  │  └─ matches/ users/ scoring/ winners/ export/
│  └─ api/
│     ├─ predictions/          # POST submit/upsert
│     └─ admin/                # match results, scoring rpc, user mgmt, winners, csv
├─ components/                 # shared UI (MatchCard, Podium, Stepper, …)
├─ lib/
│  ├─ supabase/                # client.ts, server.ts, middleware.ts
│  ├─ i18n/                    # dictionaries.ts, server.ts
│  └─ utils.ts
└─ types/database.ts

supabase/
├─ migrations/  (001…005)
└─ scripts/promote_admin.sql

middleware.ts                  # session refresh + route guards
```
