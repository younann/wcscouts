import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n/server';
import { Podium } from '@/components/Podium';
import { Crown, Medal, Award } from 'lucide-react';
import type { LeaderboardEntry } from '@/types/database';

export const dynamic = 'force-dynamic';

function PositionBadge({ pos }: { pos: number }) {
  if (pos === 1) return <Crown className="h-5 w-5 text-gold-300" />;
  if (pos === 2) return <Medal className="h-5 w-5 text-cream/80" />;
  if (pos === 3) return <Award className="h-5 w-5 text-orange-400" />;
  return <span className="font-black text-cream/40 w-5 text-center">{pos}</span>;
}

export default async function LeaderboardPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('leaderboard')
    .select('*')
    .order('position', { ascending: true })
    .limit(200);
  const board = (data ?? []) as LeaderboardEntry[];
  const top3 = board.filter((e) => e.position <= 3);
  const rest = board.filter((e) => e.position > 3);

  return (
    <main className="px-5 pb-6 flex flex-col gap-5">
      <h1 className="text-2xl font-black gold-text flex items-center gap-2">
        <Crown className="h-6 w-6 text-gold-300" />
        {t.leaderboard.title}
      </h1>

      {board.length === 0 ? (
        <div className="card-royal text-center text-cream/60">{t.leaderboard.empty}</div>
      ) : (
        <>
          <Podium top3={top3} labels={{ ...t.leaderboard }} />
          <div className="flex flex-col gap-2">
            {rest.map((e) => {
              const me = e.id === user.id;
              return (
                <div
                  key={e.id}
                  className="card-royal flex items-center justify-between"
                  style={
                    me
                      ? {
                          borderColor: '#fcc028',
                          background:
                            'linear-gradient(135deg, rgba(252,192,40,0.18) 0%, rgba(45,16,104,0.6) 100%)',
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <PositionBadge pos={e.position} />
                    <div className="min-w-0">
                      <div className="font-bold text-cream truncate">{e.full_name}</div>
                      {e.group_name && (
                        <div className="text-xs text-cream/55 truncate">{e.group_name}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black gold-text tabular-nums">
                      {e.total_points}
                    </div>
                    <div className="text-[10px] text-cream/55 uppercase font-bold">
                      {t.leaderboard.pts}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
