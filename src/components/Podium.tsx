'use client';

import { motion } from 'framer-motion';
import { Trophy, Medal, Award } from 'lucide-react';
import type { LeaderboardEntry } from '@/types/database';

interface Props {
  top3: LeaderboardEntry[];
  labels: { first: string; second: string; third: string; pts: string };
}

export function Podium({ top3, labels }: Props) {
  const [first, second, third] = [
    top3.find((e) => e.position === 1),
    top3.find((e) => e.position === 2),
    top3.find((e) => e.position === 3),
  ];

  const items = [
    {
      entry: second, place: 2 as const, icon: Medal, label: labels.second, h: 'h-28',
      bg: 'linear-gradient(135deg, #f3f4f6 0%, #9ca3af 100%)',
    },
    {
      entry: first, place: 1 as const, icon: Trophy, label: labels.first, h: 'h-40',
      bg: 'linear-gradient(135deg, #fff4cf 0%, #f5b50a 60%, #a36f00 100%)',
    },
    {
      entry: third, place: 3 as const, icon: Award, label: labels.third, h: 'h-20',
      bg: 'linear-gradient(135deg, #fed7aa 0%, #c2410c 100%)',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 items-end">
      {items.map(({ entry, place, bg, icon: Icon, label, h }, i) => (
        <motion.div
          key={place}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.12, type: 'spring', stiffness: 220, damping: 20 }}
          className="flex flex-col items-center gap-2"
        >
          {entry ? (
            <>
              <div
                className="relative text-royal-950 rounded-3xl p-3 w-full text-center"
                style={{ background: bg, boxShadow: '0 10px 30px -6px rgba(245,181,10,0.40)' }}
              >
                <Icon className="h-7 w-7 mx-auto drop-shadow" />
                <div className="text-[10px] uppercase font-black mt-1 opacity-90">{label}</div>
              </div>
              <div className="text-center min-w-0 w-full">
                <div className="font-bold text-cream text-sm truncate">{entry.full_name}</div>
                <div className="text-xs text-gold-300 font-bold">
                  {entry.total_points} {labels.pts}
                </div>
              </div>
              <div
                className={`${h} w-full rounded-t-2xl`}
                style={{ background: 'linear-gradient(180deg, rgba(252,192,40,0.18), rgba(124,77,209,0.05))' }}
              />
            </>
          ) : (
            <div className={`${h} w-full rounded-t-2xl bg-royal-700/30`} />
          )}
        </motion.div>
      ))}
    </div>
  );
}
