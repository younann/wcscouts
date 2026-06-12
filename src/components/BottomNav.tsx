'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarDays, Trophy, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  labels: { home: string; matches: string; leaderboard: string; profile: string };
}

const items = [
  { href: '/home', icon: Home, key: 'home' as const },
  { href: '/matches', icon: CalendarDays, key: 'matches' as const },
  { href: '/leaderboard', icon: Trophy, key: 'leaderboard' as const },
  { href: '/profile', icon: User, key: 'profile' as const },
];

export function BottomNav({ labels }: Props) {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-md">
      <div className="m-3 rounded-3xl bg-royal-950/85 backdrop-blur-md border border-gold-500/25 shadow-royal">
        <ul className="grid grid-cols-4">
          {items.map(({ href, icon: Icon, key }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 py-3 transition',
                    active ? 'text-gold-300' : 'text-cream/50'
                  )}
                >
                  <Icon className={cn('h-6 w-6', active && 'drop-shadow-[0_0_8px_rgba(252,192,40,0.6)]')} />
                  <span className="text-[11px] font-semibold">{labels[key]}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
