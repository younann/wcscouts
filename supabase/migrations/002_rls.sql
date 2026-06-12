-- Row Level Security policies

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.scoring_rules enable row level security;

-- Helper: is current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- PROFILES
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles
  for select using (auth.uid() is not null);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- TEAMS (read for all, write admin only)
drop policy if exists teams_select_all on public.teams;
create policy teams_select_all on public.teams for select using (auth.uid() is not null);

drop policy if exists teams_admin_write on public.teams;
create policy teams_admin_write on public.teams
  for all using (public.is_admin()) with check (public.is_admin());

-- MATCHES (read all, write admin)
drop policy if exists matches_select_all on public.matches;
create policy matches_select_all on public.matches for select using (auth.uid() is not null);

drop policy if exists matches_admin_write on public.matches;
create policy matches_admin_write on public.matches
  for all using (public.is_admin()) with check (public.is_admin());

-- PREDICTIONS
-- Read: own predictions always; others' only after the match has kicked off
drop policy if exists predictions_select on public.predictions;
create policy predictions_select on public.predictions
  for select using (
    auth.uid() = user_id
    or public.is_admin()
    or exists (
      select 1 from public.matches m
      where m.id = match_id and m.kickoff_at <= now()
    )
  );

-- Insert: only own row AND match not yet started
drop policy if exists predictions_insert on public.predictions;
create policy predictions_insert on public.predictions
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id and m.kickoff_at > now()
    )
  );

-- Update: only own row AND match not yet started
drop policy if exists predictions_update on public.predictions;
create policy predictions_update on public.predictions
  for update using (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id and m.kickoff_at > now()
    )
  )
  with check (auth.uid() = user_id);

drop policy if exists predictions_admin_all on public.predictions;
create policy predictions_admin_all on public.predictions
  for all using (public.is_admin()) with check (public.is_admin());

-- SCORING RULES (read all, write admin)
drop policy if exists scoring_rules_select_all on public.scoring_rules;
create policy scoring_rules_select_all on public.scoring_rules for select using (auth.uid() is not null);

drop policy if exists scoring_rules_admin_write on public.scoring_rules;
create policy scoring_rules_admin_write on public.scoring_rules
  for all using (public.is_admin()) with check (public.is_admin());
