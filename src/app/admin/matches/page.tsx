import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n/server';
import { MatchResultForm } from './MatchResultForm';
import { SyncButton } from './SyncButton';
import { formatKickoff } from '@/lib/utils';
import type { Match, Team } from '@/types/database';

export const dynamic = 'force-dynamic';

type Tab = 'pending' | 'scored';

export default async function AdminMatchesPage({
  searchParams,
}: { searchParams: Promise<{ tab?: string }> }) {
  const { locale, t } = await getT();
  const { tab: rawTab } = await searchParams;
  const tab: Tab = rawTab === 'scored' ? 'scored' : 'pending';
  const supabase = await createClient();

  let q = supabase.from('matches').select('*');
  if (tab === 'scored') {
    q = q.eq('status', 'finished').order('scored_at', { ascending: false });
  } else {
    q = q.neq('status', 'finished').order('kickoff_at', { ascending: true });
  }
  const { data: matchesRaw } = await q.limit(200);
  const matches = (matchesRaw ?? []) as Match[];

  const { data: allTeamsRaw } = await supabase
    .from('teams')
    .select('*')
    .order('name_en');
  const allTeams = (allTeamsRaw ?? []) as Team[];
  const teamsByCode = new Map(allTeams.map((tt) => [tt.code, tt]));

  const TabBtn = ({ value, label, count }: { value: Tab; label: string; count?: number }) => {
    const active = tab === value;
    return (
      <a
        href={`/admin/matches?tab=${value}`}
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
        {typeof count === 'number' && <span className="ms-1 opacity-75">({count})</span>}
      </a>
    );
  };

  const pendingLabel = locale === 'ar' ? 'بانتظار النتيجة' : 'Pending';
  const scoredLabel = locale === 'ar' ? 'منتهية' : 'Scored';
  const emptyLabel =
    tab === 'pending'
      ? locale === 'ar'
        ? 'لا توجد مباريات بانتظار النتيجة'
        : 'No pending matches'
      : locale === 'ar'
        ? 'لا توجد مباريات منتهية'
        : 'No scored matches';

  return (
    <main className="px-5 pb-10 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-black gold-text">{t.admin.matches}</h1>
        <SyncButton />
      </div>
      <div className="flex gap-2">
        <TabBtn value="pending" label={pendingLabel} />
        <TabBtn value="scored" label={scoredLabel} />
      </div>
      {matches.length === 0 ? (
        <div className="card text-center text-cream/60">{emptyLabel}</div>
      ) : (
        <div className="flex flex-col gap-2">
          {matches.map((m) => {
            const home = m.home_team ? teamsByCode.get(m.home_team) : undefined;
            const away = m.away_team ? teamsByCode.get(m.away_team) : undefined;
            return (
              <div key={m.id} className="card flex flex-col gap-2">
                <div className="text-[11px] uppercase font-bold text-emerald-700">
                  {(t.match as Record<string, string>)[m.stage] ?? m.stage}
                  {m.group_letter ? ` · ${m.group_letter}` : ''}
                  <span className="ms-2 text-slate-500 normal-case font-normal">
                    {formatKickoff(m.kickoff_at, locale)}
                  </span>
                  {m.status === 'finished' && (
                    <span className="chip bg-emerald-100 text-emerald-800 ms-2 normal-case">scored</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm font-bold">
                  <span>
                    {home ? `${home.flag} ${locale === 'ar' ? home.name_ar : home.name_en}` : '🏳️ TBD'}
                  </span>
                  <span className="text-cream/40">vs</span>
                  <span>
                    {away ? `${locale === 'ar' ? away.name_ar : away.name_en} ${away.flag}` : 'TBD 🏳️'}
                  </span>
                </div>
                <MatchResultForm
                  matchId={m.id}
                  isKO={m.stage !== 'group'}
                  allTeams={allTeams}
                  locale={locale}
                  initial={{
                    home_team: m.home_team,
                    away_team: m.away_team,
                    home_score: m.home_score,
                    away_score: m.away_score,
                    qualifier_team: m.qualifier_team,
                  }}
                  t={{
                    enterResult: t.admin.enterResult,
                    scoreMatch: t.admin.scoreMatch,
                    save: t.common.save,
                    qualifier: t.match.qualifierLabel,
                    home: home ? (locale === 'ar' ? home.name_ar : home.name_en) : 'TBD',
                    away: away ? (locale === 'ar' ? away.name_ar : away.name_en) : 'TBD',
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
