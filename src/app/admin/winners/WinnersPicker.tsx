'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, Medal, Award, Save } from 'lucide-react';
import type { LeaderboardEntry } from '@/types/database';

interface Props {
  board: LeaderboardEntry[];
  labels: {
    first: string;
    second: string;
    third: string;
    save: string;
    pts: string;
    markWinners: string;
  };
}

export function WinnersPicker({ board, labels }: Props) {
  const router = useRouter();
  const defaults = useMemo(() => ({
    first: board.find((e) => e.position === 1)?.id ?? '',
    second: board.find((e) => e.position === 2)?.id ?? '',
    third: board.find((e) => e.position === 3)?.id ?? '',
  }), [board]);
  const [picks, setPicks] = useState(defaults);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function save() {
    setMsg(null);
    start(async () => {
      const res = await fetch('/api/admin/winners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(picks),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(j.error ?? 'error');
        return;
      }
      setMsg('saved');
      router.refresh();
      setTimeout(() => setMsg(null), 2000);
    });
  }

  const PlacePicker = ({
    place,
    label,
    Icon,
    iconClass,
  }: {
    place: keyof typeof picks;
    label: string;
    Icon: typeof Crown;
    iconClass: string;
  }) => (
    <label className="card flex items-center gap-3">
      <Icon className={`h-6 w-6 ${iconClass}`} />
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase font-bold text-slate-500">{label}</div>
        <select
          value={picks[place]}
          onChange={(e) => setPicks((p) => ({ ...p, [place]: e.target.value }))}
          className="w-full rounded-xl border-2 border-emerald-100 px-2 py-2 text-sm bg-white"
        >
          <option value="">—</option>
          {board.map((e) => (
            <option key={e.id} value={e.id}>
              #{e.position} · {e.full_name} ({e.total_points} {labels.pts})
            </option>
          ))}
        </select>
      </div>
    </label>
  );

  return (
    <div className="flex flex-col gap-3">
      <PlacePicker place="first" label={labels.first} Icon={Crown} iconClass="text-amber-500" />
      <PlacePicker place="second" label={labels.second} Icon={Medal} iconClass="text-slate-400" />
      <PlacePicker place="third" label={labels.third} Icon={Award} iconClass="text-orange-600" />
      <button onClick={save} disabled={pending} className="btn-primary disabled:opacity-60">
        <Save className="h-4 w-4" /> {labels.markWinners}
      </button>
      {msg && <div className="text-xs text-emerald-700 font-semibold">{msg}</div>}
    </div>
  );
}
