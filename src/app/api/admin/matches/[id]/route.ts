import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (prof?.role !== 'admin') return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  return { supabase };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const r = await requireAdmin();
  if ('error' in r) return r.error;
  const { supabase } = r;
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'bad request' }, { status: 400 });

  const home_team = body.home_team ?? null;
  const away_team = body.away_team ?? null;
  const home_score = body.home_score === null ? null : Number(body.home_score);
  const away_score = body.away_score === null ? null : Number(body.away_score);
  const qualifier_team = body.qualifier_team ?? null;
  const score = Boolean(body.score);

  if (home_team !== null && typeof home_team !== 'string') {
    return NextResponse.json({ error: 'invalid home_team' }, { status: 400 });
  }
  if (away_team !== null && typeof away_team !== 'string') {
    return NextResponse.json({ error: 'invalid away_team' }, { status: 400 });
  }

  if (
    home_score !== null &&
    (!Number.isInteger(home_score) || home_score < 0 || home_score > 30)
  ) {
    return NextResponse.json({ error: 'invalid home_score' }, { status: 400 });
  }
  if (
    away_score !== null &&
    (!Number.isInteger(away_score) || away_score < 0 || away_score > 30)
  ) {
    return NextResponse.json({ error: 'invalid away_score' }, { status: 400 });
  }
  if (qualifier_team !== null && qualifier_team !== 'home' && qualifier_team !== 'away') {
    return NextResponse.json({ error: 'invalid qualifier' }, { status: 400 });
  }

  const { error: updErr } = await supabase
    .from('matches')
    .update({ home_team, away_team, home_score, away_score, qualifier_team })
    .eq('id', matchId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

  if (score) {
    if (home_score === null || away_score === null) {
      return NextResponse.json({ error: 'score required to compute points' }, { status: 400 });
    }
    const { error: rpcErr } = await supabase.rpc('score_match', { p_match_id: matchId });
    if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
