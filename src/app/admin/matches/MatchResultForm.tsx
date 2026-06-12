'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Calculator } from 'lucide-react';
import type { Team } from '@/types/database';
import type { Locale } from '@/lib/i18n/dictionaries';

interface Props {
  matchId: number;
  isKO: boolean;
  allTeams: Team[];
  locale: Locale;
  initial: {
    home_team: string | null;
    away_team: string | null;
    home_score: number | null;
    away_score: number | null;
    qualifier_team: 'home' | 'away' | null;
  };
  t: { enterResult: string; scoreMatch: string; save: string; qualifier: string; home: string; away: string };
}

export function MatchResultForm({ matchId, isKO, allTeams, locale, initial, t }: Props) {
  const router = useRouter();
  const [homeTeam, setHomeTeam] = useState<string>(initial.home_team ?? '');
  const [awayTeam, setAwayTeam] = useState<string>(initial.away_team ?? '');
  const [home, setHome] = useState<string>(initial.home_score?.toString() ?? '');
  const [away, setAway] = useState<string>(initial.away_score?.toString() ?? '');
  const [qual, setQual] = useState<'home' | 'away' | ''>(initial.qualifier_team ?? '');
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const teamsKnown = homeTeam !== '' && awayTeam !== '';

  function save(score: boolean) {
    setMsg(null);
    start(async () => {
      const res = await fetch(`/api/admin/matches/${matchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          home_team: homeTeam || null,
          away_team: awayTeam || null,
          home_score: home === '' ? null : Number(home),
          away_score: away === '' ? null : Number(away),
          qualifier_team: isKO ? (qual === '' ? null : qual) : null,
          score,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setMsg(j.error ?? 'error');
        return;
      }
      setMsg('saved');
      router.refresh();
      setTimeout(() => setMsg(null), 2000);
    });
  }

  const teamOption = (team: Team) =>
    `${team.flag} ${locale === 'ar' ? team.name_ar : team.name_en} (${team.code})`;

  return (
    <div className="flex flex-col gap-2 mt-1">
      {isKO && (
        <div className="grid grid-cols-2 gap-2">
          <select
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
            className="rounded-xl border-2 border-gold-500/30 bg-royal-950/60 px-2 py-2 text-sm text-cream"
          >
            <option value="">— Home team —</option>
            {allTeams.map((tm) => (
              <option key={tm.code} value={tm.code}>{teamOption(tm)}</option>
            ))}
          </select>
          <select
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
            className="rounded-xl border-2 border-gold-500/30 bg-royal-950/60 px-2 py-2 text-sm text-cream"
          >
            <option value="">— Away team —</option>
            {allTeams.map((tm) => (
              <option key={tm.code} value={tm.code}>{teamOption(tm)}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={30}
          value={home}
          onChange={(e) => setHome(e.target.value)}
          disabled={!teamsKnown}
          className="w-16 rounded-xl border-2 border-gold-500/30 bg-royal-950/60 px-2 py-2 text-center text-lg font-bold tabular-nums text-cream focus:border-gold-400 outline-none disabled:opacity-40"
        />
        <span className="text-cream/40">–</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={30}
          value={away}
          onChange={(e) => setAway(e.target.value)}
          disabled={!teamsKnown}
          className="w-16 rounded-xl border-2 border-gold-500/30 bg-royal-950/60 px-2 py-2 text-center text-lg font-bold tabular-nums text-cream focus:border-gold-400 outline-none disabled:opacity-40"
        />
        {isKO && (
          <select
            value={qual}
            onChange={(e) => setQual((e.target.value as 'home' | 'away' | ''))}
            disabled={!teamsKnown}
            className="rounded-xl border-2 border-gold-500/30 bg-royal-950/60 px-2 py-2 text-sm text-cream disabled:opacity-40"
            title={t.qualifier}
          >
            <option value="">— {t.qualifier} —</option>
            <option value="home">{t.home}</option>
            <option value="away">{t.away}</option>
          </select>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => save(false)}
          disabled={pending}
          className="btn-royal text-xs flex-1 disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" /> {t.save}
        </button>
        <button
          type="button"
          onClick={() => save(true)}
          disabled={pending || home === '' || away === '' || !teamsKnown}
          className="btn-gold text-xs flex-1 disabled:opacity-40"
        >
          <Calculator className="h-3.5 w-3.5" /> {t.scoreMatch}
        </button>
      </div>
      {msg && <div className="text-xs text-gold-300 font-semibold">{msg}</div>}
    </div>
  );
}
