import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const head = headers.join(',');
  const body = rows.map((r) => headers.map((h) => csvEscape(r[h])).join(',')).join('\n');
  return `${head}\n${body}\n`;
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (prof?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const kind = url.searchParams.get('kind') ?? 'leaderboard';
  let rows: Record<string, unknown>[] = [];
  let filename = `${kind}.csv`;

  if (kind === 'leaderboard') {
    const { data } = await supabase
      .from('leaderboard')
      .select('position, username, full_name, group_name, total_points, winner_place')
      .order('position', { ascending: true });
    rows = (data ?? []) as Record<string, unknown>[];
  } else if (kind === 'predictions') {
    const { data } = await supabase
      .from('predictions')
      .select('id, user_id, match_id, home_score, away_score, qualifier_pick, points_awarded, created_at')
      .order('match_id', { ascending: true });
    rows = (data ?? []) as Record<string, unknown>[];
  } else if (kind === 'matches') {
    const { data } = await supabase
      .from('matches')
      .select('id, stage, group_letter, home_team, away_team, kickoff_at, home_score, away_score, qualifier_team, status')
      .order('kickoff_at', { ascending: true });
    rows = (data ?? []) as Record<string, unknown>[];
  } else {
    return NextResponse.json({ error: 'unknown kind' }, { status: 400 });
  }

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
