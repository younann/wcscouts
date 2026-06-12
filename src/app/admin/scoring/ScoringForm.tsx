'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import type { ScoringRule } from '@/types/database';

export function ScoringForm({ initial, saveLabel }: { initial: ScoringRule[]; saveLabel: string }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(initial.map((r) => [r.key, r.value]))
  );
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function save() {
    setMsg(null);
    start(async () => {
      const res = await fetch('/api/admin/scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
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

  return (
    <div className="card-grad flex flex-col gap-3">
      {initial.map((r) => (
        <label key={r.key} className="flex items-center justify-between gap-3">
          <span className="font-semibold text-emerald-900">{r.label}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            value={values[r.key] ?? 0}
            onChange={(e) => setValues((v) => ({ ...v, [r.key]: Number(e.target.value) }))}
            className="w-20 rounded-xl border-2 border-emerald-100 px-3 py-2 text-center text-lg font-bold tabular-nums focus:border-emerald-500 outline-none"
          />
        </label>
      ))}
      <button onClick={save} disabled={pending} className="btn-primary disabled:opacity-60">
        <Save className="h-4 w-4" /> {saveLabel}
      </button>
      {msg && <div className="text-xs text-emerald-700 font-semibold">{msg}</div>}
    </div>
  );
}
