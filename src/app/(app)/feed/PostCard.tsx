'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Trash2 } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { PostListItem, ReactionEmoji } from '@/types/database';
import { ReactionBar } from './ReactionBar';
import { CommentThread } from './CommentThread';

interface Props {
  t: Dictionary;
  post: PostListItem;
  currentUserId: string;
  isAdmin: boolean;
  onReactionChanged: (
    postId: number,
    reactions: PostListItem['reactions'],
    my: ReactionEmoji | null
  ) => void;
  onCommentCountChanged: (postId: number, delta: number) => void;
  onDeleted: (postId: number) => void;
  onError: (msg: string) => void;
}

export function PostCard({
  t,
  post,
  currentUserId,
  isAdmin,
  onReactionChanged,
  onCommentCountChanged,
  onDeleted,
  onError,
}: Props) {
  const [showComments, setShowComments] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canDelete = post.user_id === currentUserId || isAdmin;

  async function handleDelete() {
    if (!canDelete || deleting) return;
    const ok = typeof window !== 'undefined'
      ? window.confirm(`${t.feed.deleteConfirmTitle}\n${t.feed.deleteConfirmBody}`)
      : true;
    if (!ok) return;
    setDeleting(true);
    onDeleted(post.id);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) {
        onError(t.feed.actionFailed);
      }
    } catch {
      onError(t.feed.actionFailed);
    } finally {
      setDeleting(false);
    }
  }

  const matchChip = post.match
    ? (
        <Link
          href={`/matches/${post.match.id}`}
          aria-label={t.feed.matchChipAria}
          className="inline-flex items-center gap-1 rounded-full bg-gold-500/10 px-2 py-0.5 text-[11px] text-gold-200 border border-gold-500/25"
        >
          <span>{post.match.home_flag ?? post.match.home_team ?? '?'}</span>
          <span className="opacity-50">vs</span>
          <span>{post.match.away_flag ?? post.match.away_team ?? '?'}</span>
        </Link>
      )
    : null;

  return (
    <article className="card-glass flex flex-col gap-3">
      <header className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm">
            <span className="font-bold text-cream">{post.full_name || post.username}</span>
            <span className="text-cream/40 px-1">·</span>
            <span className="text-cream/60">@{post.username}</span>
            <span className="text-cream/40 px-1">·</span>
            <span className="text-cream/50">{formatRelativeTime(post.created_at, t.feed)}</span>
          </div>
          {matchChip && <div className="mt-1">{matchChip}</div>}
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            aria-label={t.feed.deletePost}
            className="text-cream/40 hover:text-red-300 disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </header>

      <p
        className="text-[15px] text-cream whitespace-pre-wrap"
        dir="auto"
        style={{ overflowWrap: 'anywhere' }}
      >
        {post.body}
      </p>

      <ReactionBar
        t={t}
        postId={post.id}
        reactions={post.reactions}
        myReaction={post.my_reaction}
        onChanged={(reactions, my) => onReactionChanged(post.id, reactions, my)}
        onError={onError}
      />

      <button
        type="button"
        onClick={() => setShowComments((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-cream/70 hover:text-gold-300"
      >
        <MessageCircle className="h-4 w-4" />
        {t.feed.commentsCount.replace('{n}', String(post.comment_count))}
      </button>

      {showComments && (
        <CommentThread
          t={t}
          postId={post.id}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onCountChanged={(delta) => onCommentCountChanged(post.id, delta)}
          onError={onError}
        />
      )}

    </article>
  );
}
