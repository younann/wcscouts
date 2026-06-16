'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { CalendarRange, X } from 'lucide-react';

interface Props {
  initialFrom: string;
  initialTo: string;
  labels: { from: string; to: string; clear: string; rangeHint: string };
}

// HTML date inputs use YYYY-MM-DD. We treat the value as a calendar day in
// the user's local timezone; the page converts to ISO at the day boundaries.
export function LeaderboardDateFilter({ initialFrom, initialTo, labels }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [pending, startTx] = useTransition();

  function apply(nextFrom: string, nextTo: string) {
    const params = new URLSearchParams();
    if (nextFrom) params.set('from', nextFrom);
    if (nextTo) params.set('to', nextTo);
    const qs = params.toString();
    startTx(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  const active = Boolean(from || to);

  return (
    <div className="card-royal flex flex-col gap-2">
      <div className="flex items-center gap-2 text-cream/80 text-xs font-bold">
        <CalendarRange className="h-4 w-4 text-gold-300" />
        {labels.rangeHint}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-cream/80 text-xs font-semibold">
          <span>{labels.from}</span>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              const v = e.target.value;
              setFrom(v);
              apply(v, to);
            }}
            disabled={pending}
            className="rounded-xl bg-royal-900/60 border border-royal-500/40 px-2 py-1.5 text-cream text-sm outline-none focus:border-gold-300"
          />
        </label>
        <label className="flex items-center gap-2 text-cream/80 text-xs font-semibold">
          <span>{labels.to}</span>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              const v = e.target.value;
              setTo(v);
              apply(from, v);
            }}
            disabled={pending}
            className="rounded-xl bg-royal-900/60 border border-royal-500/40 px-2 py-1.5 text-cream text-sm outline-none focus:border-gold-300"
          />
        </label>
        {active && (
          <button
            type="button"
            onClick={() => {
              setFrom('');
              setTo('');
              apply('', '');
            }}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-xl bg-royal-700/60 border border-royal-500/40 px-3 py-1.5 text-cream/90 text-xs font-bold hover:bg-royal-600/60"
          >
            <X className="h-3.5 w-3.5" />
            {labels.clear}
          </button>
        )}
      </div>
    </div>
  );
}
