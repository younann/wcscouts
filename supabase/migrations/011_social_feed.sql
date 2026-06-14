-- Social feed: global timeline with reactions and flat comments.

create table if not exists public.posts (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 280),
  match_id bigint references public.matches(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_match_idx on public.posts (match_id) where match_id is not null;
create index if not exists posts_user_idx on public.posts (user_id);

create table if not exists public.post_reactions (
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (emoji in ('🔥','⚽','😂','👏','😍','😱','🎯')),
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id bigserial primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now()
);
create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);
create index if not exists post_comments_user_idx on public.post_comments (user_id);

-- RLS
alter table public.posts enable row level security;
alter table public.post_reactions enable row level security;
alter table public.post_comments enable row level security;

drop policy if exists posts_select_all on public.posts;
create policy posts_select_all on public.posts
  for select using (auth.uid() is not null);

drop policy if exists posts_insert_own on public.posts;
create policy posts_insert_own on public.posts
  for insert with check (auth.uid() = user_id);

drop policy if exists posts_delete_own_or_admin on public.posts;
create policy posts_delete_own_or_admin on public.posts
  for delete using (auth.uid() = user_id or public.is_admin());

drop policy if exists reactions_select_all on public.post_reactions;
create policy reactions_select_all on public.post_reactions
  for select using (auth.uid() is not null);

drop policy if exists reactions_write_own on public.post_reactions;
create policy reactions_write_own on public.post_reactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists comments_select_all on public.post_comments;
create policy comments_select_all on public.post_comments
  for select using (auth.uid() is not null);

drop policy if exists comments_insert_own on public.post_comments;
create policy comments_insert_own on public.post_comments
  for insert with check (auth.uid() = user_id);

drop policy if exists comments_delete_own_or_admin on public.post_comments;
create policy comments_delete_own_or_admin on public.post_comments
  for delete using (auth.uid() = user_id or public.is_admin());
