'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut } from 'lucide-react';

export function LogoutButton({ label }: { label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onClick() {
    start(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace('/');
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="btn-royal justify-center disabled:opacity-60"
    >
      <LogOut className="h-4 w-4" />
      {label}
    </button>
  );
}
