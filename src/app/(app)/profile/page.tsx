import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n/server';
import { LogoutButton } from '@/components/LogoutButton';
import { Trophy, Users, ScrollText, ShieldCheck } from 'lucide-react';
import type { LeaderboardEntry, Profile } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const { t } = await getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profileRow } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const profile = profileRow as Profile | null;
  const { data: rankRow } = await supabase
    .from('leaderboard')
    .select('position')
    .eq('id', user.id)
    .maybeSingle();
  const rank = (rankRow as LeaderboardEntry | null)?.position ?? null;

  const tile = (
    background: string,
    border: string,
  ): React.CSSProperties => ({ background, border });

  return (
    <main className="px-5 pb-6 flex flex-col gap-4">
      <section className="card-royal-elev">
        <div className="flex items-center gap-4">
          <div
            className="h-16 w-16 rounded-full grid place-items-center text-royal-950 text-2xl font-black"
            style={{
              background: 'linear-gradient(135deg, #fdd34c 0%, #f5b50a 100%)',
              boxShadow: '0 10px 30px -8px rgba(245,181,10,0.5)',
            }}
          >
            {profile?.full_name?.charAt(0) ?? '?'}
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black text-cream truncate">
              {profile?.full_name ?? ''}
            </div>
            {profile?.group_name && (
              <div className="text-sm text-cream/70 truncate">
                <Users className="inline h-3.5 w-3.5 me-1" />
                {profile.group_name}
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div
            className="rounded-2xl p-3"
            style={tile('rgba(28,7,67,0.55)', '1px solid rgba(252,192,40,0.30)')}
          >
            <div className="text-xs text-cream/65">{t.profile.points}</div>
            <div className="text-2xl font-black gold-text tabular-nums">
              {profile?.total_points ?? 0}
            </div>
          </div>
          <div
            className="rounded-2xl p-3"
            style={tile('rgba(28,7,67,0.55)', '1px solid rgba(252,192,40,0.30)')}
          >
            <div className="text-xs text-cream/65">{t.home.yourRank}</div>
            <div className="text-2xl font-black gold-text tabular-nums">
              {rank ? `#${rank}` : '—'}
            </div>
          </div>
        </div>
      </section>

      <Link href="/predictions" className="card-royal flex items-center justify-between">
        <span className="flex items-center gap-3 font-semibold text-cream">
          <ScrollText className="h-5 w-5 text-gold-300" /> {t.profile.myPredictions}
        </span>
        <Trophy className="h-4 w-4 text-gold-300" />
      </Link>

      {profile?.role === 'admin' && (
        <Link
          href="/admin"
          className="card-royal flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(252,192,40,0.18) 0%, rgba(45,16,104,0.6) 100%)',
            borderColor: 'rgba(252,192,40,0.45)',
          }}
        >
          <span className="flex items-center gap-3 font-semibold text-gold-200">
            <ShieldCheck className="h-5 w-5 text-gold-300" /> {t.admin.title}
          </span>
        </Link>
      )}

      <LogoutButton label={t.auth.logout} />
    </main>
  );
}
