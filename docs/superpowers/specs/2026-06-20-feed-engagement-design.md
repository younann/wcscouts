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
- **Empty state:** if 0 posts exist, the entire section (header included) is hidden.

**Reaction-on-teaser scope:** the optimistic update lives entirely inside `FeedTeaser` state. It does not pre-populate the `/feed` route; the user will see the same state once they navigate (it's read from the same `post_reactions` table). No cross-component cache wiring required.

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
- "Load more" inline button paginates with `before` cursor (same pattern as the main feed).
- Each post reuses `PostCard` for the full set of feed interactions (reactions, comments).
- Empty state copy: "Be the first to talk about this match" / «كن أول من يتحدث عن هذه المباراة».

**API change required:** `GET /api/posts` does not currently support filtering by `match_id`. Add an optional `match_id` query param (`src/app/api/posts/route.ts`): if present and numeric, append `.eq('match_id', n)` to the select. No schema change; no impact on existing callers.

**Component scope:** `MatchThread.tsx` is a NEW client component that does **not** reuse the existing `Composer.tsx` (which manages its own `MatchTagPicker` state). It uses its own minimal textarea/Post-button UI with the match id baked in. Initial posts and `next_cursor` are passed from the server-rendered page; subsequent "Load more" calls hit `GET /api/posts?match_id={id}&before={cursor}`.

**Data:** server-side fetch in match detail page, calling `enrichPosts` filtered by `match_id`. The same query also computes `next_cursor` server-side to seed pagination.

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

Existing profile rows are populated with `now()` at deploy time, so existing users do **not** see a dot immediately after deploy. New posts authored after deploy trigger dots normally.

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
- Result is a single boolean — cheap (uses existing `posts(created_at desc)` index from migration 011).
- Passed to `BottomNav` as a prop.
- The `(app)` route group is auth-gated, so the user id is always set; this query does not run for `/login`, `/signup`, or `/`.

**Write side:**
- `(app)/feed/page.tsx` does a server-side `update profiles set feed_last_seen_at = now() where id = $me` on every visit, before fetching posts. This is idempotent and only writes one row.
- The existing `profiles_update_self` RLS policy permits this — its `with check` requires `auth.uid() = id` and unchanged `role`; we only set `feed_last_seen_at` so `role` is preserved. No new policy needed.
- The match thread does **not** update `feed_last_seen_at`; the dot specifically signals "unseen activity in the main feed". Users who read only match threads will still see a dot, which is intentional (drives them to the feed once).

**Tradeoffs:**
- Layout query runs on every app page render. Single boolean lookup with index hit — acceptable for current scale (hundreds of users, one tournament). If slow later, switch to a per-session cookie check.
- **Race on first `/feed` visit:** layout and feed page queries run concurrently; the layout may read `feed_last_seen_at` before the update commits, leaving the dot visible for one render. The next navigation clears it. Acceptable cosmetic delay.

### 4. Post-prediction "Share my pick" CTA

**Where:** `src/components/PredictionForm.tsx`, conditionally rendered below the save button after a successful save in the current session.

**What:**
- The match detail page passes a new prop `hasSharedPick: boolean` to `PredictionForm`. The prop is **optional** with default `false` so the existing single caller pattern is preserved (there is currently only one caller — `src/app/(app)/matches/[id]/page.tsx:94`).
- `PredictionForm` tracks a local `justSaved: boolean` (set to `true` after the `submit()` success branch). The CTA shows when `justSaved && !hasSharedPick && !dismissed`.
- `hasSharedPick` is server-truth at page-load time; `justSaved` is client-truth for the active session. The combination prevents both stale CTAs and "already shared" CTAs from showing.
- Pre-filled body (locale-aware template), placeholder keys consistent throughout:
  - EN: `Predicted {home_flag} {home_score}–{away_score} {away_flag} — let's go!`
  - AR: `توقّعت {home_flag} {home_score}–{away_score} {away_flag} — يلا!`
- Editable textarea showing the body.
- Two buttons: **Share** (posts) and **Not now** (dismisses).
- Tapping Share calls `POST /api/posts` with the body and `match_id`. On success, the CTA hides and a small confirmation chip appears.
- **"Not now" persistence:** dismissal is stored in `localStorage` under key `wc_share_dismissed_{matchId}` so reloads do not re-prompt. (Session-only state would look like a bug after a refresh.)
- **Edge case:** if a user deletes their own share post and then re-saves the prediction, the CTA will reappear on next page load — `hasSharedPick` re-flips to `false`. Acceptable.

**Data:**
- The existence check happens server-side on the match detail page load (already loads predictions); we add a single `select count(*) from posts where user_id = me and match_id = m.id` and pass `hasSharedPick: boolean` down to `PredictionForm`.

**Rate-limit interaction:** `POST /api/posts` enforces `MAX_POSTS_PER_HOUR = 10` per user. A user predicting many matches in an hour and sharing each will hit the limit. The CTA surfaces the existing `t.feed.rateLimited` error inline and keeps the editable body so the user can retry later — no spec change to rate-limit policy.

## Data model

**Only one additive change.** Predictions, posts, reactions, comments, scoring — all untouched.

```sql
-- supabase/migrations/015_feed_last_seen.sql
alter table public.profiles
  add column if not exists feed_last_seen_at timestamptz not null default now();
```

RLS on `profiles` already allows users to update their own row; no policy change needed for the write.

## API

No new routes. One minor change to one existing route.

- `GET /api/posts` — **add optional `match_id` query param.** When present and numeric, append `.eq('match_id', n)` to the select. Required so `MatchThread` can paginate "load more" filtered by match. No impact on existing callers (param is optional).
- `POST /api/posts` — unchanged. Used by match thread composer and share CTA (already supports `match_id`).
- `POST /api/posts/[id]/reactions` — unchanged. Used by home teaser inline reactions.
- `GET` reads from home/match detail/feed pages use the Supabase client directly from server components (current pattern).

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
- `src/components/PredictionForm.tsx` — accept optional `hasSharedPick?: boolean` (default `false`); track local `justSaved` state; render `SharePickCTA` when `justSaved && !hasSharedPick && !dismissed`.
- `src/app/api/posts/route.ts` — `GET` accepts optional `match_id` query param.
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
