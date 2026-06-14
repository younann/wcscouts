import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enrichPosts, rateLimitExceeded } from './_shared';

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
const MAX_POSTS_PER_HOUR = 10;

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const before = url.searchParams.get('before');
  const after = url.searchParams.get('after');
  const limitRaw = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.trunc(limitRaw), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  let q = supabase
    .from('posts')
    .select('id, user_id, body, match_id, created_at')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  if (before) q = q.lt('created_at', before);
  if (after) q = q.gt('created_at', after);

  const { data: rawPosts, error } = await q;
  if (error) {
    console.error('[feed] list error:', error.message);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  const posts = await enrichPosts(supabase, rawPosts ?? [], user.id);
  const nextCursor = posts.length === limit ? posts[posts.length - 1].created_at : null;

  return NextResponse.json({ posts, next_cursor: nextCursor });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (text.length < 1 || text.length > 280) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  let matchId: number | null = null;
  if (body.match_id != null) {
    const n = Number(body.match_id);
    if (!Number.isInteger(n)) {
      return NextResponse.json({ error: 'invalid_match_id' }, { status: 400 });
    }
    matchId = n;
  }

  if (await rateLimitExceeded(supabase, 'posts', user.id, MAX_POSTS_PER_HOUR)) {
    return NextResponse.json(
      { error: 'rate_limit', retry_after_seconds: 60 },
      { status: 429 }
    );
  }

  const { data: inserted, error } = await supabase
    .from('posts')
    .insert({ user_id: user.id, body: text, match_id: matchId })
    .select('id, user_id, body, match_id, created_at')
    .single();
  if (error || !inserted) {
    console.error('[feed] create error:', error?.message);
    return NextResponse.json({ error: 'server_error', detail: error?.message }, { status: 400 });
  }

  const [enriched] = await enrichPosts(supabase, [inserted], user.id);
  return NextResponse.json({ post: enriched }, { status: 201 });
}
