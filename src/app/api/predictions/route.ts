import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'bad request' }, { status: 400 });
  const match_id = Number(body.match_id);
  const home_score = Number(body.home_score);
  const away_score = Number(body.away_score);
  const qualifier_pick = body.qualifier_pick ?? null;

  if (!Number.isFinite(match_id)) return NextResponse.json({ error: 'invalid match_id' }, { status: 400 });
  if (!Number.isInteger(home_score) || home_score < 0 || home_score > 30)
    return NextResponse.json({ error: 'invalid home_score' }, { status: 400 });
  if (!Number.isInteger(away_score) || away_score < 0 || away_score > 30)
    return NextResponse.json({ error: 'invalid away_score' }, { status: 400 });
  if (qualifier_pick !== null && qualifier_pick !== 'home' && qualifier_pick !== 'away')
    return NextResponse.json({ error: 'invalid qualifier_pick' }, { status: 400 });

  // Server-side deadline re-check (RLS also enforces but we want a clean error message)
  const { data: match } = await supabase
    .from('matches')
    .select('id, kickoff_at, stage')
    .eq('id', match_id)
    .single();
  if (!match) return NextResponse.json({ error: 'match not found' }, { status: 404 });
  if (new Date(match.kickoff_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'predictions closed' }, { status: 409 });
  }

  const payload = {
    user_id: user.id,
    match_id,
    home_score,
    away_score,
    qualifier_pick: match.stage === 'group' ? null : qualifier_pick,
  };

  const { error } = await supabase
    .from('predictions')
    .upsert(payload, { onConflict: 'user_id,match_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
