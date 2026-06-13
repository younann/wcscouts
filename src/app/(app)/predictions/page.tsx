import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n/server';
import { MatchCard } from '@/components/MatchCard';
import { Target, CheckCircle2, Sparkles, ListChecks } from 'lucide-react';
import type { MatchWithTeams, Prediction, Team } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function PredictionsPage() {
  const { locale, t } = await getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: preds } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  const predictions = (preds ?? []) as Prediction[];
  const matchIds = predictions.map((p) => p.match_id);

  const { data: matchesRaw } = matchIds.length
    ? await supabase
        .from('matches')
        .select('*')
        .in('id', matchIds)
        .order('kickoff_at', { ascending: false })
    : { data: [] };
  const matches = (matchesRaw ?? []) as MatchWithTeams[];
  const codes = Array.from(
    new Set(matches.flatMap((m) => [m.home_team, m.away_team]).filter((c): c is string => !!c))
  );
  const { data: teamsRaw } = codes.length
    ? await supabase.from('teams').select('*').in('code', codes)
    : { data: [] };
  const teamsByCode = new Map((teamsRaw ?? []).map((tt) => [(tt as Team).code, tt as Team]));
  const predByMatch = new Map(predictions.map((p) => [p.match_id, p]));

  const enriched: MatchWithTeams[] = matches.map((m) => ({
    ...m,
    home: m.home_team ? teamsByCode.get(m.home_team) ?? null : null,
    away: m.away_team ? teamsByCode.get(m.away_team) ?? null : null,
  }));

  // Stats
  const scoredPreds = predictions.filter((p) => p.points_awarded != null);
  const totalPoints = scoredPreds.reduce((s, p) => s + (p.points_awarded ?? 0), 0);
  const exactCount = scoredPreds.filter((p) => {
    const m = matches.find((mm) => mm.id === p.match_id);
    return m && p.home_score === m.home_score && p.away_score === m.away_score;
  }).length;
  const correctCount = scoredPreds.filter((p) => (p.points_awarded ?? 0) > 0).length;

  const Stat = ({ label, value, Icon }: { label: string; value: number | string; Icon: typeof Target }) => (
    <div
      className="rounded-2xl p-3"
      style={{ background: 'rgba(28,7,67,0.55)', border: '1px solid rgba(252,192,40,0.30)' }}
    >
      <div className="flex items-center gap-1.5 text-xs text-cream/70">
        <Icon className="h-3.5 w-3.5 text-gold-300" />
        <span>{label}</span>
      </div>
      <div className="text-xl font-black gold-text tabular-nums mt-1">{value}</div>
    </div>
  );

  return (
    <main className="px-5 pb-6 flex flex-col gap-4">
      <h1 className="text-2xl font-black gold-text">{t.predictions.title}</h1>

      {predictions.length > 0 && (
        <section className="grid grid-cols-4 gap-2">
          <Stat label={t.predictions.statsTotal} value={predictions.length} Icon={ListChecks} />
          <Stat label={t.predictions.statsScored} value={scoredPreds.length} Icon={CheckCircle2} />
          <Stat label={t.predictions.statsExact} value={exactCount} Icon={Sparkles} />
          <Stat label={t.predictions.statsPoints} value={totalPoints} Icon={Target} />
        </section>
      )}

      {enriched.length === 0 ? (
        <div className="card-royal text-center text-cream/60">{t.predictions.empty}</div>
      ) : (
        <div className="flex flex-col gap-3">
          {enriched.map((m) => (
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
    </main>
  );
}
