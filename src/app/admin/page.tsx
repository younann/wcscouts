import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n/server';
import { Users, CalendarDays, Settings, Download, Crown } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const { t } = await getT();
  const supabase = await createClient();

  const [{ count: userCount }, { count: matchCount }, { count: predCount }, { count: doneCount }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
    supabase.from('matches').select('*', { count: 'exact', head: true }),
    supabase.from('predictions').select('*', { count: 'exact', head: true }),
    supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'finished'),
  ]);

  const tiles = [
    { href: '/admin/matches', label: t.admin.matches, Icon: CalendarDays },
    { href: '/admin/users', label: t.admin.users, Icon: Users },
    { href: '/admin/scoring', label: t.admin.scoring, Icon: Settings },
    { href: '/admin/export', label: t.admin.export, Icon: Download },
    { href: '/admin/winners', label: t.admin.winners, Icon: Crown },
  ];

  return (
    <main className="px-5 pb-10 flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Users" value={userCount ?? 0} />
        <Stat label="Predictions" value={predCount ?? 0} />
        <Stat label="Matches" value={matchCount ?? 0} />
        <Stat label="Scored" value={doneCount ?? 0} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className="rounded-3xl p-5 text-royal-950 flex flex-col gap-3 active:scale-[0.98] transition"
            style={{
              background: 'linear-gradient(135deg, #fdd34c 0%, #f5b50a 60%, #d39400 100%)',
              boxShadow: '0 10px 30px -6px rgba(245,181,10,0.45)',
            }}
          >
            <Icon className="h-7 w-7" />
            <span className="font-black text-lg leading-tight">{label}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-royal-elev">
      <div className="text-xs text-cream/60 uppercase font-bold">{label}</div>
      <div className="text-3xl font-black gold-text tabular-nums">{value}</div>
    </div>
  );
}
