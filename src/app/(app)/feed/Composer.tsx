'use client';

import { useState, useTransition } from 'react';
import { Send } from 'lucide-react';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';
import type { PostListItem } from '@/types/database';
import { MatchTagPicker, type TaggableMatch } from './MatchTagPicker';

interface Props {
  t: Dictionary;
  locale: Locale;
  taggableMatches: TaggableMatch[];
  onCreated: (post: PostListItem) => void;
  onError: (msg: string) => void;
  onFocusChange?: (focused: boolean) => void;
}

const MAX_LEN = 280;

export function Composer({ t, locale, taggableMatches, onCreated, onError, onFocusChange }: Props) {
  const [body, setBody] = useState('');
  const [match, setMatch] = useState<TaggableMatch | null>(null);
  const [pending, start] = useTransition();

  const remaining = MAX_LEN - body.length;
  const valid = body.trim().length >= 1 && body.length <= MAX_LEN;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    start(async () => {
      try {
        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: body.trim(), match_id: match?.id ?? null }),
        });
        if (res.status === 429) {
          onError(t.feed.rateLimited);
          return;
        }
        if (!res.ok) {
          onError(t.feed.postError);
          return;
        }
        const j = (await res.json()) as { post: PostListItem };
        onCreated(j.post);
        setBody('');
        setMatch(null);
      } catch {
        onError(t.feed.postError);
      }
    });
  }

  return (
    <form onSubmit={submit} className="card-glass flex flex-col gap-3 relative z-30">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, MAX_LEN))}
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => onFocusChange?.(false)}
        rows={3}
        maxLength={MAX_LEN}
        placeholder={t.feed.composerPlaceholder}
        className="resize-none rounded-2xl border-2 border-gold-500/20 bg-royal-950/60 px-3 py-2 text-base text-cream placeholder:text-cream/40 focus:border-gold-400 focus:outline-none"
        dir="auto"
        style={{ overflowWrap: 'anywhere' }}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MatchTagPicker
          t={t}
          locale={locale}
          matches={taggableMatches}
          value={match}
          onChange={setMatch}
        />
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-cream/50">
            {t.feed.composerCounter.replace('{n}', String(body.length))}
          </span>
          <button
            type="submit"
            disabled={!valid || pending || remaining < 0}
            className="btn-gold disabled:opacity-60 px-4 py-2 text-sm"
          >
            {pending ? t.feed.posting : (
              <>
                <Send className="h-4 w-4" /> {t.feed.postButton}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
