'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X } from 'lucide-react';

interface Props {
  initialFrom: string | null;
  initialTo: string | null;
}

function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

export function LeaderboardWindowForm({ initialFrom, initialTo }: Props) {
  const router = useRouter();
  const [from, setFrom] = useState(isoToLocalInput(initialFrom));
  const [to, setTo] = useState(isoToLocalInput(initialTo));
  const [pending, startTx] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function save(nextFrom: string, nextTo: string) {
    setMsg(null);
    setErr(null);
    startTx(async () => {
      const payload = {
        leaderboard_from: nextFrom ? new Date(nextFrom).toISOString() : null,
        leaderboard_to: nextTo ? new Date(nextTo).toISOString() : null,
      };
      const res = await fetch('/api/admin/leaderboard-window', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
      if (!res.ok) {
        setErr(j.detail ? `${j.error ?? 'error'}: ${j.detail}` : j.error ?? 'error');
        return;
      }
      setMsg('saved');
      router.refresh();
      setTimeout(() => setMsg(null), 2000);
    });
  }

  function clearAll() {
    setFrom('');
    setTo('');
    save('', '');
  }

  return (
    <div className="card-grad flex flex-col gap-3">
      <div className="font-bold text-emerald-900">Leaderboard window</div>
      <div className="text-xs text-slate-500">
        Only points from matches scored inside this window will show on the public leaderboard.
        Leave both empty to show the full tournament.
      </div>

      <label className="flex items-center justify-between gap-3">
        <span className="font-semibold text-emerald-900">From</span>
        <input
          type="datetime-local"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-xl border-2 border-emerald-100 px-3 py-2 text-sm focus:border-emerald-500 outline-none"
        />
      </label>

      <label className="flex items-center justify-between gap-3">
        <span className="font-semibold text-emerald-900">To (optional)</span>
        <input
          type="datetime-local"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-xl border-2 border-emerald-100 px-3 py-2 text-sm focus:border-emerald-500 outline-none"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => save(from, to)}
          disabled={pending}
          className="btn-primary disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> Save window
        </button>
        <button
          onClick={clearAll}
          disabled={pending}
          className="btn-primary disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)' }}
        >
          <X className="h-4 w-4" /> Clear
        </button>
      </div>

      {msg && <div className="text-xs text-emerald-700 font-semibold">{msg}</div>}
      {err && <div className="text-xs text-red-700 font-semibold">{err}</div>}
    </div>
  );
}
