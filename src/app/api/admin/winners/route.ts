import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (prof?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'bad request' }, { status: 400 });

  const admin = createServiceClient();
  // Clear existing winners then set new
  await admin.from('profiles').update({ winner_place: null }).not('winner_place', 'is', null);

  const updates: { id: string; place: 1 | 2 | 3 }[] = [];
  if (body.first) updates.push({ id: String(body.first), place: 1 });
  if (body.second) updates.push({ id: String(body.second), place: 2 });
  if (body.third) updates.push({ id: String(body.third), place: 3 });

  for (const { id, place } of updates) {
    const { error } = await admin
      .from('profiles')
      .update({ winner_place: place })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
