import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchReactionSummary, isReactionEmoji } from '../../_shared';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const emoji = body?.emoji;
  if (!isReactionEmoji(emoji)) {
    return NextResponse.json({ error: 'invalid_emoji' }, { status: 400 });
  }

  const { error } = await supabase
    .from('post_reactions')
    .upsert(
      { post_id: postId, user_id: user.id, emoji },
      { onConflict: 'post_id,user_id' }
    );
  if (error) {
    console.error('[feed] reaction upsert error:', error.message);
    return NextResponse.json({ error: 'server_error', detail: error.message }, { status: 400 });
  }

  const summary = await fetchReactionSummary(supabase, postId, user.id);
  return NextResponse.json({ post_id: postId, ...summary });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const { error } = await supabase
    .from('post_reactions')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', user.id);
  if (error) {
    console.error('[feed] reaction delete error:', error.message);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  const summary = await fetchReactionSummary(supabase, postId, user.id);
  return NextResponse.json({ post_id: postId, ...summary });
}
