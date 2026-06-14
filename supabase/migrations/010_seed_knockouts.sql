-- 32 knockout-stage match slots for WC 2026.
-- Teams are left NULL — admin sets them as groups finish (or TheSportsDB sync
-- can fill them once it knows the bracket). Dates approximate FIFA's published
-- WC 2026 schedule. Admin can tweak times in /admin/matches once confirmed.
--
-- Safe to re-run: the unique-ish guard on (stage, kickoff_at, '__placeholder__')
-- isn't enforced; if you run this twice you'll get duplicates. Run once.

-- Round of 32 — 16 matches, 27 June → 3 July
insert into public.matches (stage, home_team, away_team, kickoff_at) values
  ('r32', null, null, '2026-06-27 16:00+00'),
  ('r32', null, null, '2026-06-27 20:00+00'),
  ('r32', null, null, '2026-06-28 16:00+00'),
  ('r32', null, null, '2026-06-28 20:00+00'),
  ('r32', null, null, '2026-06-29 16:00+00'),
  ('r32', null, null, '2026-06-29 20:00+00'),
  ('r32', null, null, '2026-06-30 16:00+00'),
  ('r32', null, null, '2026-06-30 20:00+00'),
  ('r32', null, null, '2026-07-01 16:00+00'),
  ('r32', null, null, '2026-07-01 20:00+00'),
  ('r32', null, null, '2026-07-02 18:00+00'),
  ('r32', null, null, '2026-07-02 22:00+00'),
  ('r32', null, null, '2026-07-03 16:00+00'),
  ('r32', null, null, '2026-07-03 18:00+00'),
  ('r32', null, null, '2026-07-03 20:00+00'),
  ('r32', null, null, '2026-07-03 22:00+00');

-- Round of 16 — 8 matches, 4 → 7 July
insert into public.matches (stage, home_team, away_team, kickoff_at) values
  ('r16', null, null, '2026-07-04 18:00+00'),
  ('r16', null, null, '2026-07-04 22:00+00'),
  ('r16', null, null, '2026-07-05 18:00+00'),
  ('r16', null, null, '2026-07-05 22:00+00'),
  ('r16', null, null, '2026-07-06 18:00+00'),
  ('r16', null, null, '2026-07-06 22:00+00'),
  ('r16', null, null, '2026-07-07 18:00+00'),
  ('r16', null, null, '2026-07-07 22:00+00');

-- Quarterfinals — 4 matches, 9 → 11 July
insert into public.matches (stage, home_team, away_team, kickoff_at) values
  ('qf', null, null, '2026-07-09 18:00+00'),
  ('qf', null, null, '2026-07-09 22:00+00'),
  ('qf', null, null, '2026-07-10 22:00+00'),
  ('qf', null, null, '2026-07-11 22:00+00');

-- Semifinals — 2 matches, 14 + 15 July
insert into public.matches (stage, home_team, away_team, kickoff_at) values
  ('sf', null, null, '2026-07-14 22:00+00'),
  ('sf', null, null, '2026-07-15 22:00+00');

-- Third-place playoff — 18 July
insert into public.matches (stage, home_team, away_team, kickoff_at) values
  ('3rd', null, null, '2026-07-18 18:00+00');

-- Final — 19 July
insert into public.matches (stage, home_team, away_team, kickoff_at) values
  ('final', null, null, '2026-07-19 19:00+00');
