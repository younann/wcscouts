import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n/server';
import { MatchCard } from '@/components/MatchCard';
import { Confetti } from '@/components/Confetti';
import { WorldCupTrophy } from '@/components/WorldCupTrophy';
import { Trophy, Target, ChevronRight, ChevronLeft, GitFork } from 'lucide-react';
import Link from 'next/link';
import { isRTL } from '@/lib/i18n/dictionaries';
import type { LeaderboardEntry, MatchWithTeams, Prediction, Profile, Team } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const { locale, t } = await getT();
  const Chevron = isRTL(locale) ? ChevronLeft : ChevronRight;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  const profile = profileRow as Profile | null;

  const { data: windowSettings } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['leaderboard_from', 'leaderboard_to']);
  const windowMap = Object.fromEntries(
    ((windowSettings ?? []) as { key: string; value: string | null }[]).map((r) => [r.key, r.value])
  ) as Record<string, string | null>;
  const fromIso = windowMap.leaderboard_from ?? null;
  const toIso = windowMap.leaderboard_to ?? null;
  const ranged = Boolean(fromIso || toIso);

  let rank: number | null = null;
  let displayPoints: number = profile?.total_points ?? 0;
  if (ranged) {
    const { data: boardRows } = await supabase.rpc('leaderboard_in_range', {
      p_from: fromIso,
      p_to: toIso,
    });
    const board = (boardRows ?? []) as LeaderboardEntry[];
    const mine = board.find((e) => e.id === user.id);
    if (mine) {
      rank = mine.position;
      displayPoints = mine.total_points;
    }
  } else {
    const { data: rankRow } = await supabase
      .from('leaderboard')
      .select('position')
      .eq('id', user.id)
      .maybeSingle();
    rank = (rankRow as LeaderboardEntry | null)?.position ?? null;
  }

  const [{ data: upcomingRaw }, { data: recentRaw }] = await Promise.all([
    supabase
      .from('matches')
      .select('*')
      .gt('kickoff_at', new Date().toISOString())
      .order('kickoff_at', { ascending: true })
      .limit(3),
    supabase
      .from('matches')
      .select('*')
      .eq('status', 'finished')
      .order('scored_at', { ascending: false })
      .limit(3),
  ]);

  const upcoming = (upcomingRaw ?? []) as MatchWithTeams[];
  const recent = (recentRaw ?? []) as MatchWithTeams[];
  const matches = [...upcoming, ...recent];

  const codes = Array.from(
    new Set(matches.flatMap((m) => [m.home_team, m.away_team]).filter((c): c is string => !!c))
  );
  const { data: teamsRaw } = codes.length
    ? await supabase.from('teams').select('*').in('code', codes)
    : { data: [] as Team[] };
  const teamsByCode = new Map((teamsRaw ?? []).map((tt) => [(tt as Team).code, tt as Team]));
  const matchIds = matches.map((m) => m.id);
  const { data: myPreds } = matchIds.length
    ? await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id)
        .in('match_id', matchIds)
    : { data: [] as Prediction[] };
  const predByMatch = new Map(
    (myPreds ?? []).map((p) => [(p as Prediction).match_id, p as Prediction])
  );

  const enrich = (rows: MatchWithTeams[]): MatchWithTeams[] =>
    rows.map((m) => ({
      ...m,
      home: m.home_team ? teamsByCode.get(m.home_team) ?? null : null,
      away: m.away_team ? teamsByCode.get(m.away_team) ?? null : null,
    }));
  const enrichedUpcoming = enrich(upcoming);
  const enrichedRecent = enrich(recent);

  return (
    <main className="px-5 pb-6 flex flex-col gap-5">
      {/* Hero */}
      <section className="card-royal-elev relative overflow-hidden">
        <Confetti className="opacity-50" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gold-300 font-semibold tracking-wide">
              {t.landing.badge}
            </div>
            <div className="text-xl font-black gold-text mt-0.5 truncate">
              {t.home.welcome}, {profile?.full_name?.split(' ')[0] ?? '👋'}
            </div>
            <div className="text-[11px] text-cream/65 mt-0.5">{t.landing.motto2}</div>
          </div>
          <div className="w-16 shrink-0">
            <WorldCupTrophy className="w-full animate-float" />
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-3 mt-4">
          <div
            className="rounded-2xl p-3"
            style={{
              background: 'rgba(28,7,67,0.55)',
              border: '1px solid rgba(252,192,40,0.30)',
            }}
          >
            <div className="flex items-center gap-2 text-xs text-cream/80">
              <Target className="h-4 w-4 text-gold-300" /> {t.home.yourPoints}
            </div>
            <div className="text-3xl font-black gold-text mt-1 tabular-nums">
              {displayPoints}
            </div>
          </div>
          <div
            className="rounded-2xl p-3"
            style={{
              background: 'rgba(28,7,67,0.55)',
              border: '1px solid rgba(252,192,40,0.30)',
            }}
          >
            <div className="flex items-center gap-2 text-xs text-cream/80">
              <Trophy className="h-4 w-4 text-gold-300" /> {t.home.yourRank}
            </div>
            <div className="text-3xl font-black gold-text mt-1 tabular-nums">
              {rank ? `#${rank}` : '—'}
            </div>
          </div>
        </div>
      </section>

      <Link
        href="/bracket"
        className="card-royal flex items-center justify-center gap-2 font-bold text-gold-200 hover:border-gold-400/50 transition"
      >
        <GitFork className="h-5 w-5 -rotate-90" />
        {t.bracket.title}
        <Chevron className="h-4 w-4" />
      </Link>

      {enrichedRecent.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-cream">{t.home.recentResults}</h2>
            <Link href="/matches?tab=done" className="btn-ghost-light text-sm">
              {t.home.seeAll}
              <Chevron className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {enrichedRecent.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                prediction={predByMatch.get(m.id) ?? null}
                locale={locale}
                t={t}
              />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-cream">{t.home.nextMatches}</h2>
          <Link href="/matches" className="btn-ghost-light text-sm">
            {t.home.seeAll}
            <Chevron className="h-4 w-4" />
          </Link>
        </div>
        {enrichedUpcoming.length === 0 ? (
          <div className="card-royal text-center text-cream/60">{t.home.noMatches}</div>
        ) : (
          <div className="flex flex-col gap-3">
            {enrichedUpcoming.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                prediction={predByMatch.get(m.id) ?? null}
                locale={locale}
                t={t}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
