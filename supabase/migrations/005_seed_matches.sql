-- Seed: World Cup 2026 group stage sample fixtures.
-- These are PLACEHOLDER fixtures matching the WC 2026 format (12 groups of 4).
-- The admin should edit kickoff times and adjust matchups to the real draw.
-- Note: the World Cup 2026 has 104 matches total. For brevity this seed creates
-- the group stage skeleton (72 matches). Admin can add knockout matches later.

-- Group A
insert into public.matches (stage, group_letter, home_team, away_team, kickoff_at) values
  ('group', 'A', 'MEX', 'ARG', '2026-06-11 20:00+00'),
  ('group', 'A', 'CAN', 'BRA', '2026-06-12 20:00+00'),
  ('group', 'A', 'MEX', 'CAN', '2026-06-17 20:00+00'),
  ('group', 'A', 'ARG', 'BRA', '2026-06-18 20:00+00'),
  ('group', 'A', 'MEX', 'BRA', '2026-06-24 20:00+00'),
  ('group', 'A', 'ARG', 'CAN', '2026-06-24 23:00+00');

-- Group B
insert into public.matches (stage, group_letter, home_team, away_team, kickoff_at) values
  ('group', 'B', 'USA', 'FRA', '2026-06-13 20:00+00'),
  ('group', 'B', 'ENG', 'GER', '2026-06-13 23:00+00'),
  ('group', 'B', 'USA', 'ENG', '2026-06-19 20:00+00'),
  ('group', 'B', 'FRA', 'GER', '2026-06-19 23:00+00'),
  ('group', 'B', 'USA', 'GER', '2026-06-25 20:00+00'),
  ('group', 'B', 'FRA', 'ENG', '2026-06-25 23:00+00');

-- Group C
insert into public.matches (stage, group_letter, home_team, away_team, kickoff_at) values
  ('group', 'C', 'ESP', 'POR', '2026-06-14 20:00+00'),
  ('group', 'C', 'NED', 'BEL', '2026-06-14 23:00+00'),
  ('group', 'C', 'ESP', 'NED', '2026-06-20 20:00+00'),
  ('group', 'C', 'POR', 'BEL', '2026-06-20 23:00+00'),
  ('group', 'C', 'ESP', 'BEL', '2026-06-26 20:00+00'),
  ('group', 'C', 'POR', 'NED', '2026-06-26 23:00+00');

-- Group D
insert into public.matches (stage, group_letter, home_team, away_team, kickoff_at) values
  ('group', 'D', 'ITA', 'CRO', '2026-06-15 20:00+00'),
  ('group', 'D', 'DEN', 'SUI', '2026-06-15 23:00+00'),
  ('group', 'D', 'ITA', 'DEN', '2026-06-21 20:00+00'),
  ('group', 'D', 'CRO', 'SUI', '2026-06-21 23:00+00'),
  ('group', 'D', 'ITA', 'SUI', '2026-06-27 20:00+00'),
  ('group', 'D', 'CRO', 'DEN', '2026-06-27 23:00+00');

-- Group E
insert into public.matches (stage, group_letter, home_team, away_team, kickoff_at) values
  ('group', 'E', 'URU', 'COL', '2026-06-16 20:00+00'),
  ('group', 'E', 'ECU', 'PAR', '2026-06-16 23:00+00'),
  ('group', 'E', 'URU', 'ECU', '2026-06-22 20:00+00'),
  ('group', 'E', 'COL', 'PAR', '2026-06-22 23:00+00'),
  ('group', 'E', 'URU', 'PAR', '2026-06-28 20:00+00'),
  ('group', 'E', 'COL', 'ECU', '2026-06-28 23:00+00');

-- Group F
insert into public.matches (stage, group_letter, home_team, away_team, kickoff_at) values
  ('group', 'F', 'MAR', 'SEN', '2026-06-17 17:00+00'),
  ('group', 'F', 'TUN', 'EGY', '2026-06-17 23:00+00'),
  ('group', 'F', 'MAR', 'TUN', '2026-06-23 20:00+00'),
  ('group', 'F', 'SEN', 'EGY', '2026-06-23 23:00+00'),
  ('group', 'F', 'MAR', 'EGY', '2026-06-29 20:00+00'),
  ('group', 'F', 'SEN', 'TUN', '2026-06-29 23:00+00');

-- Group G
insert into public.matches (stage, group_letter, home_team, away_team, kickoff_at) values
  ('group', 'G', 'JPN', 'KOR', '2026-06-18 12:00+00'),
  ('group', 'G', 'IRN', 'AUS', '2026-06-18 17:00+00'),
  ('group', 'G', 'JPN', 'IRN', '2026-06-24 12:00+00'),
  ('group', 'G', 'KOR', 'AUS', '2026-06-24 15:00+00'),
  ('group', 'G', 'JPN', 'AUS', '2026-06-30 15:00+00'),
  ('group', 'G', 'KOR', 'IRN', '2026-06-30 18:00+00');

-- Group H
insert into public.matches (stage, group_letter, home_team, away_team, kickoff_at) values
  ('group', 'H', 'KSA', 'QAT', '2026-06-19 17:00+00'),
  ('group', 'H', 'UAE', 'JOR', '2026-06-19 20:00+00'),
  ('group', 'H', 'KSA', 'UAE', '2026-06-25 17:00+00'),
  ('group', 'H', 'QAT', 'JOR', '2026-06-25 20:00+00'),
  ('group', 'H', 'KSA', 'JOR', '2026-07-01 17:00+00'),
  ('group', 'H', 'QAT', 'UAE', '2026-07-01 20:00+00');

-- Group I
insert into public.matches (stage, group_letter, home_team, away_team, kickoff_at) values
  ('group', 'I', 'POL', 'AUT', '2026-06-20 20:00+00'),
  ('group', 'I', 'TUR', 'SRB', '2026-06-20 23:00+00'),
  ('group', 'I', 'POL', 'TUR', '2026-06-26 20:00+00'),
  ('group', 'I', 'AUT', 'SRB', '2026-06-26 23:00+00'),
  ('group', 'I', 'POL', 'SRB', '2026-07-02 20:00+00'),
  ('group', 'I', 'AUT', 'TUR', '2026-07-02 23:00+00');

-- Group J
insert into public.matches (stage, group_letter, home_team, away_team, kickoff_at) values
  ('group', 'J', 'NOR', 'SCO', '2026-06-21 20:00+00'),
  ('group', 'J', 'ALG', 'GHA', '2026-06-21 23:00+00'),
  ('group', 'J', 'NOR', 'ALG', '2026-06-27 20:00+00'),
  ('group', 'J', 'SCO', 'GHA', '2026-06-27 23:00+00'),
  ('group', 'J', 'NOR', 'GHA', '2026-07-03 20:00+00'),
  ('group', 'J', 'SCO', 'ALG', '2026-07-03 23:00+00');

-- Group K
insert into public.matches (stage, group_letter, home_team, away_team, kickoff_at) values
  ('group', 'K', 'CIV', 'NGA', '2026-06-22 17:00+00'),
  ('group', 'K', 'CMR', 'RSA', '2026-06-22 20:00+00'),
  ('group', 'K', 'CIV', 'CMR', '2026-06-28 17:00+00'),
  ('group', 'K', 'NGA', 'RSA', '2026-06-28 20:00+00'),
  ('group', 'K', 'CIV', 'RSA', '2026-07-04 17:00+00'),
  ('group', 'K', 'NGA', 'CMR', '2026-07-04 20:00+00');

-- Group L
insert into public.matches (stage, group_letter, home_team, away_team, kickoff_at) values
  ('group', 'L', 'UZB', 'IRQ', '2026-06-23 17:00+00'),
  ('group', 'L', 'NZL', 'CHI', '2026-06-23 20:00+00'),
  ('group', 'L', 'UZB', 'NZL', '2026-06-29 17:00+00'),
  ('group', 'L', 'IRQ', 'CHI', '2026-06-29 20:00+00'),
  ('group', 'L', 'UZB', 'CHI', '2026-07-05 17:00+00'),
  ('group', 'L', 'IRQ', 'NZL', '2026-07-05 20:00+00');
