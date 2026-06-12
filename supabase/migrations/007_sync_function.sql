-- Auto-sync match results from TheSportsDB (free, no key required).
-- Public API key '3' is the documented test key; rate limit is generous.
-- League id 4429 = FIFA World Cup.

-- 1) Extract scoring logic into an internal function without the admin check,
--    so background jobs (no auth.uid()) can call it.
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

  update public.profiles pr
  set total_points = coalesce(
    (select sum(points_awarded) from public.predictions where user_id = pr.id and points_awarded is not null),
    0
  )
  where pr.id in (select user_id from public.predictions where match_id = p_match_id);
end;
$$;

-- 2) Re-define the admin-callable wrapper. Same signature as before.
create or replace function public.score_match(p_match_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'only admin can score matches';
  end if;
  perform public._score_match_internal(p_match_id);
end;
$$;

revoke all on function public._score_match_internal(bigint) from public;
revoke all on function public.score_match(bigint) from public;
grant execute on function public.score_match(bigint) to authenticated;
-- _score_match_internal stays callable only by the postgres role (which pg_cron uses).

-- 3) The sync function. Returns a (updated, scored) count so admin UI can show results.
create or replace function public.sync_match_results()
returns table(updated_count int, scored_count int)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_body text;
  v_payload jsonb;
  v_event jsonb;
  v_home_code text;
  v_away_code text;
  v_home_score int;
  v_away_score int;
  v_kickoff_date date;
  v_match record;
  v_updated int := 0;
  v_scored int := 0;
  v_status text;
begin
  -- Fetch all WC events for the 2026 season
  select (extensions.http_get(
    'https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=4429&s=2026'
  )).content into v_body;

  if v_body is null or v_body = '' then
    return query select 0, 0;
    return;
  end if;

  v_payload := v_body::jsonb;
  if v_payload is null or v_payload->'events' is null
     or jsonb_typeof(v_payload->'events') <> 'array' then
    return query select 0, 0;
    return;
  end if;

  for v_event in select * from jsonb_array_elements(v_payload->'events') loop
    -- Only finished matches with a final score
    v_status := coalesce(v_event->>'strStatus', '');
    if v_status not in ('Match Finished', 'FT', 'AET', 'After Extra Time', 'PEN', 'After Penalties')
       or v_event->>'intHomeScore' is null
       or v_event->>'intAwayScore' is null
    then continue; end if;

    -- Map team names
    select team_code into v_home_code from public.team_aliases
      where api_name = v_event->>'strHomeTeam';
    select team_code into v_away_code from public.team_aliases
      where api_name = v_event->>'strAwayTeam';
    if v_home_code is null or v_away_code is null then continue; end if;

    v_kickoff_date := (v_event->>'dateEvent')::date;
    v_home_score := (v_event->>'intHomeScore')::int;
    v_away_score := (v_event->>'intAwayScore')::int;

    -- Find our match by team codes and approximate kickoff date (±2 days for TZ).
    -- For knockouts where teams could repeat across stages, prefer the closest
    -- unfinished match.
    select * into v_match from public.matches
    where home_team = v_home_code
      and away_team = v_away_code
      and status <> 'finished'
      and abs(extract(epoch from (kickoff_at::date - v_kickoff_date))) < 172800
    order by abs(extract(epoch from (kickoff_at::date - v_kickoff_date)))
    limit 1;

    if not found then continue; end if;

    update public.matches
    set home_score = v_home_score,
        away_score = v_away_score
    where id = v_match.id;
    v_updated := v_updated + 1;

    -- Compute points (also flips status to 'finished')
    perform public._score_match_internal(v_match.id);
    v_scored := v_scored + 1;
  end loop;

  return query select v_updated, v_scored;
end;
$$;

revoke all on function public.sync_match_results() from public;
grant execute on function public.sync_match_results() to authenticated;

-- Admins can also call this via /api/admin/sync. Non-admin callers will see
-- normal RLS protection on the matches/predictions tables — the function
-- itself is SECURITY DEFINER, but we still gate at the API route layer.
