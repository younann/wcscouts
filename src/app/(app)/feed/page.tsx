import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n/server';
import { enrichPosts } from '@/app/api/posts/_shared';
import { FeedClient } from './FeedClient';
import type { Match } from '@/types/database';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function FeedPage() {
  const { locale, t } = await getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: { user: authUser } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const isAdmin = profile?.role === 'admin';

  const { data: rawPosts } = await supabase
    .from('posts')
    .select('id, user_id, body, match_id, created_at')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PAGE_SIZE);

  const posts = await enrichPosts(supabase, rawPosts ?? [], user.id);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const until = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data: matchesRaw } = await supabase
    .from('matches')
    .select('id, home_team, away_team, kickoff_at, status')
    .gte('kickoff_at', since)
    .lte('kickoff_at', until)
    .order('kickoff_at', { ascending: true })
    .limit(30);

  const codes = Array.from(
    new Set(
      ((matchesRaw ?? []) as Match[]).flatMap((m) => [m.home_team, m.away_team]).filter((c): c is string => !!c)
    )
  );
  const { data: teamsRaw } = codes.length
    ? await supabase.from('teams').select('code, flag').in('code', codes)
    : { data: [] as { code: string; flag: string }[] };
  const flagByCode = new Map(
    ((teamsRaw ?? []) as { code: string; flag: string }[]).map((tr) => [tr.code, tr.flag])
  );

  const taggableMatches = ((matchesRaw ?? []) as Match[]).map((m) => ({
    id: m.id,
    home_team: m.home_team,
    away_team: m.away_team,
    home_flag: m.home_team ? flagByCode.get(m.home_team) ?? null : null,
    away_flag: m.away_team ? flagByCode.get(m.away_team) ?? null : null,
    kickoff_at: m.kickoff_at,
  }));

  return (
    <main className="px-5 pb-6 flex flex-col gap-4">
      <FeedClient
        t={t}
        locale={locale}
        currentUserId={authUser?.id ?? user.id}
        isAdmin={isAdmin}
        initialPosts={posts}
        taggableMatches={taggableMatches}
      />
    </main>
  );
}
