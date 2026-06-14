'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import {
  REACTION_EMOJIS,
  type PostListItem,
  type ReactionEmoji,
} from '@/types/database';

interface Props {
  t: Dictionary;
  postId: number;
  reactions: PostListItem['reactions'];
  myReaction: ReactionEmoji | null;
  onChanged: (reactions: PostListItem['reactions'], my: ReactionEmoji | null) => void;
  onError: (msg: string) => void;
}

export function ReactionBar({ t, postId, reactions, myReaction, onChanged, onError }: Props) {
  const [pendingEmoji, setPendingEmoji] = useState<ReactionEmoji | null>(null);

  async function toggle(emoji: ReactionEmoji) {
    if (pendingEmoji) return;
    const willRemove = myReaction === emoji;

    // Optimistic
    const prevMy = myReaction;
    const optimistic: PostListItem['reactions'] = { ...reactions };
    if (prevMy) {
      optimistic[prevMy] = Math.max(0, (optimistic[prevMy] ?? 0) - 1);
      if (optimistic[prevMy] === 0) delete optimistic[prevMy];
    }
    if (!willRemove) {
      optimistic[emoji] = (optimistic[emoji] ?? 0) + 1;
    }
    onChanged(optimistic, willRemove ? null : emoji);
    setPendingEmoji(emoji);

    try {
      const res = willRemove
        ? await fetch(`/api/posts/${postId}/reactions`, { method: 'DELETE' })
        : await fetch(`/api/posts/${postId}/reactions`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emoji }),
          });
      if (!res.ok) {
        onChanged(reactions, prevMy);
        onError(t.feed.actionFailed);
        return;
      }
      const j = (await res.json()) as {
        reactions: PostListItem['reactions'];
        my_reaction: ReactionEmoji | null;
      };
      onChanged(j.reactions ?? {}, j.my_reaction ?? null);
    } catch {
      onChanged(reactions, prevMy);
      onError(t.feed.actionFailed);
    } finally {
      setPendingEmoji(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {REACTION_EMOJIS.map((e) => {
        const count = reactions[e] ?? 0;
        const active = myReaction === e;
        return (
          <button
            key={e}
            type="button"
            onClick={() => toggle(e)}
            aria-label={t.feed.reactAria.replace('{emoji}', e)}
            disabled={pendingEmoji !== null}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm transition',
              active
                ? 'border-gold-500/60 bg-gold-500/20 text-gold-200'
                : 'border-gold-500/15 bg-royal-950/40 text-cream/70 hover:bg-royal-950/70'
            )}
          >
            <span>{e}</span>
            {count > 0 && <span className="text-xs font-semibold">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
