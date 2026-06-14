-- Refactor the scoring functions so that:
--   * `_score_match_internal(match_id)` does the actual scoring without an
--     auth check — callable by background jobs like sync_match_results.
--   * `score_match(match_id)` is a thin admin-only wrapper for the
--     "Lock & score" button on /admin/matches.

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
