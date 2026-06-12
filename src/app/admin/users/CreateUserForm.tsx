'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';

interface Props {
  labels: {
    title: string;
    fullName: string;
    username: string;
    group: string;
    password: string;
    submit: string;
  };
}

export function CreateUserForm({ labels }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [group, setGroup] = useState('');
  const [password, setPassword] = useState('');
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          username: username.trim().toLowerCase(),
          group_name: group.trim() || null,
          password,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: j.error ?? 'error' });
        return;
      }
      setMsg({ ok: true, text: 'User created' });
      setFullName(''); setUsername(''); setGroup(''); setPassword('');
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="card-grad grid grid-cols-2 gap-2">
      <div className="col-span-2 font-bold text-emerald-900 flex items-center gap-2">
        <UserPlus className="h-4 w-4" /> {labels.title}
      </div>
      <input
        required
        placeholder={labels.fullName}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        className="col-span-2 rounded-xl border-2 border-emerald-100 px-3 py-2 text-sm bg-white"
      />
      <input
        required
        placeholder={labels.username}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="rounded-xl border-2 border-emerald-100 px-3 py-2 text-sm bg-white"
      />
      <input
        placeholder={labels.group}
        value={group}
        onChange={(e) => setGroup(e.target.value)}
        className="rounded-xl border-2 border-emerald-100 px-3 py-2 text-sm bg-white"
      />
      <input
        required
        type="text"
        minLength={6}
        placeholder={labels.password}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="col-span-2 rounded-xl border-2 border-emerald-100 px-3 py-2 text-sm bg-white"
      />
      <button type="submit" disabled={pending} className="btn-primary col-span-2 text-sm disabled:opacity-60">
        {pending ? '…' : labels.submit}
      </button>
      {msg && (
        <div className={`col-span-2 text-xs font-semibold ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>
          {msg.text}
        </div>
      )}
    </form>
  );
}
