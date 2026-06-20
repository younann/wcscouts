# Feed Engagement Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the existing feed across home, match detail, bottom nav, and post-prediction so users encounter it where they already are.

**Architecture:** Pure read-side additions plus one additive schema column (`profiles.feed_last_seen_at`). Three new client components (`FeedTeaser`, `MatchThread`, `SharePickCTA`). One optional new query param on `GET /api/posts`. Predictions, scoring, and existing data are untouched.

**Tech Stack:** Next.js 15 App Router, React 19, Supabase (Postgres + RLS), TailwindCSS, server components + client islands. No test framework — verification is `npm run typecheck`, `npm run lint`, and manual browser checks.

**Spec:** `docs/superpowers/specs/2026-06-20-feed-engagement-design.md`

**Working directory:** `/Users/younan.nwesre/Desktop/personal/wcscouts`

---

## File Structure

**Create:**
- `supabase/migrations/015_feed_last_seen.sql` — add `feed_last_seen_at` to `profiles`
- `src/components/FeedTeaser.tsx` — home page teaser (2 posts, inline reactions)
- `src/components/MatchThread.tsx` — match detail thread (mini-composer + list + load more)
- `src/components/SharePickCTA.tsx` — post-prediction share inline panel

**Modify:**
- `src/lib/i18n/dictionaries.ts` — new feed keys (en + ar)
- `src/app/api/posts/route.ts` — `GET` accepts optional `match_id`
- `src/app/(app)/layout.tsx` — fetch unread boolean, pass to `BottomNav`
- `src/components/BottomNav.tsx` — accept `unreadFeed` prop, render dot
- `src/app/(app)/feed/page.tsx` — update `feed_last_seen_at` on visit
- `src/app/(app)/home/page.tsx` — fetch 2 latest posts, render `FeedTeaser`
- `src/app/(app)/matches/[id]/page.tsx` — fetch match thread + `hasSharedPick`; render `MatchThread`; pass `hasSharedPick` to `PredictionForm`
- `src/components/PredictionForm.tsx` — accept optional `hasSharedPick`, track `justSaved`, render `SharePickCTA`

**Conventions for every task:**
- After each set of file edits, run `npm run typecheck` and `npm run lint` from the project root. Both must exit 0 before committing.
- Commits use the existing project style — short imperative subject, optional body. Always end with the trailer used by recent commits.
- Never `git push`. Never modify `predictions`, `scoring_rules`, or anything outside the spec.
- If you discover a need beyond what the plan specifies, stop and ask before improvising.

---

## Chunk 1: Schema + API + i18n foundations

These three tasks are prerequisites for the UI tasks. They are small and low-risk individually.

### Task 0: Capture baseline prediction counts (REQUIRED)

This is not a code change — it's a safety check. The user has explicitly stated that prediction data must not be lost. Capture the baseline now so Task 13 can verify nothing was destroyed.

- [ ] **Step 1: Run baseline counts and record them**

In Supabase SQL editor or `psql`, run:

```sql
select count(*) as total from public.predictions;
select count(*) as scored from public.predictions where points_awarded is not null;
select sum(total_points)::int as sum_points from public.profiles where role = 'user';
```

Write the three numbers down (in the plan, in a scratch file, or in the chat). Task 13 compares these three numbers against post-implementation counts.

---

### Task 1: Migration — add `feed_last_seen_at` to profiles

**Files:**
- Create: `supabase/migrations/015_feed_last_seen.sql`

- [ ] **Step 1: Create the migration file**

Write `supabase/migrations/015_feed_last_seen.sql` with:

```sql
-- Tracks the last time a user opened the main feed. Used to drive the
-- "unread activity" red dot on the bottom-nav Chat tab.
--
-- Default of now() means existing users do NOT see a dot immediately after
-- deploy; only posts created after deploy will trigger the dot. This is
-- intentional — we don't want a sea of red dots on first rollout.

alter table public.profiles
  add column if not exists feed_last_seen_at timestamptz not null default now();
```

- [ ] **Step 2: Verify migration is well-formed**

Read the file back and confirm:
- Filename matches the `0NN_name.sql` pattern of siblings in `supabase/migrations/`
- It does **not** drop, rename, or modify any existing column
- `if not exists` guards the add so re-runs are safe
- The default is `now()`, not epoch

- [ ] **Step 3: Apply against your local Supabase first**

How you apply is environment-specific (Supabase CLI, dashboard SQL editor, or `psql`). Apply against a local or staging environment FIRST. Confirm with:

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name = 'feed_last_seen_at';
```

Expected: one row, `timestamptz`, `NO` (not nullable), default `now()`.

If applying against production: take a backup of `profiles` first (`pg_dump -t public.profiles ...`), apply against a copy of the dump to confirm zero errors, then confirm with the user before running on prod.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/015_feed_last_seen.sql
git commit -m "$(cat <<'EOF'
Add feed_last_seen_at to profiles for unread-dot tracking

Additive column with default now() so existing users do not see a dot
immediately on deploy.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: API — add `match_id` filter to `GET /api/posts`

**Files:**
- Modify: `src/app/api/posts/route.ts:9-42` (the GET handler)

- [ ] **Step 1: Read the existing GET handler**

Read `src/app/api/posts/route.ts` lines 1–42 so you understand the existing param/query shape (`before`, `after`, `limit`).

- [ ] **Step 2: Add the optional `match_id` param**

Inside `GET`, after the `limit` is computed and before the `let q = supabase.from('posts')...` block, parse `match_id`:

```ts
const matchIdRaw = url.searchParams.get('match_id');
let matchIdFilter: number | null = null;
if (matchIdRaw != null) {
  const n = Number(matchIdRaw);
  if (!Number.isInteger(n)) {
    return NextResponse.json({ error: 'invalid_match_id' }, { status: 400 });
  }
  matchIdFilter = n;
}
```

Then add the conditional `.eq` filter to the existing `q` chain. The existing code is:

```ts
let q = supabase
  .from('posts')
  .select('id, user_id, body, match_id, created_at')
  .order('created_at', { ascending: false })
  .order('id', { ascending: false })
  .limit(limit);

if (before) q = q.lt('created_at', before);
if (after) q = q.gt('created_at', after);
```

Add a single line for the new filter — order does not matter relative to the other `q = q.X(...)` reassignments:

```ts
if (matchIdFilter != null) q = q.eq('match_id', matchIdFilter);
```

Place it anywhere in that `if (before) … if (after) …` block. Do NOT restructure the existing filter chain.

- [ ] **Step 3: Typecheck and lint**

Run `npm run typecheck` and `npm run lint` from the project root. Fix any errors.

- [ ] **Step 4: Smoke test in a browser console**

With the dev server running (`npm run dev`), open the app while signed in and run in DevTools:

```js
await (await fetch('/api/posts?match_id=1&limit=5')).json();
```

Expected: returns `{ posts: [...], next_cursor: ... }` containing only posts tagged to match id 1 (or empty if none). Also try `?match_id=abc` and confirm `{ error: 'invalid_match_id' }` with status 400. And confirm `?limit=5` (no match_id) still returns posts as before.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/posts/route.ts
git commit -m "$(cat <<'EOF'
Add optional match_id filter to GET /api/posts

Required so the match-detail thread can paginate posts tagged to a
specific match. Backward-compatible — existing callers unaffected.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: i18n — add new feed dictionary keys

**Files:**
- Modify: `src/lib/i18n/dictionaries.ts`

- [ ] **Step 1: Extend the `feed` block in the `Dict` type**

Open `src/lib/i18n/dictionaries.ts`. In the `Dict` type's `feed` block (around line 44-75), add these keys:

```ts
  homeTeaserTitle: string;
  matchThreadTitle: string;
  matchThreadEmpty: string;
  sharePickTitle: string;
  sharePickShare: string;
  sharePickNotNow: string;
  sharePickTemplate: string;
  sharedConfirmation: string;
```

- [ ] **Step 2: Add English values**

In the `en` object's `feed` block (around line 224-255), add:

```ts
  homeTeaserTitle: 'Latest from the chat',
  matchThreadTitle: 'Match chat',
  matchThreadEmpty: 'Be the first to talk about this match',
  sharePickTitle: 'Share with the scouts?',
  sharePickShare: 'Share',
  sharePickNotNow: 'Not now',
  sharePickTemplate: "Predicted {home_flag} {home_score}–{away_score} {away_flag} — let's go!",
  sharedConfirmation: 'Shared!',
```

- [ ] **Step 3: Add Arabic values**

In the `ar` object's `feed` block (around line 404-435), add:

```ts
  homeTeaserTitle: 'آخر الدردشة',
  matchThreadTitle: 'دردشة المباراة',
  matchThreadEmpty: 'كن أول من يتحدث عن هذه المباراة',
  sharePickTitle: 'شارك مع الكشّافة؟',
  sharePickShare: 'شارك',
  sharePickNotNow: 'ليس الآن',
  sharePickTemplate: 'توقّعت {home_flag} {home_score}–{away_score} {away_flag} — يلا!',
  sharedConfirmation: 'تمّت المشاركة!',
```

- [ ] **Step 4: Typecheck and lint**

Run `npm run typecheck` and `npm run lint`. If typecheck fails because some component destructures `t.feed` exhaustively, fix forward — but in this codebase consumers index by key, so this should pass cleanly.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/dictionaries.ts
git commit -m "$(cat <<'EOF'
Add feed dictionary keys for teaser, match thread, share CTA

Adds en + ar copy for the four new feed surfaces.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 2: Unread dot

Builds on Task 1's column. Two-step: surface the boolean from the layout, render the dot in the nav, mark seen on `/feed` visit.

### Task 4: Layout — fetch unread boolean and pass to BottomNav

**Files:**
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/components/BottomNav.tsx`

- [ ] **Step 1: Add `unreadFeed?: boolean` prop to BottomNav**

In `src/components/BottomNav.tsx`, update the `Props` interface:

```ts
interface Props {
  labels: Record<NavKey, string>;
  unreadFeed?: boolean;
}
```

Update the component signature to destructure it. The existing JSX structure is `<nav><div><ul><li><Link>...</Link></li>...</ul></div></nav>`. **Preserve that structure.** Only modify the body of the existing `<Link>` element (the children inside, not the `<Link>` itself, not the wrapping `<li>`):

Before (inside `<Link>`):
```tsx
<Icon className={cn('h-6 w-6', active && 'drop-shadow-[0_0_8px_rgba(252,192,40,0.6)]')} />
<span className="text-[11px] font-semibold">{labels[key]}</span>
```

After:
```tsx
<span className="relative">
  <Icon className={cn('h-6 w-6', active && 'drop-shadow-[0_0_8px_rgba(252,192,40,0.6)]')} />
  {key === 'feed' && unreadFeed && (
    <span
      aria-hidden
      className="absolute -top-0.5 -end-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-royal-950"
    />
  )}
</span>
<span className="text-[11px] font-semibold">{labels[key]}</span>
```

Use `end-0.5` (logical CSS) so the dot mirrors correctly under RTL. Tailwind 3.4 generates `right-0.5` or `left-0.5` based on the document's `dir` attribute — the existing app sets `dir="rtl"` on `<html>` for Arabic via `src/app/layout.tsx`, so this works.

- [ ] **Step 2: Fetch the unread boolean in the app layout**

In `src/app/(app)/layout.tsx`, the layout is currently sync-server-component that does not call Supabase. Add the unread check before rendering. Updated body:

```tsx
import { createClient } from '@/lib/supabase/server';
import { BottomNav } from '@/components/BottomNav';
import { AppHeader } from '@/components/AppHeader';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Copyright } from '@/components/Copyright';
import { getT } from '@/lib/i18n/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let unreadFeed = false;
  if (user) {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('feed_last_seen_at')
      .eq('id', user.id)
      .maybeSingle();
    const seenAt = (profileRow as { feed_last_seen_at: string | null } | null)?.feed_last_seen_at;
    if (seenAt) {
      const { count } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .gt('created_at', seenAt)
        .neq('user_id', user.id)
        .limit(1);
      unreadFeed = (count ?? 0) > 0;
    }
  }

  return (
    <div className="mx-auto max-w-md min-h-dvh with-bottom-nav">
      <AppHeader appName={t.app.name} rightSlot={<LanguageSwitcher current={locale} />} />
      {children}
      <Copyright />
      <BottomNav labels={t.nav} unreadFeed={unreadFeed} />
    </div>
  );
}
```

Note: we use `.limit(1)` plus `count: 'exact', head: true` — for a head-count query, Supabase returns the count without rows; `limit` here is harmless. The result is a small head request.

- [ ] **Step 3: Typecheck and lint**

`npm run typecheck && npm run lint`

- [ ] **Step 4: Manual verification**

With dev server running:
1. Sign in as user A in one browser. Visit `/home`. Observe Chat tab: no red dot.
2. Sign in as user B in a private/incognito window. Go to `/feed` and post any short message.
3. Back in user A's window, navigate to any page (e.g., `/home`). Expected: a small red dot appears on the Chat tab.
4. As user A, also post a message. Reload `/home`. Confirm own posts do NOT create a dot.
5. **Default-correctness check (catches a broken migration default):** while existing posts from A and B are in the DB, sign up a brand-new user C via `/signup`. Without visiting `/feed`, navigate to `/home`. Expected: NO dot — C's `feed_last_seen_at` was set to `now()` at signup, so older posts don't count. Then have A post once; reload `/home` as C. Expected: dot now appears. (If the migration default were broken, step 4 would still pass but this step would fail.)
6. Switch user A's locale to Arabic. The dot should appear at the upper-left of the Chat icon (logical `end` flips under RTL).

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/layout.tsx src/components/BottomNav.tsx
git commit -m "$(cat <<'EOF'
Show unread dot on Chat nav tab

Layout reads profiles.feed_last_seen_at and checks for posts authored by
others after that time. Excludes the user's own posts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Mark feed seen on `/feed` visit

**Files:**
- Modify: `src/app/(app)/feed/page.tsx`

- [ ] **Step 1: Add the update before the existing query**

In `src/app/(app)/feed/page.tsx`, the current code does (lines 14–17):

```ts
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: { user: authUser } } = await supabase.auth.getUser();
```

Insert the update on a new line between `if (!user) return null;` and the redundant `getUser()` re-call (i.e., between the current lines 15 and 17):

```ts
  await supabase
    .from('profiles')
    .update({ feed_last_seen_at: new Date().toISOString() })
    .eq('id', user.id);
```

Do **not** remove the redundant `getUser()` re-call — that's a separate concern and out of scope for this task.

This update is permitted by the existing `profiles_update_self` RLS policy (verified in spec). It does not alter `role` so the `with check` constraint holds.

- [ ] **Step 2: Typecheck and lint**

`npm run typecheck && npm run lint`

- [ ] **Step 3: Manual verification**

1. As user A, ensure a red dot is showing (from Task 4 setup).
2. Tap the Chat tab → land on `/feed`.
3. Navigate away (`/home`). Expected: dot is gone.
4. Have user B post again from the other window. Reload `/home` as user A. Expected: dot returns.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/feed/page.tsx
git commit -m "$(cat <<'EOF'
Update feed_last_seen_at when user opens the feed

Clears the unread dot on the next layout render.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 3: Home feed teaser

Reuses the existing `enrichPosts` helper from `src/app/api/posts/_shared.ts` and the existing `ReactionBar` client component from the feed subtree. New component `FeedTeaser` is small and renders 2 compact cards with inline reactions.

### Task 6: Build `FeedTeaser` client component

**Files:**
- Create: `src/components/FeedTeaser.tsx`

- [ ] **Step 1: Scaffold the component**

Create `src/components/FeedTeaser.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronLeft, MessageCircle } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';
import { isRTL } from '@/lib/i18n/dictionaries';
import type { PostListItem, ReactionEmoji } from '@/types/database';
import { ReactionBar } from '@/app/(app)/feed/ReactionBar';

interface Props {
  t: Dictionary;
  locale: Locale;
  initialPosts: PostListItem[];
}

export function FeedTeaser({ t, locale, initialPosts }: Props) {
  const [posts, setPosts] = useState<PostListItem[]>(initialPosts);
  const [, setToastError] = useState<string | null>(null);
  const Chevron = isRTL(locale) ? ChevronLeft : ChevronRight;

  if (posts.length === 0) return null;

  function handleReactionChanged(
    postId: number,
    reactions: PostListItem['reactions'],
    my: ReactionEmoji | null
  ) {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, reactions, my_reaction: my } : p))
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-cream">{t.feed.homeTeaserTitle}</h2>
        <Link href="/feed" className="btn-ghost-light text-sm">
          {t.home.seeAll}
          <Chevron className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        {posts.map((post) => (
          <article key={post.id} className="card-royal flex flex-col gap-2">
            <Link href="/feed" className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-bold text-cream truncate">
                  {post.full_name || post.username}
                </span>
                <span className="text-[11px] text-cream/55 shrink-0">
                  {formatRelativeTime(post.created_at, t.feed)}
                </span>
              </div>
              {post.match && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gold-500/10 px-2 py-0.5 text-[11px] text-gold-200 border border-gold-500/25 self-start">
                  <span>{post.match.home_flag ?? post.match.home_team ?? '?'}</span>
                  <span className="opacity-50">vs</span>
                  <span>{post.match.away_flag ?? post.match.away_team ?? '?'}</span>
                </span>
              )}
              <p
                className="text-[14px] text-cream/90 line-clamp-2"
                dir="auto"
                style={{ overflowWrap: 'anywhere' }}
              >
                {post.body}
              </p>
              {post.comment_count > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-cream/55">
                  <MessageCircle className="h-3 w-3" />
                  {t.feed.commentsCount.replace('{n}', String(post.comment_count))}
                </span>
              )}
            </Link>
            <ReactionBar
              t={t}
              postId={post.id}
              reactions={post.reactions}
              myReaction={post.my_reaction}
              onChanged={(reactions, my) => handleReactionChanged(post.id, reactions, my)}
              onError={(msg) => setToastError(msg)}
            />
          </article>
        ))}
      </div>
    </section>
  );
}
```

Notes for the implementer:
- We don't surface an error toast UI in the teaser — keep it lightweight. If reactions fail, optimistic state rolls back inside `ReactionBar`.
- The card body is wrapped in a `<Link>` so tapping it goes to `/feed`. The `ReactionBar` is outside the link to keep emoji taps from also navigating.
- `line-clamp-2` requires `@tailwindcss/line-clamp` or the new Tailwind 3.4+ built-in. Check `tailwind.config.ts` and add the utility if not present; if it isn't, swap to a max-height + overflow-hidden pattern.

- [ ] **Step 2: Check `line-clamp-2` availability**

Read `tailwind.config.ts`. Tailwind 3.4 includes `line-clamp` natively — no plugin needed. If the config uses a strict `content` list, ensure `src/components/**/*.tsx` is covered.

- [ ] **Step 3: Typecheck and lint**

`npm run typecheck && npm run lint`

- [ ] **Step 4: Commit (component only — not wired up yet)**

```bash
git add src/components/FeedTeaser.tsx
git commit -m "$(cat <<'EOF'
Add FeedTeaser client component

Compact 2-post teaser for the home page. Reactable inline via existing
ReactionBar. Card body links to /feed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Wire `FeedTeaser` into home page

**Files:**
- Modify: `src/app/(app)/home/page.tsx`

- [ ] **Step 1: Fetch 2 latest posts in the home page server component**

In `src/app/(app)/home/page.tsx`, add a fetch alongside the existing `Promise.all`. Import:

```ts
import { enrichPosts } from '@/app/api/posts/_shared';
import { FeedTeaser } from '@/components/FeedTeaser';
import type { PostListItem } from '@/types/database';
```

Add (place after the existing `recent` query block, before computing `codes`):

```ts
const { data: rawTeaserPosts } = await supabase
  .from('posts')
  .select('id, user_id, body, match_id, created_at')
  .order('created_at', { ascending: false })
  .order('id', { ascending: false })
  .limit(2);
const teaserPosts: PostListItem[] = await enrichPosts(supabase, rawTeaserPosts ?? [], user.id);
```

- [ ] **Step 2: Render the teaser**

In the JSX returned by `HomePage`, after the hero `</section>` block (the one with `<Confetti />`) and BEFORE the `{enrichedRecent.length > 0 && ...}` recent-results block, insert:

```tsx
<FeedTeaser t={t} locale={locale} initialPosts={teaserPosts} />
```

`FeedTeaser` returns `null` when there are 0 posts, so no conditional wrapper is needed.

- [ ] **Step 3: Typecheck and lint**

`npm run typecheck && npm run lint`

- [ ] **Step 4: Manual verification**

1. As any signed-in user, ensure at least 2 posts exist in `posts` table (post from /feed if needed).
2. Visit `/home`. Expected: between the hero and "Recent results" section, see "Latest from the chat" header + 2 compact post cards.
3. Tap an emoji on a card → reaction toggles optimistically and persists (verify by reloading).
4. Tap the card body (not an emoji) → navigates to `/feed`.
5. With 0 posts in DB, the section disappears entirely.
6. Switch locale to Arabic; verify the title and "See all" arrow flip correctly.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/home/page.tsx
git commit -m "$(cat <<'EOF'
Render FeedTeaser on home page

Server-side fetches 2 latest posts via enrichPosts and feeds them to the
client component. Hides when no posts exist.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 4: Match detail thread

Largest piece. New client component for the composer + list + load-more, plus server-side fetch on the match detail page.

### Task 8: Build `MatchThread` client component

**Files:**
- Create: `src/components/MatchThread.tsx`

- [ ] **Step 1: Scaffold the component**

Create `src/components/MatchThread.tsx`:

```tsx
'use client';

import { useCallback, useState, useTransition } from 'react';
import { Send } from 'lucide-react';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { PostListItem, ReactionEmoji } from '@/types/database';
import { PostCard } from '@/app/(app)/feed/PostCard';

interface Props {
  t: Dictionary;
  matchId: number;
  currentUserId: string;
  isAdmin: boolean;
  initialPosts: PostListItem[];
  initialNextCursor: string | null;
}

const PAGE_SIZE = 5;

export function MatchThread({
  t,
  matchId,
  currentUserId,
  isAdmin,
  initialPosts,
  initialNextCursor,
}: Props) {
  const [posts, setPosts] = useState<PostListItem[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialNextCursor);
  const [body, setBody] = useState('');
  const [posting, startPost] = useTransition();
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError((cur) => (cur === msg ? null : cur)), 3000);
  }, []);

  function submitPost() {
    const text = body.trim();
    if (text.length < 1 || text.length > 280 || posting) return;
    startPost(async () => {
      try {
        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: text, match_id: matchId }),
        });
        if (res.status === 429) {
          showError(t.feed.rateLimited);
          return;
        }
        if (!res.ok) {
          showError(t.feed.postError);
          return;
        }
        const j = (await res.json()) as { post: PostListItem };
        setPosts((prev) => [j.post, ...prev]);
        setBody('');
      } catch {
        showError(t.feed.postError);
      }
    });
  }

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const url = `/api/posts?match_id=${matchId}&limit=${PAGE_SIZE}&before=${encodeURIComponent(cursor)}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        showError(t.feed.actionFailed);
        return;
      }
      const j = (await res.json()) as { posts: PostListItem[]; next_cursor: string | null };
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...j.posts.filter((p) => !seen.has(p.id))];
      });
      setCursor(j.next_cursor);
    } catch {
      showError(t.feed.actionFailed);
    } finally {
      setLoadingMore(false);
    }
  }

  function handleReactionChanged(
    postId: number,
    reactions: PostListItem['reactions'],
    my: ReactionEmoji | null
  ) {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, reactions, my_reaction: my } : p))
    );
  }

  function handleCommentCountChanged(postId: number, delta: number) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comment_count: Math.max(0, p.comment_count + delta) } : p
      )
    );
  }

  function handleDeleted(postId: number) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  const counter = t.feed.composerCounter.replace('{n}', String(body.length));

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-black text-cream">{t.feed.matchThreadTitle}</h2>

      <div className="card-royal flex flex-col gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 280))}
          placeholder={t.feed.composerPlaceholder}
          dir="auto"
          rows={2}
          className="w-full resize-none bg-transparent text-cream placeholder:text-cream/40 focus:outline-none"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-cream/50">{counter}</span>
          <button
            type="button"
            onClick={submitPost}
            disabled={posting || body.trim().length < 1}
            className="btn-gold text-sm disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {posting ? t.feed.posting : t.feed.postButton}
          </button>
        </div>
      </div>

      {error && <div className="text-red-300 text-sm font-semibold">{error}</div>}

      {posts.length === 0 ? (
        <div className="card-royal text-center text-cream/60">{t.feed.matchThreadEmpty}</div>
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
              onDeleted={handleDeleted}
              onError={showError}
            />
          ))}
        </div>
      )}

      {cursor && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="btn-ghost-light self-center text-sm"
        >
          {loadingMore ? t.feed.loadingMore : t.feed.loadMore}
        </button>
      )}
    </section>
  );
}
```

Notes:
- The component does NOT reuse `Composer.tsx` because that component renders a `MatchTagPicker` and manages its own match tagging state. Here the match is fixed.
- Reuses `PostCard` for individual posts; reuses `ReactionBar` and `CommentThread` transitively.
- No optimistic-prepend for posts because `POST /api/posts` returns the enriched post and we use that as the source of truth.

- [ ] **Step 2: Typecheck and lint**

`npm run typecheck && npm run lint`

- [ ] **Step 3: Commit (component only)**

```bash
git add src/components/MatchThread.tsx
git commit -m "$(cat <<'EOF'
Add MatchThread client component

Mini-composer + posts list scoped to one match. Match auto-tagged, no
MatchTagPicker. Reuses PostCard for items and pagination via the new
match_id query param on GET /api/posts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Wire `MatchThread` into match detail page

**Files:**
- Modify: `src/app/(app)/matches/[id]/page.tsx`

- [ ] **Step 1: Fetch match-tagged posts + admin flag server-side**

In `src/app/(app)/matches/[id]/page.tsx`, after the existing `breakdown` block (after the closing `}` of `if (kickedOff) { ... }`), add:

```ts
const { data: rawThreadPosts } = await supabase
  .from('posts')
  .select('id, user_id, body, match_id, created_at')
  .eq('match_id', match.id)
  .order('created_at', { ascending: false })
  .order('id', { ascending: false })
  .limit(5);
const threadPosts: PostListItem[] = await enrichPosts(
  supabase,
  rawThreadPosts ?? [],
  user.id
);
const threadCursor =
  threadPosts.length === 5 ? threadPosts[threadPosts.length - 1].created_at : null;

const { data: profileRow } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .maybeSingle();
const isAdmin = (profileRow as { role: string } | null)?.role === 'admin';
```

Add the imports at the top of the file:

```ts
import { enrichPosts } from '@/app/api/posts/_shared';
import { MatchThread } from '@/components/MatchThread';
import type { PostListItem } from '@/types/database';
```

- [ ] **Step 2: Render the thread in JSX**

At the very end of the `<main>` block, after the `{breakdown.length > 0 && ...}` block, append:

```tsx
<MatchThread
  t={t}
  matchId={match.id}
  currentUserId={user.id}
  isAdmin={isAdmin}
  initialPosts={threadPosts}
  initialNextCursor={threadCursor}
/>
```

- [ ] **Step 3: Typecheck and lint**

`npm run typecheck && npm run lint`

- [ ] **Step 4: Manual verification**

1. Open `/matches/<id>` for any match. Expected: at the bottom of the page, see "Match chat" header.
2. If no posts tagged to this match, see the empty-state copy ("Be the first…").
3. Type a message in the composer and tap Post. The post appears immediately at the top of the thread with author, time, body, reactions row, comment toggle.
4. React on the new post; expand comments; add a comment. All should work using the existing flows.
5. From the feed page, post 6 messages tagged to the same match. Return to match detail; expected: 5 visible plus a "Load more" button. Tap it → next batch appears.
6. **Rate-limit check (do this only on a fresh user):** the limit is 10 posts/hour per user and is shared across feed, match thread, and share CTA. If you've already posted during prior task verification, this test will be inconsistent. Use a fresh test account and post 11 times in a row; expected: the 11th request returns 429 and the inline error chip renders (uses existing `t.feed.rateLimited`).
7. Switch locale to Arabic: title and empty-state copy localized.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/matches/\[id\]/page.tsx
git commit -m "$(cat <<'EOF'
Render MatchThread on match detail page

Server-fetches first 5 posts tagged to the match plus the next cursor;
hands them to MatchThread. Loads isAdmin for delete permissions in
PostCard.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 5: Post-prediction share CTA

Final surface. New component, prop on `PredictionForm`, server-side flag from the match detail page.

### Task 10: Build `SharePickCTA` client component

**Files:**
- Create: `src/components/SharePickCTA.tsx`

- [ ] **Step 1: Scaffold the component**

Create `src/components/SharePickCTA.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { Send, X, CheckCircle2 } from 'lucide-react';
import type { Dictionary } from '@/lib/i18n/dictionaries';

interface Props {
  t: Dictionary;
  matchId: number;
  homeFlag: string;
  awayFlag: string;
  homeScore: number;
  awayScore: number;
  onShared?: () => void;
}

function buildBody(template: string, homeFlag: string, awayFlag: string, homeScore: number, awayScore: number) {
  return template
    .replace('{home_flag}', homeFlag)
    .replace('{away_flag}', awayFlag)
    .replace('{home_score}', String(homeScore))
    .replace('{away_score}', String(awayScore));
}

function dismissKey(matchId: number) {
  return `wc_share_dismissed_${matchId}`;
}

export function SharePickCTA({
  t,
  matchId,
  homeFlag,
  awayFlag,
  homeScore,
  awayScore,
  onShared,
}: Props) {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(dismissKey(matchId)) === '1';
  });
  const [body, setBody] = useState(() =>
    buildBody(t.feed.sharePickTemplate, homeFlag, awayFlag, homeScore, awayScore)
  );
  const [shared, setShared] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posting, startPost] = useTransition();

  if (dismissed || shared) {
    return shared ? (
      <div className="chip chip-gold self-center">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {t.feed.sharedConfirmation}
      </div>
    ) : null;
  }

  function dismiss() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(dismissKey(matchId), '1');
    }
    setDismissed(true);
  }

  function share() {
    const text = body.trim();
    if (text.length < 1 || text.length > 280 || posting) return;
    setError(null);
    startPost(async () => {
      try {
        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: text, match_id: matchId }),
        });
        if (res.status === 429) {
          setError(t.feed.rateLimited);
          return;
        }
        if (!res.ok) {
          setError(t.feed.postError);
          return;
        }
        setShared(true);
        onShared?.();
      } catch {
        setError(t.feed.postError);
      }
    });
  }

  // Wrapper is intentionally NOT `card-royal`. SharePickCTA renders INSIDE
  // PredictionForm's `card-royal-elev` outer card. A nested card would
  // create a card-in-a-card. Use a subtle bordered section instead.
  return (
    <div
      className="rounded-2xl p-3 flex flex-col gap-3 border-t border-gold-500/20"
      style={{ background: 'rgba(28,7,67,0.45)' }}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-gold-300">{t.feed.sharePickTitle}</div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t.feed.sharePickNotNow}
          className="text-cream/50 hover:text-cream/80"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 280))}
        dir="auto"
        rows={2}
        className="w-full resize-none bg-transparent text-cream focus:outline-none"
      />
      {error && <div className="text-red-300 text-sm font-semibold">{error}</div>}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={dismiss}
          className="btn-ghost-light text-sm"
        >
          {t.feed.sharePickNotNow}
        </button>
        <button
          type="button"
          onClick={share}
          disabled={posting || body.trim().length < 1}
          className="btn-gold text-sm disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {posting ? t.feed.posting : t.feed.sharePickShare}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

`npm run typecheck && npm run lint`

- [ ] **Step 3: Commit (component only)**

```bash
git add src/components/SharePickCTA.tsx
git commit -m "$(cat <<'EOF'
Add SharePickCTA inline panel

Pre-filled editable share for the just-saved prediction. Persists "Not
now" dismissals in localStorage keyed by match id.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Add `hasSharedPick` prop + `justSaved` state to `PredictionForm`

**Files:**
- Modify: `src/components/PredictionForm.tsx`

- [ ] **Step 1: Add the new optional prop and local state**

In `src/components/PredictionForm.tsx`:

Update the `Props` interface (around line 11-16) to add an optional prop:

```ts
interface Props {
  match: MatchWithTeams;
  existing: Prediction | null;
  locale: Locale;
  t: Dictionary;
  hasSharedPick?: boolean;
}
```

Destructure with default in the signature:

```ts
export function PredictionForm({ match, existing, locale, t, hasSharedPick = false }: Props) {
```

Add a new `justSaved` state alongside the existing ones (near `const [toast, setToast]`):

```ts
const [justSaved, setJustSaved] = useState(false);
```

Inside the `submit()` success branch, after `setToast(t.match.saved)`, also set `setJustSaved(true)`. Do NOT clear it on a timer — the CTA visibility hinges on it for the lifetime of the page render.

- [ ] **Step 2: Render `SharePickCTA` conditionally**

Import at the top:

```ts
import { SharePickCTA } from './SharePickCTA';
```

At the bottom of the returned JSX, after the `{toast && ...}` line but inside the outer `<div className="card-royal-elev ...">`, add:

```tsx
{justSaved && !hasSharedPick && match.home && match.away && (
  <SharePickCTA
    t={t}
    matchId={match.id}
    homeFlag={match.home.flag}
    awayFlag={match.away.flag}
    homeScore={home}
    awayScore={away}
  />
)}
```

We only render once teams are known (knockouts with TBD slots skip).

- [ ] **Step 3: Typecheck and lint**

`npm run typecheck && npm run lint`

- [ ] **Step 4: Commit**

```bash
git add src/components/PredictionForm.tsx
git commit -m "$(cat <<'EOF'
Add hasSharedPick prop and justSaved state to PredictionForm

Prop is optional (default false) to preserve existing callers. After a
successful save, render SharePickCTA when the user has not already
shared a pick for this match.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Pass `hasSharedPick` from match detail page

**Files:**
- Modify: `src/app/(app)/matches/[id]/page.tsx`

- [ ] **Step 1: Compute `hasSharedPick` server-side**

In `src/app/(app)/matches/[id]/page.tsx`, after the existing prediction fetch (`existing`) and before the JSX, add:

```ts
const { count: sharedCount } = await supabase
  .from('posts')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .eq('match_id', match.id);
const hasSharedPick = (sharedCount ?? 0) > 0;
```

- [ ] **Step 2: Pass the prop to `PredictionForm`**

Update the `PredictionForm` invocation (around line 94) from:

```tsx
<PredictionForm match={enriched} existing={existing} locale={locale} t={t} />
```

to:

```tsx
<PredictionForm
  match={enriched}
  existing={existing}
  locale={locale}
  t={t}
  hasSharedPick={hasSharedPick}
/>
```

- [ ] **Step 3: Typecheck and lint**

`npm run typecheck && npm run lint`

- [ ] **Step 4: Manual verification**

1. As a user with no posts tagged to match X, visit `/matches/X`. Save a prediction (any score). Expected: "Share with the scouts?" panel appears below the save button with a pre-filled body containing flags + score.
2. Edit the body slightly, tap Share. Expected: panel collapses to a "Shared!" chip; the new post appears in the match thread below within the same page (after a refresh) and in `/feed`.
3. Save again (update prediction). Expected: NO CTA — `hasSharedPick` is now true.
4. Open a DIFFERENT match. Save a prediction. Tap "Not now". The CTA disappears.
5. Reload the page → CTA does NOT come back (localStorage dismissal).
6. **Cross-device note (informational, not a failure):** the "Not now" dismissal is stored in localStorage, so it's per-device. If the same user opens the same match in a different browser, the CTA may re-appear if they haven't shared yet. This is intentional — no action needed.
7. Switch locale to Arabic, redo step 1; verify the template renders RTL with Arabic copy.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/matches/\[id\]/page.tsx
git commit -m "$(cat <<'EOF'
Pass hasSharedPick to PredictionForm

Server-side counts existing posts by this user tagged to the match so
the CTA doesn't re-prompt users who've already shared.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Chunk 6: Final verification

### Task 13: Whole-app smoke test

Not a commit — a manual checklist run after Tasks 1–12 are all green.

- [ ] **Step 1: Confirm prediction data is intact**

In Supabase SQL editor or `psql`:

```sql
select count(*) from public.predictions;
select count(*) from public.predictions where points_awarded is not null;
```

Compare against a count you captured before starting Task 1. They must be equal.

- [ ] **Step 2: Walk every surface end to end**

1. Sign in as user A.
2. `/home` — see hero, FeedTeaser (2 posts), Recent results, Next matches.
3. Tap an emoji in the teaser — confirm it persists.
4. Tap a teaser card — lands on `/feed`. Red dot on Chat should now be clear (or clear on next nav).
5. `/matches` — open any future match. PredictionForm visible.
6. Save a prediction. CTA appears, share it. CTA collapses to "Shared!" chip.
7. Scroll to bottom — MatchThread shows your new post + any others tagged to this match. Try Load more if there are 6+.
8. Open the same match again — CTA does NOT reappear.
9. Switch to user B in another window. Post in `/feed`. Switch back to A's window. Navigate to `/home` — Chat tab shows red dot.
10. Tap Chat → /feed loads → on next nav, dot is gone.
11. Switch locale to Arabic. Verify every new piece of UI shows Arabic copy and respects RTL (chevrons mirror, dot mirrors via `end-0.5`).
12. Log out and back in. None of the new surfaces error.

- [ ] **Step 3: Run typecheck + lint one final time**

```bash
npm run typecheck
npm run lint
```

Both must exit 0. If lint complains about unused imports from earlier tasks, fix them before declaring done.

- [ ] **Step 4: Report to the user**

Tell the user the plan is fully implemented and report any deviations from the spec or surprises encountered. Do not push. Do not open a PR.
