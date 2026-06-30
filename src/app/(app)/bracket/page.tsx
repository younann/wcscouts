import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n/server';
import { isRTL } from '@/lib/i18n/dictionaries';
import { BracketView } from '@/components/BracketView';
import type { Match, MatchWithTeams, Team } from '@/types/database';

export const dynamic = 'force-dynamic';

type Edge = {
  source_match_id: number;
  outcome: 'winner' | 'loser';
  dest_match_id: number;
  dest_slot: 'home' | 'away';
};

export default async function BracketPage() {
  const { locale, t } = await getT();
  const Back = isRTL(locale) ? ChevronRight : ChevronLeft;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: matchesRaw } = await supabase
    .from('matches')
    .select('*')
    .in('stage', ['r32', 'r16', 'qf', 'sf', '3rd', 'final']);
  const matches = (matchesRaw ?? []) as Match[];

  const codes = Array.from(
    new Set(matches.flatMap((m) => [m.home_team, m.away_team]).filter((c): c is string => !!c))
  );
  const { data: teamsRaw } = codes.length
    ? await supabase.from('teams').select('*').in('code', codes)
    : { data: [] as Team[] };
  const teamsByCode = new Map((teamsRaw ?? []).map((tt) => [(tt as Team).code, tt as Team]));

  const enriched: MatchWithTeams[] = matches.map((m) => ({
    ...m,
    home: m.home_team ? teamsByCode.get(m.home_team) ?? null : null,
    away: m.away_team ? teamsByCode.get(m.away_team) ?? null : null,
  }));

  const { data: edgesRaw } = await supabase
    .from('knockout_edges')
    .select('source_match_id, outcome, dest_match_id, dest_slot');
  const edges = (edgesRaw ?? []) as Edge[];

  return (
    <main className="px-3 pb-6 flex flex-col gap-3">
      <Link href="/matches" className="btn-ghost-light self-start text-sm">
        <Back className="h-4 w-4" />
        {t.common.back}
      </Link>
      <h1 className="text-lg font-black gold-text px-1">{t.bracket.title}</h1>
      <BracketView matches={enriched} edges={edges} locale={locale} t={t} />
    </main>
  );
}
