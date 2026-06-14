import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

const USERNAME_RE = /^[a-z0-9._-]{3,20}$/;

export async function POST(req: Request) {
  try {
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

    const rawSecret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    console.error('[signup] secret key diagnostic:', {
      hasSecretKey: !!process.env.SUPABASE_SECRET_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      length: rawSecret.length,
      trimmedLength: rawSecret.trim().length,
      prefix: rawSecret.slice(0, 12),
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });

    const admin = createServiceClient();
    const email = `${username}@wcscouts.app`;

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
      console.error('[signup] createUser failed:', msg);
      if (msg.toLowerCase().includes('already')) {
        return NextResponse.json({ error: 'username_taken' }, { status: 409 });
      }
      return NextResponse.json({ error: 'create_failed', detail: msg }, { status: 400 });
    }

    const { error: updateErr } = await admin
      .from('profiles')
      .update({ username, full_name, ...(group_name ? { group_name } : {}) })
      .eq('id', created.user.id);
    if (updateErr) {
      console.error('[signup] profile update failed:', updateErr.message);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[signup] unhandled error:', msg);
    return NextResponse.json({ error: 'server_error', detail: msg }, { status: 500 });
  }
}
