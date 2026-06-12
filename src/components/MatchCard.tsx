import Link from 'next/link';
import { Clock, Lock, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { formatKickoff, timeUntil, isLocked } from '@/lib/utils';
import type { MatchWithTeams } from '@/types/database';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';

interface Props {
  match: MatchWithTeams;
  prediction?: { home_score: number; away_score: number; points_awarded: number | null } | null;
  locale: Locale;
  t: Dictionary;
  hideLink?: boolean;
}

function StageBadge({ stage, t }: { stage: string; t: Dictionary }) {
  const label = (t.match as Record<string, string>)[stage] ?? stage;
  return <span className="chip chip-royal">{label}</span>;
}

export function MatchCard({ match, prediction, locale, t, hideLink }: Props) {
  const locked = isLocked(match.kickoff_at);
  const finished = match.status === 'finished';
  const Chevron = locale === 'ar' ? ChevronLeft : ChevronRight;

  const inner = (
    <div className="card-royal flex flex-col gap-3 hover:border-gold-400/40 transition">
      <div className="flex items-center justify-between text-xs">
        <StageBadge stage={match.stage} t={t} />
        {finished ? (
          <span className="chip chip-royal">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t.match.finished}
          </span>
        ) : locked ? (
          <span className="chip" style={{ background: 'rgba(220,38,38,0.20)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.35)' }}>
            <Lock className="h-3.5 w-3.5" />
            {t.match.closed}
          </span>
        ) : (
          <span className="chip chip-gold">
            <Clock className="h-3.5 w-3.5" />
            {t.match.kickoffIn} {timeUntil(match.kickoff_at, locale)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-3xl leading-none">{match.home?.flag ?? '🏳️'}</span>
          <span className="font-bold truncate text-cream">
            {match.home
              ? (locale === 'ar' ? match.home.name_ar : match.home.name_en)
              : t.match.tbd}
          </span>
        </div>
        <div className="text-center min-w-[64px]">
          {finished ? (
            <div className="text-2xl font-black gold-text tabular-nums">
              {match.home_score} <span className="text-cream/40">–</span> {match.away_score}
            </div>
          ) : (
            <div className="text-xs text-cream/60 font-semibold uppercase">{t.match.vs}</div>
          )}
        </div>
        <div className="flex items-center gap-2 min-w-0 justify-end">
          <span className="font-bold truncate text-end text-cream">
            {match.away
              ? (locale === 'ar' ? match.away.name_ar : match.away.name_en)
              : t.match.tbd}
          </span>
          <span className="text-3xl leading-none">{match.away?.flag ?? '🏳️'}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-cream/60">
        <span>{formatKickoff(match.kickoff_at, locale)}</span>
        {prediction ? (
          <span className="chip chip-royal">
            {t.match.yourPrediction}: {prediction.home_score}–{prediction.away_score}
            {prediction.points_awarded != null && (
              <span className="ms-2 font-extrabold text-gold-300">+{prediction.points_awarded}</span>
            )}
          </span>
        ) : !match.home || !match.away ? (
          <span className="chip chip-royal">{t.match.teamsAnnouncedLater}</span>
        ) : !locked && !hideLink ? (
          <span className="chip chip-gold">
            {t.match.makePrediction}
            <Chevron className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
    </div>
  );

  const teamsKnown = match.home && match.away;
  if (hideLink || !teamsKnown) return inner;
  return <Link href={`/matches/${match.id}`}>{inner}</Link>;
}
