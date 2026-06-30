import Link from 'next/link';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MatchWithTeams } from '@/types/database';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';

type Edge = {
  source_match_id: number;
  outcome: 'winner' | 'loser';
  dest_match_id: number;
  dest_slot: 'home' | 'away';
};

interface Props {
  matches: MatchWithTeams[];
  edges: Edge[];
  locale: Locale;
  t: Dictionary;
}

function winnerSide(m: MatchWithTeams): 'home' | 'away' | null {
  if (m.status !== 'finished') return null;
  if (m.home_score != null && m.away_score != null) {
    if (m.home_score > m.away_score) return 'home';
    if (m.away_score > m.home_score) return 'away';
  }
  return m.qualifier_team ?? null;
}

function MatchBox({ m, locale, t }: { m: MatchWithTeams; locale: Locale; t: Dictionary }) {
  const winner = winnerSide(m);
  const finished = m.status === 'finished';

  const row = (side: 'home' | 'away') => {
    const team = side === 'home' ? m.home : m.away;
    const score = side === 'home' ? m.home_score : m.away_score;
    const isWin = winner === side;
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 px-2 py-1.5 rounded-lg',
          isWin && 'bg-gold-500/15'
        )}
      >
        <span className="text-base leading-none">{team?.flag ?? '🏳️'}</span>
        <span
          className={cn(
            'flex-1 truncate text-xs font-bold',
            isWin ? 'text-gold-200' : team ? 'text-cream/85' : 'text-cream/40'
          )}
        >
          {team ? team.code : t.match.tbd}
        </span>
        {isWin && <Check className="h-3 w-3 shrink-0 text-gold-300" />}
        {finished && score != null && (
          <span
            className={cn(
              'shrink-0 text-xs font-black tabular-nums',
              isWin ? 'text-gold-200' : 'text-cream/70'
            )}
          >
            {score}
          </span>
        )}
      </div>
    );
  };

  const inner = (
    <div className="bkt-box card-royal !p-1.5 flex flex-col gap-0.5">
      {row('home')}
      <div className="h-px bg-gold-500/15 mx-2" />
      {row('away')}
    </div>
  );

  const teamsKnown = m.home && m.away;
  if (!teamsKnown) return inner;
  return (
    <Link href={`/matches/${m.id}`} className="block hover:opacity-90 transition">
      {inner}
    </Link>
  );
}

export function BracketView({ matches, edges, locale, t }: Props) {
  const byId = new Map<number, MatchWithTeams>(matches.map((m) => [m.id, m]));

  // Parent -> its two feeders (winner edges only build the main tree).
  const feeders = new Map<number, { home?: number; away?: number }>();
  for (const e of edges) {
    if (e.outcome !== 'winner') continue;
    const cur = feeders.get(e.dest_match_id) ?? {};
    cur[e.dest_slot] = e.source_match_id;
    feeders.set(e.dest_match_id, cur);
  }

  const finalMatch = matches.find((m) => m.stage === 'final');
  const thirdMatch = matches.find((m) => m.stage === '3rd');

  const Node = ({ id }: { id: number }): React.ReactElement | null => {
    const m = byId.get(id);
    if (!m) return null;
    const kids = feeders.get(id);
    if (!kids || (kids.home == null && kids.away == null)) {
      // Leaf (Round of 32): box only, no incoming connector.
      return (
        <div className="bkt-node">
          <div className="bkt-self bkt-self--leaf">
            <MatchBox m={m} locale={locale} t={t} />
          </div>
        </div>
      );
    }
    return (
      <div className="bkt-node">
        <div className="bkt-kids">
          <div className="bkt-kid">{kids.home != null && <Node id={kids.home} />}</div>
          <div className="bkt-kid">{kids.away != null && <Node id={kids.away} />}</div>
        </div>
        <div className="bkt-self">
          <MatchBox m={m} locale={locale} t={t} />
        </div>
      </div>
    );
  };

  const headers = [
    t.match.r32,
    t.match.r16,
    t.match.qf,
    t.match.sf,
    t.match.final,
  ];

  return (
    <div className="bkt-scroll" dir="ltr">
      <div className="bkt-inner">
        <div className="bkt-headers">
          {headers.map((h) => (
            <div key={h} className="bkt-header">
              {h}
            </div>
          ))}
        </div>

        {finalMatch ? (
          <Node id={finalMatch.id} />
        ) : (
          <div className="text-cream/60 text-sm p-4">—</div>
        )}

        {thirdMatch && (
          <div className="bkt-third">
            <div className="text-[11px] font-bold uppercase tracking-wide text-gold-300/80 mb-1.5">
              {t.bracket.thirdPlace}
            </div>
            <MatchBox m={thirdMatch} locale={locale} t={t} />
          </div>
        )}
      </div>
    </div>
  );
}
