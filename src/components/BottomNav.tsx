'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarDays, MessageSquare, Trophy, User, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type NavKey = 'home' | 'matches' | 'feed' | 'leaderboard' | 'profile';

interface Props {
  labels: Record<NavKey, string>;
}

const items: { href: string; icon: LucideIcon; key: NavKey }[] = [
  { href: '/home', icon: Home, key: 'home' },
  { href: '/matches', icon: CalendarDays, key: 'matches' },
  { href: '/feed', icon: MessageSquare, key: 'feed' },
  { href: '/leaderboard', icon: Trophy, key: 'leaderboard' },
  { href: '/profile', icon: User, key: 'profile' },
];

export function BottomNav({ labels }: Props) {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-md">
      <div className="m-3 rounded-3xl bg-royal-950/85 backdrop-blur-md border border-gold-500/25 shadow-royal">
        <ul className="grid grid-cols-5">
          {items.map(({ href, icon: Icon, key }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 py-3 px-1 transition',
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
