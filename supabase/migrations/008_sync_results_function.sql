-- Fix: in 015 I used `extract(epoch from (date - date))` which fails because
-- date - date returns INTEGER days, not an interval. Compare day-diffs directly.

create or replace function public.sync_match_results()
returns table(updated_count int, scored_count int)
language plpgsql
security definer
set search_path = public, net
set statement_timeout = '30s'
as $$
declare
  v_url text := 'https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=4429&s=2026';
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
  v_swapped boolean;
  v_final_home int;
  v_final_away int;
begin
  select content into v_body
  from net._http_response
  where status_code = 200
    and content is not null
    and length(content) > 100
  order by created desc
  limit 1;

  if v_body is null then
    perform net.http_get(url := v_url, timeout_milliseconds := 6000);
    return query select 0, 0;
    return;
  end if;

  begin
    v_payload := v_body::jsonb;
  exception when others then
    return query select 0, 0;
    return;
  end;

  if v_payload->'events' is null or jsonb_typeof(v_payload->'events') <> 'array' then
    return query select 0, 0;
    return;
  end if;

  for v_event in select * from jsonb_array_elements(v_payload->'events') loop
    v_status := coalesce(v_event->>'strStatus', '');
    if v_status not in ('Match Finished', 'FT', 'AET', 'After Extra Time', 'PEN', 'After Penalties')
       or v_event->>'intHomeScore' is null
       or v_event->>'intAwayScore' is null
    then continue; end if;

    select team_code into v_home_code from public.team_aliases
      where api_name = v_event->>'strHomeTeam';
    select team_code into v_away_code from public.team_aliases
      where api_name = v_event->>'strAwayTeam';
    if v_home_code is null or v_away_code is null then continue; end if;

    v_kickoff_date := (v_event->>'dateEvent')::date;
    v_home_score := (v_event->>'intHomeScore')::int;
    v_away_score := (v_event->>'intAwayScore')::int;

    -- date - date = integer (days); compare directly. ±3 day tolerance.
    select * into v_match from public.matches
    where home_team = v_home_code and away_team = v_away_code
      and status <> 'finished'
      and abs(kickoff_at::date - v_kickoff_date) <= 3
    order by abs(kickoff_at::date - v_kickoff_date)
    limit 1;
    v_swapped := false;

    if not found then
      select * into v_match from public.matches
      where home_team = v_away_code and away_team = v_home_code
        and status <> 'finished'
        and abs(kickoff_at::date - v_kickoff_date) <= 3
      order by abs(kickoff_at::date - v_kickoff_date)
      limit 1;
      v_swapped := true;
    end if;

    if not found then continue; end if;

    if v_swapped then
      v_final_home := v_away_score;
      v_final_away := v_home_score;
    else
      v_final_home := v_home_score;
      v_final_away := v_away_score;
    end if;

    update public.matches
    set home_score = v_final_home, away_score = v_final_away
    where id = v_match.id;
    v_updated := v_updated + 1;

    perform public._score_match_internal(v_match.id);
    v_scored := v_scored + 1;
  end loop;

  perform net.http_get(url := v_url, timeout_milliseconds := 6000);

  return query select v_updated, v_scored;
end;
$$;

revoke all on function public.sync_match_results() from public;
grant execute on function public.sync_match_results() to authenticated;
