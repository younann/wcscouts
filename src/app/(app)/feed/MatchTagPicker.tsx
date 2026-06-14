'use client';

import { useState } from 'react';
import { Tag, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';

export interface TaggableMatch {
  id: number;
  home_team: string | null;
  away_team: string | null;
  home_flag: string | null;
  away_flag: string | null;
  kickoff_at: string;
}

interface Props {
  t: Dictionary;
  locale: Locale;
  matches: TaggableMatch[];
  value: TaggableMatch | null;
  onChange: (m: TaggableMatch | null) => void;
}

function formatChip(m: TaggableMatch, locale: Locale): string {
  const time = new Date(m.kickoff_at).toLocaleString(locale === 'ar' ? 'ar' : 'en-GB', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const home = m.home_flag ?? m.home_team ?? '?';
  const away = m.away_flag ?? m.away_team ?? '?';
  return `${home} vs ${away} · ${time}`;
}

export function MatchTagPicker({ t, locale, matches, value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  if (value) {
    return (
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-label={t.feed.removeTag}
        className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/15 px-3 py-1 text-xs font-semibold text-gold-300 border border-gold-500/30"
      >
        {formatChip(value, locale)}
        <X className="h-3.5 w-3.5" />
      </button>
    );
  }

  if (matches.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/30 px-3 py-1 text-xs font-semibold text-cream/80"
      >
        <Tag className="h-3.5 w-3.5" />
        {t.feed.tagMatch}
      </button>
      {open && (
        <div className="absolute z-40 mt-2 max-h-64 w-72 overflow-y-auto rounded-2xl border border-gold-500/25 bg-royal-950/95 p-2 shadow-royal">
          {matches.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                onChange(m);
                setOpen(false);
              }}
              className={cn(
                'w-full text-left px-3 py-2 rounded-xl text-sm text-cream hover:bg-gold-500/10'
              )}
            >
              {formatChip(m, locale)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
