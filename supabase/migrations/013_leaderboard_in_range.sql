-- Date-range leaderboard. Sums predictions.points_awarded from matches
-- scored inside [p_from, p_to] (matches.scored_at). Mirrors the shape of
-- the public.leaderboard view so the same UI can render either source.
--
-- Bounds are nullable: null p_from means "since epoch", null p_to means
-- "up to now". Users with zero points in the range are still returned so
-- the leaderboard stays stable as scores roll in.

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
      ), 0) as total_points
    from public.profiles pr
    where pr.role = 'user'
  )
  select
    id,
    username,
    full_name,
    group_name,
    total_points,
    winner_place,
    rank() over (order by total_points desc, created_at asc) as position
  from sums;
$$;

revoke all on function public.leaderboard_in_range(timestamptz, timestamptz) from public;
grant execute on function public.leaderboard_in_range(timestamptz, timestamptz) to authenticated;
