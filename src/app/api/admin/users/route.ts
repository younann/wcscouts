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
  const username = String(body.username ?? '').trim().toLowerCase();
  const full_name = String(body.full_name ?? '').trim();
  const group_name = body.group_name ? String(body.group_name).trim() : null;
  const password = String(body.password ?? '');
  if (!username || !full_name || password.length < 6) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  }
  if (!/^[a-z0-9._-]+$/.test(username)) {
    return NextResponse.json({ error: 'username must be lowercase letters/numbers/._-' }, { status: 400 });
  }

  const admin = createServiceClient();
  // Synthesise email from username to satisfy Supabase Auth (email required)
  const email = `${username}@wcscouts.app`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, full_name },
  });
  if (createErr || !created.user) {
    return NextResponse.json({ error: createErr?.message ?? 'create failed' }, { status: 400 });
  }
  // Profile row is created by trigger; update group_name if provided
  if (group_name) {
    await admin
      .from('profiles')
      .update({ group_name, full_name, username })
      .eq('id', created.user.id);
  } else {
    await admin
      .from('profiles')
      .update({ full_name, username })
      .eq('id', created.user.id);
  }
  return NextResponse.json({ ok: true, id: created.user.id });
}
