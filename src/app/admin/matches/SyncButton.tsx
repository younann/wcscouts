'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export function SyncButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function sync() {
    setMsg(null);
    start(async () => {
      const res = await fetch('/api/admin/sync', { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(j.error ?? 'error');
        return;
      }
      setMsg(`✓ updated ${j.updated}, scored ${j.scored}`);
      router.refresh();
      setTimeout(() => setMsg(null), 4000);
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={sync} disabled={pending} className="btn-gold text-sm disabled:opacity-60">
        <RefreshCw className={`h-4 w-4 ${pending ? 'animate-spin' : ''}`} />
        Sync from TheSportsDB
      </button>
      {msg && <span className="text-xs font-semibold text-gold-300">{msg}</span>}
    </div>
  );
}
