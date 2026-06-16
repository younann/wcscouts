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
    .in('key', ['leaderboard_from', 'leaderboard_to']);
  const rows = (data ?? []) as SettingRow[];
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string | null>;

  return NextResponse.json({
    leaderboard_from: map.leaderboard_from ?? null,
    leaderboard_to: map.leaderboard_to ?? null,
  });
}

export async function POST(req: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  const from = body.leaderboard_from;
  const to = body.leaderboard_to;

  if (from != null && typeof from !== 'string') {
    return NextResponse.json({ error: 'invalid_from' }, { status: 400 });
  }
  if (to != null && typeof to !== 'string') {
    return NextResponse.json({ error: 'invalid_to' }, { status: 400 });
  }
  if (from && Number.isNaN(Date.parse(from))) {
    return NextResponse.json({ error: 'invalid_from' }, { status: 400 });
  }
  if (to && Number.isNaN(Date.parse(to))) {
    return NextResponse.json({ error: 'invalid_to' }, { status: 400 });
  }
  if (from && to && Date.parse(to) < Date.parse(from)) {
    return NextResponse.json({ error: 'end_before_start' }, { status: 400 });
  }

  const fromIso = from ? new Date(from).toISOString() : null;
  const toIso = to ? new Date(to).toISOString() : null;

  const upserts = [
    { key: 'leaderboard_from', value: fromIso },
    { key: 'leaderboard_to', value: toIso },
  ];
  const { error: upsertErr } = await supabase
    .from('app_settings')
    .upsert(upserts, { onConflict: 'key' });
  if (upsertErr) {
    return NextResponse.json({ error: 'server_error', detail: upsertErr.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    leaderboard_from: fromIso,
    leaderboard_to: toIso,
  });
}
