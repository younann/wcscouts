import { Trophy, Crown } from 'lucide-react';
import type { Dictionary } from '@/lib/i18n/dictionaries';

interface Row {
  user_id: string;
  full_name: string;
  home_score: number;
  away_score: number;
  points_awarded: number | null;
}

interface Props {
  rows: Row[];
  actualHome: number;
  actualAway: number;
  meId: string | null;
  t: Dictionary;
}

function tierStyle(points: number | null) {
  if (points == null) return { bg: 'rgba(148, 98, 221, 0.15)', text: '#cdacff', label: '—' };
  if (points >= 5) return { bg: 'linear-gradient(135deg, #fdda59, #f5b50a)', text: '#160833', label: 'gold' };
  if (points >= 3) return { bg: 'rgba(192, 192, 192, 0.30)', text: '#f6efe1', label: 'silver' };
  if (points >= 1) return { bg: 'rgba(205, 127, 50, 0.30)', text: '#fed7aa', label: 'bronze' };
  return { bg: 'rgba(60, 30, 100, 0.45)', text: 'rgba(246,239,225,0.55)', label: 'miss' };
}

export function MatchPredictionBreakdown({ rows, actualHome, actualAway, meId, t }: Props) {
  if (rows.length === 0) return null;

  const sorted = [...rows].sort(
    (a, b) => (b.points_awarded ?? -1) - (a.points_awarded ?? -1)
  );

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-black text-cream flex items-center gap-2">
        <Trophy className="h-5 w-5 text-gold-300" />
        {t.predictions.allScoutsTitle}
      </h2>
      <div className="flex flex-col gap-2">
        {sorted.map((r, i) => {
          const me = r.user_id === meId;
          const exactly = r.home_score === actualHome && r.away_score === actualAway;
          const style = tierStyle(r.points_awarded);
          return (
            <div
              key={r.user_id}
              className="card-royal flex items-center gap-3"
              style={
                me
                  ? { borderColor: '#fcc028', background: 'linear-gradient(135deg, rgba(252,192,40,0.18) 0%, rgba(45,16,104,0.6) 100%)' }
                  : undefined
              }
            >
              <div className="w-6 text-center">
                {i === 0 ? (
                  <Crown className="h-5 w-5 text-gold-300 inline" />
                ) : (
                  <span className="font-black text-cream/40 text-sm">{i + 1}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-cream truncate">
                  {r.full_name}
                  {me && <span className="ms-2 text-[10px] uppercase text-gold-300">({t.predictions.you})</span>}
                </div>
                <div className="text-xs text-cream/60 tabular-nums">
                  {r.home_score}–{r.away_score}
                  {exactly && <span className="ms-2 text-gold-300 font-bold">✓ {t.predictions.perfect}</span>}
                </div>
              </div>
              <div
                className="rounded-xl px-3 py-1.5 text-sm font-black tabular-nums min-w-[3rem] text-center"
                style={{ background: style.bg, color: style.text }}
              >
                {r.points_awarded ?? '—'}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
