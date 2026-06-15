import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: prof } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (prof?.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const nowIso = new Date().toISOString();
  const { error: upsertErr } = await supabase
    .from('app_settings')
    .upsert(
      [
        { key: 'scoring_starts_at', value: nowIso },
        { key: 'scoring_ends_at', value: null },
      ],
      { onConflict: 'key' }
    );
  if (upsertErr) {
    return NextResponse.json({ error: 'server_error', detail: upsertErr.message }, { status: 400 });
  }

  const { error: rpcErr } = await supabase.rpc('recompute_total_points');
  if (rpcErr) {
    return NextResponse.json({ error: 'recompute_failed', detail: rpcErr.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    scoring_starts_at: nowIso,
    scoring_ends_at: null,
  });
}
