import type { SupabaseClient } from '@supabase/supabase-js';
import {
  REACTION_EMOJIS,
  type PostListItem,
  type PostMatchChip,
  type ReactionEmoji,
} from '@/types/database';

interface PostRow {
  id: number;
  user_id: string;
  body: string;
  match_id: number | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  username: string;
  full_name: string;
}

interface MatchRow {
  id: number;
  home_team: string | null;
  away_team: string | null;
  kickoff_at: string;
}

interface TeamRow {
  code: string;
  flag: string;
}

interface ReactionRow {
  post_id: number;
  user_id: string;
  emoji: string;
}

const REACTION_SET = new Set<string>(REACTION_EMOJIS);

export function isReactionEmoji(value: unknown): value is ReactionEmoji {
  return typeof value === 'string' && REACTION_SET.has(value);
}

export async function enrichPosts(
  supabase: SupabaseClient,
  rawPosts: PostRow[],
  currentUserId: string
): Promise<PostListItem[]> {
  if (rawPosts.length === 0) return [];

  const userIds = Array.from(new Set(rawPosts.map((p) => p.user_id)));
  const matchIds = Array.from(
    new Set(rawPosts.map((p) => p.match_id).filter((m): m is number => m != null))
  );
  const postIds = rawPosts.map((p) => p.id);

  const profilesPromise = supabase
    .from('profiles')
    .select('id, username, full_name')
    .in('id', userIds);

  const matchesPromise = matchIds.length
    ? supabase.from('matches').select('id, home_team, away_team, kickoff_at').in('id', matchIds)
    : Promise.resolve({ data: [] as MatchRow[], error: null });

  const reactionsPromise = supabase
    .from('post_reactions')
    .select('post_id, user_id, emoji')
    .in('post_id', postIds);

  const commentsPromise = supabase
    .from('post_comments')
    .select('post_id')
    .in('post_id', postIds);

  const [profilesRes, matchesRes, reactionsRes, commentsRes] = await Promise.all([
    profilesPromise,
    matchesPromise,
    reactionsPromise,
    commentsPromise,
  ]);

  const profilesByUser = new Map(
    ((profilesRes.data ?? []) as ProfileRow[]).map((p) => [p.id, p])
  );
  const matchesById = new Map(
    ((matchesRes.data ?? []) as MatchRow[]).map((m) => [m.id, m])
  );

  const teamCodes = Array.from(
    new Set(
      ((matchesRes.data ?? []) as MatchRow[]).flatMap((m) =>
        [m.home_team, m.away_team].filter((c): c is string => !!c)
      )
    )
  );
  const teamsRes = teamCodes.length
    ? await supabase.from('teams').select('code, flag').in('code', teamCodes)
    : { data: [] as TeamRow[] };
  const flagByCode = new Map(((teamsRes.data ?? []) as TeamRow[]).map((tr) => [tr.code, tr.flag]));

  const reactionsByPost = new Map<number, Partial<Record<ReactionEmoji, number>>>();
  const myReactionByPost = new Map<number, ReactionEmoji>();
  for (const r of (reactionsRes.data ?? []) as ReactionRow[]) {
    if (!isReactionEmoji(r.emoji)) continue;
    if (r.user_id === currentUserId) {
      myReactionByPost.set(r.post_id, r.emoji);
    }
    const map = reactionsByPost.get(r.post_id) ?? {};
    map[r.emoji] = (map[r.emoji] ?? 0) + 1;
    reactionsByPost.set(r.post_id, map);
  }

  const commentCountByPost = new Map<number, number>();
  for (const c of (commentsRes.data ?? []) as { post_id: number }[]) {
    commentCountByPost.set(c.post_id, (commentCountByPost.get(c.post_id) ?? 0) + 1);
  }

  return rawPosts.map<PostListItem>((p) => {
    const profile = profilesByUser.get(p.user_id);
    let chip: PostMatchChip | null = null;
    if (p.match_id != null) {
      const m = matchesById.get(p.match_id);
      if (m) {
        chip = {
          id: m.id,
          home_team: m.home_team,
          away_team: m.away_team,
          home_flag: m.home_team ? flagByCode.get(m.home_team) ?? null : null,
          away_flag: m.away_team ? flagByCode.get(m.away_team) ?? null : null,
          kickoff_at: m.kickoff_at,
        };
      }
    }
    return {
      id: p.id,
      user_id: p.user_id,
      username: profile?.username ?? '',
      full_name: profile?.full_name ?? '',
      body: p.body,
      match_id: p.match_id,
      match: chip,
      created_at: p.created_at,
      reactions: reactionsByPost.get(p.id) ?? {},
      my_reaction: myReactionByPost.get(p.id) ?? null,
      comment_count: commentCountByPost.get(p.id) ?? 0,
    };
  });
}

interface ReactionsSummary {
  reactions: Partial<Record<ReactionEmoji, number>>;
  my_reaction: ReactionEmoji | null;
}

export async function fetchReactionSummary(
  supabase: SupabaseClient,
  postId: number,
  currentUserId: string
): Promise<ReactionsSummary> {
  const { data } = await supabase
    .from('post_reactions')
    .select('user_id, emoji')
    .eq('post_id', postId);
  const reactions: Partial<Record<ReactionEmoji, number>> = {};
  let my: ReactionEmoji | null = null;
  for (const row of (data ?? []) as { user_id: string; emoji: string }[]) {
    if (!isReactionEmoji(row.emoji)) continue;
    reactions[row.emoji] = (reactions[row.emoji] ?? 0) + 1;
    if (row.user_id === currentUserId) my = row.emoji;
  }
  return { reactions, my_reaction: my };
}

export async function rateLimitExceeded(
  supabase: SupabaseClient,
  table: 'posts' | 'post_comments',
  userId: string,
  maxPerHour: number
): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);
  return (count ?? 0) >= maxPerHour;
}
