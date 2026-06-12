import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n/server';
import { MatchCard } from '@/components/MatchCard';
import type { MatchWithTeams, Prediction, Team } from '@/types/database';

export const dynamic = 'force-dynamic';

type Tab = 'upcoming' | 'live' | 'done';

export default async function MatchesPage({
  searchParams,
}: { searchParams: Promise<{ tab?: string }> }) {
  const { locale, t } = await getT();
  const { tab: rawTab } = await searchParams;
  const tab: Tab = rawTab === 'live' ? 'live' : rawTab === 'done' ? 'done' : 'upcoming';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let q = supabase.from('matches').select('*').order('kickoff_at', { ascending: tab !== 'done' });
  const now = new Date().toISOString();
  if (tab === 'upcoming') q = q.gt('kickoff_at', now);
  if (tab === 'live') q = q.eq('status', 'live');
  if (tab === 'done') q = q.eq('status', 'finished');

  const { data: matchesRaw } = await q.limit(60);
  const matches = (matchesRaw ?? []) as MatchWithTeams[];

  const codes = Array.from(
    new Set(matches.flatMap((m) => [m.home_team, m.away_team]).filter((c): c is string => !!c))
  );
  const { data: teamsRaw } = codes.length
    ? await supabase.from('teams').select('*').in('code', codes)
    : { data: [] as Team[] };
  const teamsByCode = new Map((teamsRaw ?? []).map((tt) => [(tt as Team).code, tt as Team]));
  const matchIds = matches.map((m) => m.id);
  const { data: preds } = matchIds.length
    ? await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id)
        .in('match_id', matchIds)
    : { data: [] as Prediction[] };
  const predByMatch = new Map((preds ?? []).map((p) => [(p as Prediction).match_id, p as Prediction]));

  const enriched: MatchWithTeams[] = matches.map((m) => ({
    ...m,
    home: m.home_team ? teamsByCode.get(m.home_team) ?? null : null,
    away: m.away_team ? teamsByCode.get(m.away_team) ?? null : null,
  }));

  const TabBtn = ({ value, label }: { value: Tab; label: string }) => {
    const active = tab === value;
    return (
      <a
        href={`/matches?tab=${value}`}
        className="flex-1 text-center py-2.5 rounded-2xl font-semibold text-sm transition"
        style={
          active
            ? {
                background: 'linear-gradient(135deg, #fdd34c 0%, #f5b50a 100%)',
                color: '#1c0743',
                boxShadow: '0 10px 24px -8px rgba(245,181,10,0.45)',
              }
            : {
                background: 'rgba(74, 30, 150, 0.45)',
                color: '#f6efe1',
                border: '1px solid rgba(183, 148, 244, 0.25)',
              }
        }
      >
        {label}
      </a>
    );
  };

  return (
    <main className="px-5 pb-6 flex flex-col gap-4">
      <div className="flex gap-2">
        <TabBtn value="upcoming" label={t.match.upcoming} />
        <TabBtn value="live" label={t.match.live} />
        <TabBtn value="done" label={t.match.done} />
      </div>

      {enriched.length === 0 ? (
        <div className="card-royal text-center text-cream/60">{t.home.noMatches}</div>
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
