import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const { error, count } = await supabase
    .from('posts')
    .delete({ count: 'exact' })
    .eq('id', postId);
  if (error) {
    console.error('[feed] delete post error:', error.message);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
  if (!count) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return new NextResponse(null, { status: 204 });
}
