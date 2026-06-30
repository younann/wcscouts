-- One-time goodwill compensation for the Round-of-32 games users could not
-- predict (knockout teams never auto-populated, so the prediction form was
-- hidden until after kickoff for those matches).
--
-- Design: a bonus_points column on profiles, folded into BOTH places that sum a
-- user's score:
--   * profiles.total_points       (rebuilt by recompute_total_points / scoring)
--   * leaderboard_in_range()      (the windowed leaderboard, computed on the fly)
-- A naive "UPDATE total_points += n" would be wiped the next time any predicted
-- match is re-scored, because those paths rebuild total_points from scratch.

-- 1) Column
alter table public.profiles
  add column if not exists bonus_points integer not null default 0;

-- 2) recompute_total_points: windowed prediction sum + bonus
create or replace function public.recompute_total_points()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'only admin can recompute totals';
  end if;

  select nullif(value, '')::timestamptz into v_start
    from public.app_settings where key = 'scoring_starts_at';
  v_start := coalesce(v_start, '1970-01-01T00:00:00Z'::timestamptz);
  select nullif(value, '')::timestamptz into v_end
    from public.app_settings where key = 'scoring_ends_at';
  v_end := coalesce(v_end, '2099-12-31T23:59:59Z'::timestamptz);

  update public.profiles pr
  set total_points = coalesce((
    select sum(p.points_awarded)
    from public.predictions p
    join public.matches m on m.id = p.match_id
    where p.user_id = pr.id
      and p.points_awarded is not null
      and m.kickoff_at >= v_start
      and m.kickoff_at <= v_end
  ), 0) + coalesce(pr.bonus_points, 0)
  where pr.id is not null;
end;
$$;

-- 3) _score_match_internal: same window sum + bonus (keeps migration-014 logic).
--    Bracket propagation is handled by the matches_propagate trigger (015), so
--    it is intentionally NOT called here.
create or replace function public._score_match_internal(p_match_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  r_exact integer;
  r_outcome integer;
  r_gd integer;
  r_qualifier integer;
  v_actual_outcome text;
  v_actual_gd integer;
  v_start timestamptz;
  v_end timestamptz;
begin
  select * into m from public.matches where id = p_match_id;
  if not found then raise exception 'match not found'; end if;
  if m.home_score is null or m.away_score is null then
    raise exception 'match has no result';
  end if;

  select value into r_exact from public.scoring_rules where key = 'exact_score';
  select value into r_outcome from public.scoring_rules where key = 'correct_outcome';
  select value into r_gd from public.scoring_rules where key = 'goal_difference';
  select value into r_qualifier from public.scoring_rules where key = 'correct_qualifier';

  v_actual_outcome := case
    when m.home_score > m.away_score then 'H'
    when m.home_score < m.away_score then 'A'
    else 'D'
  end;
  v_actual_gd := m.home_score - m.away_score;

  update public.predictions p
  set points_awarded = (
    case
      when p.home_score = m.home_score and p.away_score = m.away_score
        then r_exact
      when (
        (p.home_score > p.away_score and v_actual_outcome = 'H')
        or (p.home_score < p.away_score and v_actual_outcome = 'A')
        or (p.home_score = p.away_score and v_actual_outcome = 'D')
      ) and (p.home_score - p.away_score) = v_actual_gd
        then r_outcome + r_gd
      when (
        (p.home_score > p.away_score and v_actual_outcome = 'H')
        or (p.home_score < p.away_score and v_actual_outcome = 'A')
        or (p.home_score = p.away_score and v_actual_outcome = 'D')
      )
        then r_outcome
      else 0
    end
    +
    case
      when m.qualifier_team is not null
       and p.qualifier_pick is not null
       and p.qualifier_pick = m.qualifier_team
        then r_qualifier
      else 0
    end
  )
  where p.match_id = p_match_id;

  update public.matches
  set status = 'finished', scored_at = now()
  where id = p_match_id;

  select nullif(value, '')::timestamptz into v_start
    from public.app_settings where key = 'scoring_starts_at';
  v_start := coalesce(v_start, '1970-01-01T00:00:00Z'::timestamptz);
  select nullif(value, '')::timestamptz into v_end
    from public.app_settings where key = 'scoring_ends_at';
  v_end := coalesce(v_end, '2099-12-31T23:59:59Z'::timestamptz);

  update public.profiles pr
  set total_points = coalesce((
    select sum(p.points_awarded)
    from public.predictions p
    join public.matches mm on mm.id = p.match_id
    where p.user_id = pr.id
      and p.points_awarded is not null
      and mm.kickoff_at >= v_start
      and mm.kickoff_at <= v_end
  ), 0) + coalesce(pr.bonus_points, 0)
  where pr.id in (select user_id from public.predictions where match_id = p_match_id);
end;
$$;

-- 4) leaderboard_in_range: add bonus to each user's range total.
create or replace function public.leaderboard_in_range(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  id uuid,
  username text,
  full_name text,
  group_name text,
  total_points integer,
  winner_place smallint,
  "position" bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with sums as (
    select
      pr.id,
      pr.username,
      pr.full_name,
      pr.group_name,
      pr.winner_place,
      pr.created_at,
      coalesce((
        select sum(pd.points_awarded)::int
        from public.predictions pd
        join public.matches m on m.id = pd.match_id
        where pd.user_id = pr.id
          and pd.points_awarded is not null
          and m.scored_at is not null
          and m.scored_at >= coalesce(p_from, '1970-01-01T00:00:00Z'::timestamptz)
          and m.scored_at <= coalesce(p_to, '2099-12-31T23:59:59Z'::timestamptz)
      ), 0) + coalesce(pr.bonus_points, 0) as total_points
    from public.profiles pr
    where pr.role = 'user'
  )
  select id, username, full_name, group_name, total_points, winner_place,
         rank() over (order by total_points desc, created_at asc) as position
  from sums;
$$;

-- 5) Apply the compensation.
--    >>> CONFIRM THESE TWO NUMBERS BEFORE RUNNING <<<
--    Detected R32 games that were past kickoff with ZERO predictions
--    (nobody could predict them): ids 145, 146, 149, 150  -> 4 games.
--    Games 147 & 148 had predictions, so they are NOT counted.
do $$
declare
  v_points_per_game int := 3;   -- you chose +3 per missed game
  v_missed_games    int := 4;   -- <-- set to the agreed count
  v_bonus           int := v_points_per_game * v_missed_games;
  v_start timestamptz;
  v_end timestamptz;
begin
  update public.profiles pr
  set bonus_points = bonus_points + v_bonus
  where pr.role = 'user'
    and pr.id in (select distinct user_id from public.predictions);  -- "active" = ever predicted

  -- Fold the new bonus into total_points immediately, respecting the scoring
  -- window (recompute_total_points can't run from the SQL editor — it requires
  -- auth.uid() to be an admin).
  select nullif(value, '')::timestamptz into v_start
    from public.app_settings where key = 'scoring_starts_at';
  v_start := coalesce(v_start, '1970-01-01T00:00:00Z'::timestamptz);
  select nullif(value, '')::timestamptz into v_end
    from public.app_settings where key = 'scoring_ends_at';
  v_end := coalesce(v_end, '2099-12-31T23:59:59Z'::timestamptz);

  update public.profiles pr
  set total_points = coalesce((
    select sum(p.points_awarded)
    from public.predictions p
    join public.matches m on m.id = p.match_id
    where p.user_id = pr.id
      and p.points_awarded is not null
      and m.kickoff_at >= v_start
      and m.kickoff_at <= v_end
  ), 0) + coalesce(pr.bonus_points, 0)
  where pr.id is not null;
end $$;
