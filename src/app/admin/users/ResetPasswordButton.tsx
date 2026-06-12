'use client';

import { useState, useTransition } from 'react';
import { KeyRound } from 'lucide-react';

export function ResetPasswordButton({ userId, label }: { userId: string; label: string }) {
  const [pending, start] = useTransition();
  const [newPw, setNewPw] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function onClick() {
    setErr(null);
    setNewPw(null);
    const password = prompt('New password (min 6 chars)') ?? '';
    if (password.length < 6) return;
    start(async () => {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j.error ?? 'error');
        return;
      }
      setNewPw('OK');
      setTimeout(() => setNewPw(null), 2000);
    });
  }

  return (
    <div className="flex flex-col items-end">
      <button onClick={onClick} disabled={pending} className="btn-ghost text-xs">
        <KeyRound className="h-3.5 w-3.5" />
        {label}
      </button>
      {newPw && <span className="text-[10px] text-emerald-700 font-bold">✓</span>}
      {err && <span className="text-[10px] text-red-600 font-bold">{err}</span>}
    </div>
  );
}
