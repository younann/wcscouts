'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';
import type { PostListItem, ReactionEmoji } from '@/types/database';
import { Composer } from './Composer';
import { PostCard } from './PostCard';
import type { TaggableMatch } from './MatchTagPicker';

interface Props {
  t: Dictionary;
  locale: Locale;
  currentUserId: string;
  isAdmin: boolean;
  initialPosts: PostListItem[];
  taggableMatches: TaggableMatch[];
}

const POLL_INTERVAL_MS = 15_000;
const POLL_BACKOFF_MAX_MS = 120_000;
const PAGE_SIZE = 20;

export function FeedClient({
  t,
  locale,
  currentUserId,
  isAdmin,
  initialPosts,
  taggableMatches,
}: Props) {
  const [posts, setPosts] = useState<PostListItem[]>(initialPosts);
  const [pendingNew, setPendingNew] = useState<PostListItem[]>([]);
  const [hasMore, setHasMore] = useState(initialPosts.length === PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [composerFocused, setComposerFocused] = useState(false);

  const pollInFlight = useRef(false);
  const backoffRef = useRef(POLL_INTERVAL_MS);
  const composerFocusedRef = useRef(false);
  composerFocusedRef.current = composerFocused;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 3000);
  }, []);

  const mergePoll = useCallback((incoming: PostListItem[]) => {
    setPosts((prev) => {
      const prevById = new Map(prev.map((p) => [p.id, p]));
      const incomingIds = new Set(incoming.map((p) => p.id));
      const fresh: PostListItem[] = [];
      for (const p of incoming) {
        if (!prevById.has(p.id)) fresh.push(p);
      }

      const atTop = typeof window !== 'undefined' && window.scrollY < 80;
      if (fresh.length > 0 && !atTop) {
        setPendingNew((cur) => {
          const seen = new Set(cur.map((x) => x.id));
          return [...fresh.filter((x) => !seen.has(x.id)), ...cur];
        });
      }

      const merged: PostListItem[] = [];
      const headIds = incoming.map((p) => p.id);
      const headSet = new Set(headIds);
      const freshToPrepend = atTop ? fresh : [];
      const seen = new Set<number>();
      for (const p of freshToPrepend) {
        if (seen.has(p.id)) continue;
        merged.push(p);
        seen.add(p.id);
      }
      for (const p of incoming) {
        if (seen.has(p.id)) continue;
        merged.push(p);
        seen.add(p.id);
      }
      for (const p of prev) {
        if (seen.has(p.id)) continue;
        if (headSet.has(p.id) && !incomingIds.has(p.id)) continue;
        if (!atTop && fresh.some((f) => f.id === p.id)) continue;
        merged.push(p);
        seen.add(p.id);
      }
      return merged;
    });
  }, []);

  const poll = useCallback(async () => {
    if (pollInFlight.current) return;
    if (composerFocusedRef.current) return;
    pollInFlight.current = true;
    try {
      const res = await fetch(`/api/posts?limit=${PAGE_SIZE}`, { cache: 'no-store' });
      if (!res.ok) {
        backoffRef.current = Math.min(backoffRef.current * 2, POLL_BACKOFF_MAX_MS);
        return;
      }
      const j = (await res.json()) as { posts: PostListItem[] };
      backoffRef.current = POLL_INTERVAL_MS;
      mergePoll(j.posts ?? []);
    } catch {
      backoffRef.current = Math.min(backoffRef.current * 2, POLL_BACKOFF_MAX_MS);
    } finally {
      pollInFlight.current = false;
    }
  }, [mergePoll]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const schedule = () => {
      if (cancelled) return;
      timer = setTimeout(async () => {
        if (document.visibilityState === 'visible') {
          await poll();
        }
        schedule();
      }, backoffRef.current);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void poll();
    };

    schedule();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
    };
  }, [poll]);

  const handlePostCreated = useCallback((post: PostListItem) => {
    setPosts((prev) => [post, ...prev.filter((p) => p.id !== post.id)]);
  }, []);

  const handleReactionChanged = useCallback(
    (postId: number, reactions: PostListItem['reactions'], myReaction: ReactionEmoji | null) => {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, reactions, my_reaction: myReaction } : p))
      );
    },
    []
  );

  const handleCommentCountChanged = useCallback((postId: number, delta: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comment_count: Math.max(0, p.comment_count + delta) } : p
      )
    );
  }, []);

  const handlePostDeleted = useCallback((postId: number) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  const flushPending = useCallback(() => {
    if (pendingNew.length === 0) return;
    setPosts((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      const additions = pendingNew.filter((p) => !seen.has(p.id));
      return [...additions, ...prev];
    });
    setPendingNew([]);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pendingNew]);

  const loadMore = useCallback(async () => {
    if (loadingMore || posts.length === 0) return;
    setLoadingMore(true);
    try {
      const last = posts[posts.length - 1];
      const res = await fetch(
        `/api/posts?limit=${PAGE_SIZE}&before=${encodeURIComponent(last.created_at)}`,
        { cache: 'no-store' }
      );
      if (!res.ok) {
        showToast(t.feed.actionFailed);
        return;
      }
      const j = (await res.json()) as { posts: PostListItem[] };
      const newOnes = j.posts ?? [];
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...newOnes.filter((p) => !seen.has(p.id))];
      });
      if (newOnes.length < PAGE_SIZE) setHasMore(false);
    } catch {
      showToast(t.feed.actionFailed);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, posts, showToast, t.feed.actionFailed]);

  return (
    <>
      <Composer
        t={t}
        taggableMatches={taggableMatches}
        locale={locale}
        onCreated={handlePostCreated}
        onError={showToast}
        onFocusChange={setComposerFocused}
      />

      {pendingNew.length > 0 && (
        <button
          type="button"
          onClick={flushPending}
          className="sticky top-2 z-30 mx-auto rounded-full bg-gold-500 px-4 py-2 text-sm font-bold text-royal-950 shadow-royal"
        >
          {t.feed.newPostsBanner.replace('{n}', String(pendingNew.length))}
        </button>
      )}

      {posts.length === 0 ? (
        <div className="card-glass text-center py-10">
          <div className="text-xl font-black text-cream">{t.feed.emptyTitle}</div>
          <div className="text-sm text-cream/60 mt-2">{t.feed.emptyBody}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              t={t}
              post={p}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onReactionChanged={handleReactionChanged}
              onCommentCountChanged={handleCommentCountChanged}
              onDeleted={handlePostDeleted}
              onError={showToast}
            />
          ))}
        </div>
      )}

      {hasMore && posts.length > 0 && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="mx-auto mt-2 rounded-2xl border border-gold-500/30 bg-royal-950/60 px-5 py-2.5 text-sm font-semibold text-cream/80 disabled:opacity-60"
        >
          {loadingMore ? t.feed.loadingMore : t.feed.loadMore}
        </button>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-royal-950/95 px-4 py-2 text-sm text-cream shadow-royal border border-gold-500/30">
          {toast}
        </div>
      )}
    </>
  );
}
