# Feed Engagement — Design Spec

**Date:** 2026-06-20
**Status:** Approved (pre-implementation)
**Owner:** younann

## Problem

The social feed exists (posts, reactions, comments, match tagging) but is underused. Users come to the app to predict and leave; the feed is hidden behind a nav tab they rarely tap. We have no signal pulling them in.

## Goal

Make the feed visible from the surfaces users already visit, and give them low-effort entry points so participation does not require navigating to `/feed` and composing free-form text.

**Non-goals:**
- Auto-generated system posts (deferred — addresses an "empty feed" symptom, not "hidden feed")
- Per-group sub-feeds
- Push notifications

## Approach

Surface the feed in four places. None require touching prediction data; one additive column is added to `profiles`.

### 1. Home feed teaser

**Where:** `src/app/(app)/home/page.tsx`, between the hero card and "Recent results".

**What:**
- 2 most recent posts rendered as compact `card-royal` items.
- Each card shows: author full name, relative time, body (truncated ~2 lines), match chip if `match_id`, reaction summary, comment count.
- Each card is **reactable inline** (reuses the existing `ReactionBar` client component and `POST /api/posts/[id]/reactions` route).
- Tapping anywhere else on the card → navigates to `/feed`.
- Header row: "Latest from the chat" + "See all" link → `/feed`.
- If 0 posts exist, the section is hidden entirely.

**Data:** server-side fetch in `home/page.tsx`, identical query shape to feed page (reuses `enrichPosts` from `app/api/posts/_shared.ts`) but limited to 2.

### 2. Match detail thread

**Where:** `src/app/(app)/matches/[id]/page.tsx`, appended after `MatchPredictionBreakdown`.

**What:**
- Heading: "Match chat" / «دردشة المباراة».
- Inline mini-composer at the top of the thread:
  - Short textarea, character counter (reuses dictionary key `feed.composerCounter`), Post button.
  - Match is auto-tagged — `MatchTagPicker` not rendered.
  - Submits to existing `POST /api/posts` with `body` + `match_id`.
- Posts list below: filtered by `match_id = this match`, ordered `created_at DESC`, initial limit 5.
- "Load more" inline button paginates from the same endpoint with `before` cursor (same pattern as the main feed).
- Each post supports the full set of feed interactions (reactions, comments) by reusing `PostCard`.
- Empty state copy: "Be the first to talk about this match" / «كن أول من يتحدث عن هذه المباراة».

**Data:** new server-side fetch in match detail page, calling `enrichPosts` filtered by `match_id`. A new client component `MatchThread.tsx` wraps the composer and list to keep optimistic UI logic local.

### 3. Bottom-nav unread dot

**Where:** `src/components/BottomNav.tsx`, fed by `src/app/(app)/layout.tsx`.

**What:**
- A small red dot positioned at the top-right of the Chat tab icon when the user has unseen activity.
- "Unseen" = posts created after the user's `profiles.feed_last_seen_at`, excluding their own posts.
- Dot only — no count badge (keeps UI quiet, lowers query cost).

**Schema change (additive):**
```sql
-- 015_feed_last_seen.sql
alter table public.profiles
  add column if not exists feed_last_seen_at timestamptz not null default now();
```

**Read side:**
- `(app)/layout.tsx` issues one server query alongside existing layout work:
  ```sql
  select exists (
    select 1 from posts
    where created_at > (select feed_last_seen_at from profiles where id = $me)
      and user_id != $me
    limit 1
  );
  ```
- Result is a single boolean — cheap (uses existing `posts.created_at` indexable order).
- Passed to `BottomNav` as a prop.

**Write side:**
- `(app)/feed/page.tsx` does a server-side `update profiles set feed_last_seen_at = now() where id = $me` on every visit, before fetching posts. This is idempotent and only writes one row.

**Tradeoffs:**
- Layout query runs on every app page. The query is a single boolean lookup with one index hit — acceptable cost. If observed slowness, we can switch to a single per-session cookie check later.

### 4. Post-prediction "Share my pick" CTA

**Where:** `src/components/PredictionForm.tsx`, conditionally rendered below the save button after a successful save.

**What:**
- After save success, if the user has no existing `posts` row with `match_id = this match` AND `user_id = me`, render an inline panel:
  - Pre-filled body (locale-aware template):
    - EN: `Predicted {home_flag} {home_score}–{away_score} {away_flag} — let's go!`
    - AR: `توقّعت {home_flag} {home_score}–{away_score} {away_flag} — يلا!`
  - Editable textarea showing the body.
  - Two buttons: **Share** (posts) and **Not now** (dismisses for this session).
- Tapping Share calls `POST /api/posts` with the body and `match_id`.
- After success, the CTA hides and a small confirmation chip appears.
- "Show once per match per user" is enforced by the existence check; no extra state stored.

**Data:**
- The existence check happens server-side on the match detail page load (already loads predictions); we add a single `select count(*) from posts where user_id = me and match_id = m.id` and pass `hasSharedPick: boolean` down to `PredictionForm`.

## Data model

**Only one additive change.** Predictions, posts, reactions, comments, scoring — all untouched.

```sql
-- supabase/migrations/015_feed_last_seen.sql
alter table public.profiles
  add column if not exists feed_last_seen_at timestamptz not null default now();
```

RLS on `profiles` already allows users to update their own row; no policy change needed for the write.

## API

All existing endpoints. No new routes.

- `POST /api/posts` — used by match thread composer and share CTA (already supports `match_id`).
- `POST /api/posts/[id]/reactions` — used by home teaser inline reactions (already exists).
- `GET` reads use Supabase client directly from server components (current pattern).

## i18n

New dictionary entries needed (en + ar):

```ts
feed: {
  // existing keys...
  homeTeaserTitle: 'Latest from the chat' / 'آخر الدردشة',
  matchThreadTitle: 'Match chat' / 'دردشة المباراة',
  matchThreadEmpty: 'Be the first to talk about this match' / 'كن أول من يتحدث عن هذه المباراة',
  sharePickTitle: 'Share with the scouts?' / 'شارك مع الكشّافة؟',
  sharePickShare: 'Share' / 'شارك',
  sharePickNotNow: 'Not now' / 'ليس الآن',
  sharePickTemplate: "Predicted {home} {hs}–{as} {away} — let's go!" / 'توقّعت {home} {hs}–{as} {away} — يلا!',
}
```

## Components

**New:**
- `src/components/FeedTeaser.tsx` — client component. Takes preloaded posts, renders compact cards with inline `ReactionBar`.
- `src/components/MatchThread.tsx` — client component. Composer + posts list + load-more for one match.
- `src/components/SharePickCTA.tsx` — client component. Inline panel rendered conditionally by `PredictionForm`.

**Modified:**
- `src/app/(app)/home/page.tsx` — fetch 2 latest posts via `enrichPosts`, pass to `FeedTeaser`.
- `src/app/(app)/matches/[id]/page.tsx` — fetch match-tagged posts + `hasSharedPick` flag; render `MatchThread` and pass flag to `PredictionForm`.
- `src/app/(app)/feed/page.tsx` — `update profiles set feed_last_seen_at = now()` on visit.
- `src/app/(app)/layout.tsx` — fetch unread boolean, pass to `BottomNav`.
- `src/components/BottomNav.tsx` — accept `unreadFeed: boolean` prop; render red dot on Chat tab icon.
- `src/components/PredictionForm.tsx` — accept `hasSharedPick: boolean`; render `SharePickCTA` after successful save when `!hasSharedPick`.
- `src/lib/i18n/dictionaries.ts` — add new feed keys (en + ar).

## Data flow per surface

### Home teaser
1. `home/page.tsx` (server) → Supabase: latest 2 posts → `enrichPosts`.
2. Renders `<FeedTeaser initialPosts={posts} />`.
3. `FeedTeaser` (client) → user taps emoji → `POST /api/posts/[id]/reactions` → optimistic update.

### Match thread
1. `matches/[id]/page.tsx` (server) → Supabase: posts where `match_id = m.id` (limit 5, desc) → `enrichPosts`.
2. Same page → Supabase: `count(*) from posts where user_id = me and match_id = m.id` → `hasSharedPick`.
3. Renders `<MatchThread matchId initialPosts />` and `<PredictionForm hasSharedPick />`.
4. `MatchThread` composer → `POST /api/posts { body, match_id }` → prepends to list.

### Unread dot
1. `layout.tsx` (server) → boolean existence check.
2. Passes `unreadFeed` to `BottomNav`.
3. User visits `/feed` → `feed/page.tsx` updates `feed_last_seen_at = now()` server-side before rendering.
4. Next layout render → boolean is false → dot disappears.

### Share CTA
1. After `PredictionForm` save success and `!hasSharedPick`:
2. Render `<SharePickCTA template={...} matchId={m.id} />` with pre-filled body.
3. User taps Share → `POST /api/posts { body, match_id }` → on success, swap to confirmation chip; CTA hides.
4. User taps Not now → CTA hides for this session (component state only, no persistence).

## Error handling

- All client mutations use the existing optimistic + rollback pattern from `FeedClient.tsx`.
- Rate-limit responses surface the existing `t.feed.rateLimited` toast.
- Failed reactions on the teaser do not break the card; the emoji count rolls back and a small error chip appears.
- Missing `feed_last_seen_at` (legacy row before migration) treated as "epoch", so existing users will see a dot once after deploy — acceptable.

## Testing

**Manual:**
- Home page: with 0, 1, 2, 3+ posts in DB, verify teaser rendering and section hiding.
- Home teaser reactions: tap each emoji, verify optimistic + persisted state matches feed page.
- Match thread: open match with 0 posts → empty state. Post via mini-composer → appears at top. Reactions/comments work.
- Match thread pagination: 6+ posts → "Load more" pulls next page.
- Unread dot: as user A, post a message; as user B in another browser, navigate any app page → dot visible on Chat tab. Visit `/feed` → dot disappears on next nav.
- Unread dot ignores own posts: as user A, post; reload home as A → no dot.
- Share CTA: save a prediction for a match you haven't shared → CTA appears with template. Tap Share → post lands in feed and on match thread. Save again → CTA does not reappear.
- Share CTA, ar locale: template renders in Arabic with correct RTL.
- Share CTA, "Not now": tap → CTA disappears. Reload page → CTA returns (session-only dismissal acceptable).

**Migration:**
- Run `015_feed_last_seen.sql` against a copy of production data first. Confirm no errors, all existing rows get `feed_last_seen_at = now()`.

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Layout-level unread query slow at scale | Currently posts table is small (single-tournament app). Add `posts(created_at)` index if needed (likely already exists for `order by created_at`). |
| Share CTA feels spammy | "Once per match per user" suppresses repeat prompts; user can dismiss with Not now. |
| Match thread doubles `POST /api/posts` load | Same endpoint, same rate limit — no extra cost; consistent with existing patterns. |
| Migration adds NOT NULL column with default | Safe — Postgres rewrites in-place when default is constant; profile rows are few (tens to hundreds), not millions. |

## Out of scope (for follow-up if needed)

- Auto-generated system posts after each match
- Per-group sub-feeds
- Push / email notifications
- Reaction analytics dashboard
- Streaks, badges, head-to-head challenges

## Rollout

Single deploy after the migration runs. No feature flag — additive UI changes, safe to ship together. Verify in production by:
1. Confirming migration applied (`select feed_last_seen_at from profiles limit 1;`)
2. Posting on the feed and confirming the dot appears for other accounts.
3. Saving a prediction and confirming the Share CTA shows.
