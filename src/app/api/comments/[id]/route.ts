import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const commentId = Number(id);
  if (!Number.isInteger(commentId)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const { error, count } = await supabase
    .from('post_comments')
    .delete({ count: 'exact' })
    .eq('id', commentId);
  if (error) {
    console.error('[feed] delete comment error:', error.message);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
  if (!count) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return new NextResponse(null, { status: 204 });
}
