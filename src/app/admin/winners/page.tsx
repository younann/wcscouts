import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n/server';
import { WinnersPicker } from './WinnersPicker';
import type { LeaderboardEntry } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function WinnersPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const { data } = await supabase
    .from('leaderboard')
    .select('*')
    .order('position', { ascending: true })
    .limit(50);
  const board = (data ?? []) as LeaderboardEntry[];
  return (
    <main className="px-5 pb-10 flex flex-col gap-4">
      <h1 className="text-xl font-black text-emerald-900">{t.admin.winners}</h1>
      <WinnersPicker
        board={board}
        labels={{
          first: t.leaderboard.first,
          second: t.leaderboard.second,
          third: t.leaderboard.third,
          save: t.common.save,
          pts: t.leaderboard.pts,
          markWinners: t.admin.markWinners,
        }}
      />
    </main>
  );
}
