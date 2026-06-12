'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ScoreStepper } from './ScoreStepper';
import { CheckCircle2, Save } from 'lucide-react';
import type { MatchWithTeams, Prediction, QualifierSide } from '@/types/database';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';
import { isLocked } from '@/lib/utils';

interface Props {
  match: MatchWithTeams;
  existing: Prediction | null;
  locale: Locale;
  t: Dictionary;
}

export function PredictionForm({ match, existing, locale, t }: Props) {
  const router = useRouter();
  const [home, setHome] = useState(existing?.home_score ?? 0);
  const [away, setAway] = useState(existing?.away_score ?? 0);
  const [qualifier, setQualifier] = useState<QualifierSide | null>(existing?.qualifier_pick ?? null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const locked = isLocked(match.kickoff_at);
  const isKO = match.stage !== 'group';

  function submit() {
    setError(null);
    start(async () => {
      try {
        const res = await fetch('/api/predictions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            match_id: match.id,
            home_score: home,
            away_score: away,
            qualifier_pick: isKO ? qualifier : null,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? 'failed');
        }
        setToast(t.match.saved);
        setTimeout(() => setToast(null), 2500);
        router.refresh();
      } catch {
        setError(t.common.error);
      }
    });
  }

  const teamsKnown = match.home && match.away;
  const homeName = match.home
    ? (locale === 'ar' ? match.home.name_ar : match.home.name_en)
    : t.match.tbd;
  const awayName = match.away
    ? (locale === 'ar' ? match.away.name_ar : match.away.name_en)
    : t.match.tbd;
  const homeFlag = match.home?.flag ?? '🏳️';
  const awayFlag = match.away?.flag ?? '🏳️';

  if (!teamsKnown) {
    return (
      <div className="card-royal-elev text-center text-cream/80 py-10">
        {t.match.teamsAnnouncedLater}
      </div>
    );
  }

  const qualifierBtn = (side: 'home' | 'away', flag: string, name: string) => {
    const active = qualifier === side;
    return (
      <button
        type="button"
        disabled={locked}
        onClick={() => setQualifier(side)}
        className="btn-royal text-xs"
        style={
          active
            ? {
                background: 'linear-gradient(135deg, #fdd34c 0%, #f5b50a 100%)',
                color: '#1c0743',
                borderColor: '#fcc028',
              }
            : undefined
        }
      >
        <span className="text-lg">{flag}</span>
        <span className="truncate">{name}</span>
      </button>
    );
  };

  return (
    <div className="card-royal-elev flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col items-center gap-3">
          <div className="text-5xl leading-none">{homeFlag}</div>
          <div className="font-bold text-center text-cream text-sm">{homeName}</div>
          <ScoreStepper value={home} onChange={setHome} disabled={locked} />
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="text-5xl leading-none">{awayFlag}</div>
          <div className="font-bold text-center text-cream text-sm">{awayName}</div>
          <ScoreStepper value={away} onChange={setAway} disabled={locked} />
        </div>
      </div>

      {isKO && (
        <div className="border-t border-gold-500/20 pt-4">
          <div className="text-sm font-semibold text-gold-300 mb-3 text-center">
            {t.match.qualifierLabel}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {qualifierBtn('home', homeFlag, homeName)}
            {qualifierBtn('away', awayFlag, awayName)}
          </div>
        </div>
      )}

      {error && <div className="text-red-300 text-sm font-semibold">{error}</div>}

      {!locked ? (
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="btn-gold disabled:opacity-60"
        >
          {pending ? (
            t.common.loading
          ) : (
            <>
              <Save className="h-5 w-5" />
              {t.match.submit}
            </>
          )}
        </button>
      ) : (
        <div className="chip chip-royal self-center">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {t.match.closed}
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
