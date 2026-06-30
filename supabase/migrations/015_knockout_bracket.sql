-- Knockout bracket auto-advance ("the road to the final").
--
-- Problem this fixes: knockout matches were seeded with NULL teams (migration
-- 010) and NOTHING ever populated them. The TheSportsDB sync only updates
-- *scores* of matches whose teams are already set, so the knockout slots stayed
-- empty, users couldn't predict them (PredictionForm hides TBD matches), and the
-- games never got scored.
--
-- Fix: the app now advances teams itself. Each knockout match knows which slot
-- its winner (and, for the semis, its loser) feeds. When a match is decided, an
-- AFTER-UPDATE trigger writes the advancing team into the next round. Fully
-- internal — no dependency on any external API.
--
-- Edge map below is generated from the supplied bracket (game ids 73..104),
-- translated to this database's real match ids (145..176).

-- 1) Edge table: source match -> destination slot, for winner and (semis) loser.
create table if not exists public.knockout_edges (
  source_match_id bigint not null references public.matches(id) on delete cascade,
  outcome         text   not null check (outcome in ('winner','loser')),
  dest_match_id   bigint not null references public.matches(id) on delete cascade,
  dest_slot       text   not null check (dest_slot in ('home','away')),
  primary key (source_match_id, outcome)
);

alter table public.knockout_edges enable row level security;
drop policy if exists knockout_edges_admin on public.knockout_edges;
create policy knockout_edges_admin on public.knockout_edges
  for all using (public.is_admin()) with check (public.is_admin());

-- 2) Seed the edges (winner advances; semis' losers go to the 3rd-place match).
insert into public.knockout_edges (source_match_id, outcome, dest_match_id, dest_slot) values
  -- R32 winners -> R16
  (147,'winner',161,'home'), (149,'winner',161,'away'),
  (145,'winner',162,'home'), (148,'winner',162,'away'),
  (146,'winner',163,'home'), (150,'winner',163,'away'),
  (151,'winner',164,'home'), (152,'winner',164,'away'),
  (155,'winner',165,'home'), (156,'winner',165,'away'),
  (153,'winner',166,'home'), (154,'winner',166,'away'),
  (158,'winner',167,'home'), (160,'winner',167,'away'),
  (157,'winner',168,'home'), (159,'winner',168,'away'),
  -- R16 winners -> QF
  (161,'winner',169,'home'), (162,'winner',169,'away'),
  (165,'winner',170,'home'), (166,'winner',170,'away'),
  (163,'winner',171,'home'), (164,'winner',171,'away'),
  (167,'winner',172,'home'), (168,'winner',172,'away'),
  -- QF winners -> SF
  (169,'winner',173,'home'), (170,'winner',173,'away'),
  (171,'winner',174,'home'), (172,'winner',174,'away'),
  -- SF winners -> Final, SF losers -> 3rd place
  (173,'winner',176,'home'), (174,'winner',176,'away'),
  (173,'loser', 175,'home'), (174,'loser', 175,'away')
on conflict (source_match_id, outcome) do update
  set dest_match_id = excluded.dest_match_id,
      dest_slot     = excluded.dest_slot;

-- 3) Propagation: given a decided match, push its winner/loser into the next slot.
create or replace function public.propagate_bracket(p_match_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  v_winner_side text;
  v_winner_code text;
  v_loser_code  text;
  e record;
  v_team text;
begin
  select * into m from public.matches where id = p_match_id;
  if not found then return; end if;
  if m.home_team is null or m.away_team is null
     or m.home_score is null or m.away_score is null then
    return;
  end if;

  -- Decide the winning side. On a draw (penalties), fall back to qualifier_team.
  if m.home_score > m.away_score then
    v_winner_side := 'home';
  elsif m.away_score > m.home_score then
    v_winner_side := 'away';
  elsif m.qualifier_team in ('home','away') then
    v_winner_side := m.qualifier_team;
  else
    return;  -- draw with no qualifier set yet: can't advance anyone
  end if;

  if v_winner_side = 'home' then
    v_winner_code := m.home_team; v_loser_code := m.away_team;
  else
    v_winner_code := m.away_team; v_loser_code := m.home_team;
  end if;

  for e in select * from public.knockout_edges where source_match_id = p_match_id loop
    v_team := case when e.outcome = 'winner' then v_winner_code else v_loser_code end;
    if e.dest_slot = 'home' then
      update public.matches set home_team = v_team where id = e.dest_match_id;
    else
      update public.matches set away_team = v_team where id = e.dest_match_id;
    end if;
  end loop;
end;
$$;

revoke all on function public.propagate_bracket(bigint) from public;

-- 4) Trigger: whenever a match becomes finished with a full result, advance it.
--    Setting the destination teams does not set status='finished', so this does
--    not recurse.
create or replace function public.tg_propagate_bracket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'finished'
     and new.home_team is not null and new.away_team is not null
     and new.home_score is not null and new.away_score is not null then
    perform public.propagate_bracket(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists matches_propagate on public.matches;
create trigger matches_propagate
  after update of status, home_score, away_score, qualifier_team
  on public.matches
  for each row execute function public.tg_propagate_bracket();

-- 5) Backfill: advance any knockout match that is ALREADY finished, so the
--    bracket catches up on existing results when this migration runs.
do $$
declare r record;
begin
  for r in
    select id from public.matches
    where stage in ('r32','r16','qf','sf')
      and status = 'finished'
      and home_team is not null and away_team is not null
      and home_score is not null and away_score is not null
    order by kickoff_at
  loop
    perform public.propagate_bracket(r.id);
  end loop;
end $$;
