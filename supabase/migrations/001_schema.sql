-- WC Scouts schema
-- Run this in Supabase SQL Editor

create extension if not exists "pgcrypto";

-- Profiles: extends auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text not null,
  group_name text,
  total_points integer not null default 0,
  role text not null default 'user' check (role in ('user', 'admin')),
  winner_place smallint check (winner_place in (1, 2, 3)),
  created_at timestamptz not null default now()
);

-- Teams
create table if not exists public.teams (
  code text primary key,
  name_en text not null,
  name_ar text not null,
  flag text not null
);

-- Matches
create table if not exists public.matches (
  id bigserial primary key,
  stage text not null check (stage in ('group','r32','r16','qf','sf','3rd','final')),
  group_letter text,
  home_team text references public.teams(code),
  away_team text references public.teams(code),
  kickoff_at timestamptz not null,
  home_score smallint,
  away_score smallint,
  qualifier_team text check (qualifier_team in ('home','away')),
  status text not null default 'scheduled' check (status in ('scheduled','live','finished')),
  scored_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists matches_kickoff_idx on public.matches(kickoff_at);
create index if not exists matches_status_idx on public.matches(status);

-- Predictions
create table if not exists public.predictions (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id bigint not null references public.matches(id) on delete cascade,
  home_score smallint not null check (home_score >= 0 and home_score <= 30),
  away_score smallint not null check (away_score >= 0 and away_score <= 30),
  qualifier_pick text check (qualifier_pick in ('home','away')),
  points_awarded integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);
create index if not exists predictions_user_idx on public.predictions(user_id);
create index if not exists predictions_match_idx on public.predictions(match_id);

-- Scoring rules (single-row config table)
create table if not exists public.scoring_rules (
  key text primary key,
  value integer not null,
  label text not null
);

insert into public.scoring_rules (key, value, label) values
  ('exact_score', 5, 'Exact score'),
  ('correct_outcome', 3, 'Correct winner / draw'),
  ('goal_difference', 2, 'Correct goal difference'),
  ('correct_qualifier', 3, 'Correct knockout qualifier')
on conflict (key) do nothing;

-- Auto-create profile row when a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger for predictions
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists predictions_touch on public.predictions;
create trigger predictions_touch
  before update on public.predictions
  for each row execute function public.touch_updated_at();
