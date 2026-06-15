-- Admin-tunable scoring window.
--
-- Only matches whose kickoff_at falls within
--   [scoring_starts_at, scoring_ends_at]
-- contribute to a user's profiles.total_points. predictions.points_awarded
-- is never modified by this feature — it stays as historical scoring data
-- so the window can be changed at any time without losing information.

create table if not exists public.app_settings (
  key text primary key,
  value text
);

insert into public.app_settings (key, value) values
  ('scoring_starts_at', '1970-01-01T00:00:00Z'),
  ('scoring_ends_at', null)
on conflict (key) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists app_settings_select_all on public.app_settings;
create policy app_settings_select_all on public.app_settings
  for select using (auth.uid() is not null);

drop policy if exists app_settings_write_admin on public.app_settings;
create policy app_settings_write_admin on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- Recompute every user's total_points from predictions filtered by the
-- current scoring window. Admin-only.
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
  ), 0)
  where pr.id is not null;  -- Supabase rejects unqualified UPDATEs; PK is never null so this matches all rows.
end;
$$;

revoke all on function public.recompute_total_points() from public;
grant execute on function public.recompute_total_points() to authenticated;

-- _score_match_internal: refresh user totals using the window filter so
-- scoring a match never re-sums points outside the configured window.
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
  ), 0)
  where pr.id in (select user_id from public.predictions where match_id = p_match_id);
end;
$$;
