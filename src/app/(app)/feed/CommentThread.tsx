'use client';

import { useEffect, useState, useTransition } from 'react';
import { Send, X } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { PostCommentListItem } from '@/types/database';

interface Props {
  t: Dictionary;
  postId: number;
  currentUserId: string;
  isAdmin: boolean;
  onCountChanged: (delta: number) => void;
  onError: (msg: string) => void;
}

const MAX_LEN = 280;

export function CommentThread({
  t,
  postId,
  currentUserId,
  isAdmin,
  onCountChanged,
  onError,
}: Props) {
  const [comments, setComments] = useState<PostCommentListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [pending, start] = useTransition();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/posts/${postId}/comments`, { cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) onError(t.feed.actionFailed);
          return;
        }
        const j = (await res.json()) as { comments: PostCommentListItem[] };
        if (!cancelled) setComments(j.comments ?? []);
      } catch {
        if (!cancelled) onError(t.feed.actionFailed);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postId, onError, t.feed.actionFailed]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (trimmed.length < 1 || trimmed.length > MAX_LEN) return;
    start(async () => {
      try {
        const res = await fetch(`/api/posts/${postId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: trimmed }),
        });
        if (res.status === 429) {
          onError(t.feed.rateLimited);
          return;
        }
        if (!res.ok) {
          onError(t.feed.actionFailed);
          return;
        }
        const j = (await res.json()) as { comment: PostCommentListItem };
        setComments((cur) => [...(cur ?? []), j.comment]);
        onCountChanged(+1);
        setBody('');
      } catch {
        onError(t.feed.actionFailed);
      }
    });
  }

  async function deleteComment(id: number) {
    if (deletingId) return;
    setDeletingId(id);
    const prev = comments ?? [];
    setComments(prev.filter((c) => c.id !== id));
    onCountChanged(-1);
    try {
      const res = await fetch(`/api/comments/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setComments(prev);
        onCountChanged(+1);
        onError(t.feed.actionFailed);
      }
    } catch {
      setComments(prev);
      onCountChanged(+1);
      onError(t.feed.actionFailed);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mt-3 border-t border-gold-500/15 pt-3 flex flex-col gap-3">
      {loading && <div className="text-xs text-cream/50">{t.common.loading}</div>}
      {!loading && (comments?.length ?? 0) === 0 && (
        <div className="text-xs text-cream/40">—</div>
      )}
      {comments?.map((c) => {
        const canDelete = c.user_id === currentUserId || isAdmin;
        return (
          <div key={c.id} className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-xs">
                <span className="font-bold text-gold-300">@{c.username}</span>
                <span className="text-cream/40 px-1">·</span>
                <span className="text-cream/50">{formatRelativeTime(c.created_at, t.feed)}</span>
              </div>
              <div
                className="text-sm text-cream mt-0.5"
                dir="auto"
                style={{ overflowWrap: 'anywhere' }}
              >
                {c.body}
              </div>
            </div>
            {canDelete && (
              <button
                type="button"
                onClick={() => deleteComment(c.id)}
                aria-label={t.feed.deleteComment}
                disabled={deletingId === c.id}
                className="text-cream/40 hover:text-red-300 disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}

      <form onSubmit={submit} className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, MAX_LEN))}
          rows={1}
          maxLength={MAX_LEN}
          placeholder={t.feed.commentPlaceholder}
          dir="auto"
          className="flex-1 resize-none rounded-2xl border border-gold-500/20 bg-royal-950/60 px-3 py-2 text-sm text-cream placeholder:text-cream/40 focus:border-gold-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || body.trim().length === 0}
          aria-label={t.feed.sendComment}
          className="btn-gold disabled:opacity-60 px-3 py-2"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
