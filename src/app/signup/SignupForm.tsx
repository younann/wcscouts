'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserPlus } from 'lucide-react';
import type { Dictionary } from '@/lib/i18n/dictionaries';

const USERNAME_RE = /^[a-z0-9._-]{3,20}$/;

export function SignupForm({ t }: { t: Dictionary }) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const u = username.trim().toLowerCase();
    if (!USERNAME_RE.test(u)) {
      setError(t.auth.usernameRule);
      return;
    }
    if (fullName.trim().length < 2) {
      setError(t.auth.fullName);
      return;
    }
    if (password.length < 6) {
      setError(t.auth.passwordRule);
      return;
    }

    start(async () => {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: u,
          full_name: fullName.trim(),
          group_name: groupName.trim() || null,
          password,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error === 'username_taken' ? t.auth.usernameTaken : t.auth.signupError);
        return;
      }

      // Immediately sign in after successful signup
      const supabase = createClient();
      const email = `${u}@wcscouts.app`;
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        // Account created but sign-in failed — send to login
        router.replace('/login');
        return;
      }
      router.replace('/home');
      router.refresh();
    });
  }

  const inputCls =
    'rounded-2xl border-2 border-gold-500/30 bg-royal-950/60 px-4 py-3 text-base text-cream placeholder:text-cream/40 focus:border-gold-400 focus:outline-none';

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-gold-300">{t.auth.fullName}</span>
        <input
          type="text"
          autoComplete="name"
          required
          minLength={2}
          maxLength={50}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={inputCls}
        />
      </label>
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
        <span className="text-[10px] text-cream/50">{t.auth.usernameRule}</span>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-gold-300">{t.auth.groupOptional}</span>
        <input
          type="text"
          maxLength={30}
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-gold-300">{t.auth.password}</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />
        <span className="text-[10px] text-cream/50">{t.auth.passwordRule}</span>
      </label>
      {error && <div className="text-red-300 text-sm font-semibold">{error}</div>}
      <button type="submit" disabled={pending} className="btn-gold disabled:opacity-60">
        {pending ? t.common.loading : (<><UserPlus className="h-5 w-5" /> {t.auth.signupButton}</>)}
      </button>
    </form>
  );
}
