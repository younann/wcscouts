-- Admin-tunable leaderboard window. Filters the public leaderboard page so
-- only points from matches scored between [leaderboard_from, leaderboard_to]
-- are summed. Distinct from scoring_starts_at/ends_at, which gate which
-- matches contribute to profiles.total_points via kickoff_at.

insert into public.app_settings (key, value) values
  ('leaderboard_from', null),
  ('leaderboard_to', null)
on conflict (key) do nothing;
