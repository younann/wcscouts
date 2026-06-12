import { createBrowserClient } from '@supabase/ssr';

function publicKey(): string {
  const k =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!k) throw new Error('Missing Supabase publishable/anon key');
  return k;
}

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, publicKey());
}
