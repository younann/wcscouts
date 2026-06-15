import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface SettingRow {
  key: string;
  value: string | null;
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  const { data: prof } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (prof?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  }
  return { supabase };
}

export async function GET() {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { data } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['scoring_starts_at', 'scoring_ends_at']);
  const rows = (data ?? []) as SettingRow[];
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string | null>;

  return NextResponse.json({
    scoring_starts_at: map.scoring_starts_at ?? null,
    scoring_ends_at: map.scoring_ends_at ?? null,
  });
}

export async function POST(req: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  const start = body.scoring_starts_at;
  const end = body.scoring_ends_at;

  if (start != null && typeof start !== 'string') {
    return NextResponse.json({ error: 'invalid_start' }, { status: 400 });
  }
  if (end != null && typeof end !== 'string') {
    return NextResponse.json({ error: 'invalid_end' }, { status: 400 });
  }
  if (start && Number.isNaN(Date.parse(start))) {
    return NextResponse.json({ error: 'invalid_start' }, { status: 400 });
  }
  if (end && Number.isNaN(Date.parse(end))) {
    return NextResponse.json({ error: 'invalid_end' }, { status: 400 });
  }
  if (start && end && Date.parse(end) < Date.parse(start)) {
    return NextResponse.json({ error: 'end_before_start' }, { status: 400 });
  }

  const startIso = start ? new Date(start).toISOString() : '1970-01-01T00:00:00Z';
  const endIso = end ? new Date(end).toISOString() : null;

  const upserts = [
    { key: 'scoring_starts_at', value: startIso },
    { key: 'scoring_ends_at', value: endIso },
  ];
  const { error: upsertErr } = await supabase
    .from('app_settings')
    .upsert(upserts, { onConflict: 'key' });
  if (upsertErr) {
    return NextResponse.json({ error: 'server_error', detail: upsertErr.message }, { status: 400 });
  }

  const { error: rpcErr } = await supabase.rpc('recompute_total_points');
  if (rpcErr) {
    return NextResponse.json({ error: 'recompute_failed', detail: rpcErr.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    scoring_starts_at: startIso,
    scoring_ends_at: endIso,
  });
}
