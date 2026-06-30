-- Backfill the 12 Round-of-32 matches that still have NULL teams (ids 149..160).
-- Matches 145,146,147,148 already have teams set, so they are left untouched.
--
-- IMPORTANT — verify the schedule before running:
-- The pairing -> match-id assignment below follows the supplied bracket order.
-- Each match keeps its EXISTING kickoff_at. Any row whose kickoff_at is already
-- in the past cannot be predicted by users. If a pairing should play on a
-- different date, adjust kickoff_at here (or in Admin -> Matches) — it does NOT
-- affect the bracket wiring in migration 015.
--
--   id  | kickoff (existing)      | pairing
--   ----+-------------------------+------------------------
--   149 | 2026-06-29 16:00+00     | France      vs Sweden
--   150 | 2026-06-29 20:00+00     | Ivory Coast vs Norway
--   151 | 2026-06-30 16:00+00     | Mexico      vs Ecuador
--   152 | 2026-06-30 20:00+00     | England     vs DR Congo
--   153 | 2026-07-01 16:00+00     | USA         vs Bosnia & Herzegovina
--   154 | 2026-07-01 20:00+00     | Belgium     vs Senegal
--   155 | 2026-07-02 18:00+00     | Portugal    vs Croatia
--   156 | 2026-07-02 22:00+00     | Spain       vs Austria
--   157 | 2026-07-03 16:00+00     | Switzerland vs Algeria
--   158 | 2026-07-03 18:00+00     | Argentina   vs Cape Verde
--   159 | 2026-07-03 20:00+00     | Colombia    vs Ghana
--   160 | 2026-07-03 22:00+00     | Australia   vs Egypt

update public.matches set home_team = 'FRA', away_team = 'SWE' where id = 149 and home_team is null;
update public.matches set home_team = 'CIV', away_team = 'NOR' where id = 150 and home_team is null;
update public.matches set home_team = 'MEX', away_team = 'ECU' where id = 151 and home_team is null;
update public.matches set home_team = 'ENG', away_team = 'COD' where id = 152 and home_team is null;
update public.matches set home_team = 'USA', away_team = 'BIH' where id = 153 and home_team is null;
update public.matches set home_team = 'BEL', away_team = 'SEN' where id = 154 and home_team is null;
update public.matches set home_team = 'POR', away_team = 'CRO' where id = 155 and home_team is null;
update public.matches set home_team = 'ESP', away_team = 'AUT' where id = 156 and home_team is null;
update public.matches set home_team = 'SUI', away_team = 'ALG' where id = 157 and home_team is null;
update public.matches set home_team = 'ARG', away_team = 'CPV' where id = 158 and home_team is null;
update public.matches set home_team = 'COL', away_team = 'GHA' where id = 159 and home_team is null;
update public.matches set home_team = 'AUS', away_team = 'EGY' where id = 160 and home_team is null;
