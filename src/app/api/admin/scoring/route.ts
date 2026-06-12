import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED = new Set(['exact_score', 'correct_outcome', 'goal_difference', 'correct_qualifier']);

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (prof?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.values) return NextResponse.json({ error: 'bad request' }, { status: 400 });
  const entries = Object.entries(body.values as Record<string, unknown>)
    .filter(([k]) => ALLOWED.has(k))
    .map(([k, v]) => [k, Number(v)] as const)
    .filter(([, v]) => Number.isInteger(v) && v >= 0 && v <= 100);

  for (const [key, value] of entries) {
    const { error } = await supabase
      .from('scoring_rules')
      .update({ value })
      .eq('key', key);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
