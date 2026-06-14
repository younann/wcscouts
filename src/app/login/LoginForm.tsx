'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogIn } from 'lucide-react';
import type { Dictionary } from '@/lib/i18n/dictionaries';

export function LoginForm({ t }: { t: Dictionary }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/home';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const supabase = createClient();
      const email = username.includes('@')
        ? username.trim().toLowerCase()
        : `${username.trim().toLowerCase()}@wcscouts.app`;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(t.auth.loginError);
        return;
      }
      router.replace(next);
      router.refresh();
    });
  }

  const inputCls =
    'rounded-2xl border-2 border-gold-500/30 bg-royal-950/60 px-4 py-3 text-base text-cream placeholder:text-cream/40 focus:border-gold-400 focus:outline-none';

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-gold-300">{t.auth.username}</span>
        <input
          type="text"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={inputCls}
          placeholder="scout01"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-gold-300">{t.auth.password}</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />
      </label>
      {error && <div className="text-red-300 text-sm font-semibold">{error}</div>}
      <button type="submit" disabled={pending} className="btn-gold disabled:opacity-60">
        {pending ? t.common.loading : (<><LogIn className="h-5 w-5" /> {t.auth.loginButton}</>)}
      </button>
    </form>
  );
}
