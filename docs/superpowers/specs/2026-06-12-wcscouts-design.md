# WC Scouts — World Cup 2026 Prediction App — Design

**Date:** 2026-06-12
**Status:** Approved by user, in implementation

## Goal
Mobile-first web app for a scouts group to predict World Cup 2026 match results, score points, and compete on a leaderboard. Urgent MVP timeline (this week, mid-tournament).

## Stack
- **Frontend:** Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn-style components, framer-motion
- **Backend:** Supabase (Postgres + Auth + RLS) — free tier
- **Hosting:** Vercel free tier
- **i18n:** next-intl with EN + AR (RTL switching)

## Data Model
```
profiles(id, full_name, group_name, total_points, role, winner_place, username)
teams(code PK, name_en, name_ar, flag_emoji)
matches(id, stage, group_letter, home_team, away_team, kickoff_at, home_score, away_score, qualifier_team, status)
predictions(id, user_id, match_id, home_score, away_score, qualifier_pick, points_awarded, locked_at)
scoring_rules(key PK, value)
```

## Scoring (config-driven)
- Exact score: 5 pts (terminal — does not stack)
- Else correct outcome + correct goal difference: 3 + 2 = 5 pts
- Else correct outcome only: 3 pts
- Plus knockout correct qualifier: +3 pts (additive, separate dimension)

Computed by Postgres function `score_match(match_id)` triggered on result entry.

## Security
- Supabase RLS on all tables.
- Predictions write: only `auth.uid() = user_id` AND `match.kickoff_at > now()`.
- Other users' predictions visible only after kickoff.
- Admin role required for writes to matches/scoring_rules/profiles.
- Server-side double-check in API routes.

## Pages
**User:** `/login`, `/` (home), `/matches`, `/matches/[id]`, `/leaderboard`, `/profile`, `/predictions`
**Admin:** `/admin`, `/admin/matches`, `/admin/users`, `/admin/scoring`, `/admin/export`, `/admin/winners`

## Mobile UX
- Sticky bottom nav (Home / Matches / Leaderboard / Profile)
- Score steppers (+/− buttons, not text inputs) on prediction form
- Large tap targets (44px min)
- Green/red/gold gradient theme, framer-motion confetti for podium

## Out of MVP
- Email password reset (admin resets manually)
- Push/email notifications
- Hebrew language
- Social features

## Admin bootstrap
SQL script `supabase/scripts/create_admin.sql` to promote a user to admin role after they're created in Supabase Auth dashboard.
