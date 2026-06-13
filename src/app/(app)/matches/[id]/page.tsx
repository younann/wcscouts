import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n/server';
import { isRTL } from '@/lib/i18n/dictionaries';
import { PredictionForm } from '@/components/PredictionForm';
import { MatchPredictionBreakdown } from '@/components/MatchPredictionBreakdown';
import { formatKickoff, isLocked } from '@/lib/utils';
import type { Match, MatchWithTeams, Prediction, Profile, Team } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function MatchDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) notFound();
  const { locale, t } = await getT();
  const Back = isRTL(locale) ? ChevronRight : ChevronLeft;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: matchRow } = await supabase.from('matches').select('*').eq('id', matchId).single();
  if (!matchRow) notFound();
  const match = matchRow as Match;

  const codes = [match.home_team, match.away_team].filter((c): c is string => !!c);
  const { data: teamsRaw } = codes.length
    ? await supabase.from('teams').select('*').in('code', codes)
    : { data: [] as Team[] };
  const teamsByCode = new Map((teamsRaw ?? []).map((tt) => [(tt as Team).code, tt as Team]));
  const enriched: MatchWithTeams = {
    ...match,
    home: match.home_team ? teamsByCode.get(match.home_team) ?? null : null,
    away: match.away_team ? teamsByCode.get(match.away_team) ?? null : null,
  };

  const { data: predRow } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', user.id)
    .eq('match_id', match.id)
    .maybeSingle();
  const existing = predRow as Prediction | null;

  // Once the match has kicked off, RLS allows reading everyone's predictions
  // for this match. Show the per-scout breakdown.
  const kickedOff = isLocked(match.kickoff_at);
  let breakdown: Array<{ user_id: string; full_name: string; home_score: number; away_score: number; points_awarded: number | null }> = [];
  if (kickedOff) {
    const { data: allPreds } = await supabase
      .from('predictions')
      .select('user_id, home_score, away_score, points_awarded')
      .eq('match_id', match.id);
    const userIds = (allPreds ?? []).map((p) => (p as Prediction).user_id);
    let nameById = new Map<string, string>();
    if (userIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      nameById = new Map((profs ?? []).map((p) => [(p as Profile).id, (p as Profile).full_name]));
    }
    breakdown = (allPreds ?? []).map((p) => {
      const pred = p as Prediction;
      return {
        user_id: pred.user_id,
        full_name: nameById.get(pred.user_id) ?? '—',
        home_score: pred.home_score,
        away_score: pred.away_score,
        points_awarded: pred.points_awarded,
      };
    });
  }

  return (
    <main className="px-5 pb-6 flex flex-col gap-4">
      <Link href="/matches" className="btn-ghost-light self-start text-sm">
        <Back className="h-4 w-4" />
        {t.common.back}
      </Link>

      <div className="text-center">
        <div className="text-xs text-gold-300 font-semibold uppercase tracking-wide">
          {(t.match as Record<string, string>)[match.stage] ?? match.stage}
          {match.group_letter ? ` · ${match.group_letter}` : ''}
        </div>
        <div className="text-sm text-cream/70 mt-1">{formatKickoff(match.kickoff_at, locale)}</div>
      </div>

      <PredictionForm match={enriched} existing={existing} locale={locale} t={t} />

      {match.status === 'finished' && match.home_score != null && match.away_score != null && (
        <div className="card-royal-elev text-center">
          <div className="text-xs text-cream/60 uppercase font-bold tracking-wide">{t.predictions.result}</div>
          <div className="text-3xl font-black gold-text tabular-nums mt-1">
            {match.home_score} <span className="text-cream/40">–</span> {match.away_score}
          </div>
        </div>
      )}

      {breakdown.length > 0 && match.home_score != null && match.away_score != null && (
        <MatchPredictionBreakdown
          rows={breakdown}
          actualHome={match.home_score}
          actualAway={match.away_score}
          meId={user.id}
          t={t}
        />
      )}
    </main>
  );
}
