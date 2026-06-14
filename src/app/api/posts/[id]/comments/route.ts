import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimitExceeded } from '../../_shared';
import type { PostCommentListItem } from '@/types/database';

const MAX_COMMENTS_PER_HOUR = 30;

interface CommentRow {
  id: number;
  post_id: number;
  user_id: string;
  body: string;
  created_at: string;
}

interface ProfileRow {
  id: string;
  username: string;
  full_name: string;
}

async function enrichComments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: CommentRow[]
): Promise<PostCommentListItem[]> {
  if (rows.length === 0) return [];
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, full_name')
    .in('id', userIds);
  const byId = new Map(((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p]));
  return rows.map((r) => ({
    id: r.id,
    post_id: r.post_id,
    user_id: r.user_id,
    username: byId.get(r.user_id)?.username ?? '',
    full_name: byId.get(r.user_id)?.full_name ?? '',
    body: r.body,
    created_at: r.created_at,
  }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('post_comments')
    .select('id, post_id, user_id, body, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('[feed] list comments error:', error.message);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  const comments = await enrichComments(supabase, (data ?? []) as CommentRow[]);
  return NextResponse.json({ comments });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const text = typeof body?.body === 'string' ? body.body.trim() : '';
  if (text.length < 1 || text.length > 280) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (await rateLimitExceeded(supabase, 'post_comments', user.id, MAX_COMMENTS_PER_HOUR)) {
    return NextResponse.json(
      { error: 'rate_limit', retry_after_seconds: 60 },
      { status: 429 }
    );
  }

  const { data: inserted, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, user_id: user.id, body: text })
    .select('id, post_id, user_id, body, created_at')
    .single();
  if (error || !inserted) {
    console.error('[feed] create comment error:', error?.message);
    return NextResponse.json({ error: 'server_error', detail: error?.message }, { status: 400 });
  }

  const [enriched] = await enrichComments(supabase, [inserted as CommentRow]);
  return NextResponse.json({ comment: enriched }, { status: 201 });
}
