import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

const USERNAME_RE = /^[a-z0-9._-]{3,20}$/;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'bad request' }, { status: 400 });

  const username = String(body.username ?? '').trim().toLowerCase();
  const full_name = String(body.full_name ?? '').trim();
  const group_name = body.group_name ? String(body.group_name).trim() : null;
  const password = String(body.password ?? '');

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json({ error: 'invalid username' }, { status: 400 });
  }
  if (full_name.length < 2 || full_name.length > 50) {
    return NextResponse.json({ error: 'invalid full_name' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'password too short' }, { status: 400 });
  }

  const admin = createServiceClient();
  const email = `${username}@wcscouts.local`;

  // Check uniqueness first (cleaner error than relying on the auth error string)
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'username_taken' }, { status: 409 });
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, full_name },
  });
  if (createErr || !created.user) {
    const msg = createErr?.message ?? '';
    if (msg.toLowerCase().includes('already')) {
      return NextResponse.json({ error: 'username_taken' }, { status: 409 });
    }
    return NextResponse.json({ error: 'create_failed' }, { status: 400 });
  }

  // The on_auth_user_created trigger creates the profile row; patch the
  // fields the trigger can't infer (group_name, ensure name & username).
  await admin
    .from('profiles')
    .update({ username, full_name, ...(group_name ? { group_name } : {}) })
    .eq('id', created.user.id);

  return NextResponse.json({ ok: true });
}
