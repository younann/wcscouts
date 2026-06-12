import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (prof?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { data, error } = await supabase.rpc('sync_match_results');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // RPC returns a set; take the first row.
  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({
    ok: true,
    updated: row?.updated_count ?? 0,
    scored: row?.scored_count ?? 0,
  });
}
