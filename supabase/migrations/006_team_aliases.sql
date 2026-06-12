-- Map TheSportsDB team-name strings to our 3-letter team codes.
-- Multiple aliases per team are supported (different naming styles, accents).
-- The INNER JOIN with public.teams filters out any alias whose team_code is
-- not in the live teams table — safe to re-run, never crashes on missing teams.

create table if not exists public.team_aliases (
  api_name text primary key,
  team_code text not null references public.teams(code) on delete cascade
);

create index if not exists team_aliases_team_idx on public.team_aliases(team_code);

alter table public.team_aliases enable row level security;

drop policy if exists team_aliases_select_all on public.team_aliases;
create policy team_aliases_select_all on public.team_aliases
  for select using (auth.uid() is not null);

drop policy if exists team_aliases_admin_write on public.team_aliases;
create policy team_aliases_admin_write on public.team_aliases
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.team_aliases (api_name, team_code)
select v.api_name, v.team_code
from (values
  -- North/Central America & Caribbean
  ('United States', 'USA'), ('USA', 'USA'), ('US', 'USA'),
  ('Canada', 'CAN'),
  ('Mexico', 'MEX'),
  ('Haiti', 'HAI'),
  ('Curacao', 'CUW'), ('Curaçao', 'CUW'),
  ('Panama', 'PAN'),
  -- South America
  ('Argentina', 'ARG'),
  ('Brazil', 'BRA'),
  ('Uruguay', 'URU'),
  ('Colombia', 'COL'),
  ('Ecuador', 'ECU'),
  ('Paraguay', 'PAR'),
  -- Europe
  ('France', 'FRA'),
  ('England', 'ENG'),
  ('Spain', 'ESP'),
  ('Germany', 'GER'),
  ('Portugal', 'POR'),
  ('Netherlands', 'NED'), ('Holland', 'NED'),
  ('Belgium', 'BEL'),
  ('Croatia', 'CRO'),
  ('Switzerland', 'SUI'),
  ('Austria', 'AUT'),
  ('Czechia', 'CZE'), ('Czech Republic', 'CZE'),
  ('Sweden', 'SWE'),
  ('Norway', 'NOR'),
  ('Scotland', 'SCO'),
  ('Turkey', 'TUR'), ('Türkiye', 'TUR'), ('Turkiye', 'TUR'),
  ('Bosnia and Herzegovina', 'BIH'), ('Bosnia-Herzegovina', 'BIH'), ('Bosnia & Herzegovina', 'BIH'),
  -- Asia
  ('Japan', 'JPN'),
  ('South Korea', 'KOR'), ('Korea Republic', 'KOR'), ('Republic of Korea', 'KOR'), ('Korea', 'KOR'),
  ('Iran', 'IRN'), ('IR Iran', 'IRN'),
  ('Australia', 'AUS'),
  ('Saudi Arabia', 'KSA'),
  ('Qatar', 'QAT'),
  ('Jordan', 'JOR'),
  ('Uzbekistan', 'UZB'),
  ('Iraq', 'IRQ'),
  -- Africa
  ('Morocco', 'MAR'),
  ('Tunisia', 'TUN'),
  ('Algeria', 'ALG'),
  ('Egypt', 'EGY'),
  ('Senegal', 'SEN'),
  ('Ghana', 'GHA'),
  ('Ivory Coast', 'CIV'), ('Cote d''Ivoire', 'CIV'), ('Côte d''Ivoire', 'CIV'),
  ('South Africa', 'RSA'),
  ('Cape Verde', 'CPV'), ('Cabo Verde', 'CPV'),
  ('DR Congo', 'COD'), ('Democratic Republic of the Congo', 'COD'), ('Congo DR', 'COD'),
  -- Oceania
  ('New Zealand', 'NZL')
) as v(api_name, team_code)
inner join public.teams t on t.code = v.team_code
on conflict (api_name) do update set team_code = excluded.team_code;
