'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save, RotateCcw } from 'lucide-react';

interface Props {
  initialStart: string | null;
  initialEnd: string | null;
}

// HTML datetime-local inputs need YYYY-MM-DDTHH:mm without timezone suffix.
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

export function ScoringWindowForm({ initialStart, initialEnd }: Props) {
  const router = useRouter();
  const [start, setStart] = useState(isoToLocalInput(initialStart));
  const [end, setEnd] = useState(isoToLocalInput(initialEnd));
  const [pending, startTx] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function save() {
    setMsg(null);
    setErr(null);
    startTx(async () => {
      const payload = {
        scoring_starts_at: start ? new Date(start).toISOString() : null,
        scoring_ends_at: end ? new Date(end).toISOString() : null,
      };
      const res = await fetch('/api/admin/scoring-window', {
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

  function resetAll() {
    if (typeof window !== 'undefined') {
      const ok = window.confirm(
        'Reset everyone\'s points to zero?\nPredictions are kept; only future matches will count.'
      );
      if (!ok) return;
    }
    setMsg(null);
    setErr(null);
    startTx(async () => {
      const res = await fetch('/api/admin/reset-points', { method: 'POST' });
      const j = (await res.json().catch(() => ({}))) as {
        scoring_starts_at?: string;
        scoring_ends_at?: string | null;
        error?: string;
        detail?: string;
      };
      if (!res.ok) {
        setErr(j.detail ? `${j.error ?? 'error'}: ${j.detail}` : j.error ?? 'error');
        return;
      }
      if (j.scoring_starts_at) setStart(isoToLocalInput(j.scoring_starts_at));
      setEnd(isoToLocalInput(j.scoring_ends_at ?? null));
      setMsg('reset done');
      router.refresh();
      setTimeout(() => setMsg(null), 2000);
    });
  }

  return (
    <div className="card-grad flex flex-col gap-3">
      <div className="font-bold text-emerald-900">Scoring window</div>
      <div className="text-xs text-slate-500">
        Only matches whose kickoff falls inside this window count toward the leaderboard.
        Predictions and per-match points are preserved when you change this.
      </div>

      <label className="flex items-center justify-between gap-3">
        <span className="font-semibold text-emerald-900">From</span>
        <input
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="rounded-xl border-2 border-emerald-100 px-3 py-2 text-sm focus:border-emerald-500 outline-none"
        />
      </label>

      <label className="flex items-center justify-between gap-3">
        <span className="font-semibold text-emerald-900">To (optional)</span>
        <input
          type="datetime-local"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="rounded-xl border-2 border-emerald-100 px-3 py-2 text-sm focus:border-emerald-500 outline-none"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button onClick={save} disabled={pending} className="btn-primary disabled:opacity-60">
          <Save className="h-4 w-4" /> Save window
        </button>
        <button
          onClick={resetAll}
          disabled={pending}
          className="btn-primary disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)' }}
        >
          <RotateCcw className="h-4 w-4" /> Reset all points
        </button>
      </div>

      {msg && <div className="text-xs text-emerald-700 font-semibold">{msg}</div>}
      {err && <div className="text-xs text-red-700 font-semibold">{err}</div>}
    </div>
  );
}
