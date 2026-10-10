-- ============================================================
-- CampusShare: push_tokens table + RLS + user_id index
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard.
--   2. Go to SQL Editor.
--   3. Paste this entire file and click "Run".
--   4. Verify the "push_tokens" table appears under Table Editor.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Create the push_tokens table
-- ─────────────────────────────────────────────────────────────
create table if not exists public.push_tokens (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles (id) on delete cascade,
  expo_push_token text        not null unique,
  platform        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 2. Performance Indexes
-- ─────────────────────────────────────────────────────────────
create index if not exists idx_push_tokens_user_id
  on public.push_tokens (user_id);

-- ─────────────────────────────────────────────────────────────
-- 3. Enable Row Level Security (RLS)
-- ─────────────────────────────────────────────────────────────
alter table public.push_tokens enable row level security;

-- ─────────────────────────────────────────────────────────────
-- 4. Row Level Security Policies
-- Users may SELECT/INSERT/UPDATE/DELETE only their own tokens
-- ─────────────────────────────────────────────────────────────

-- 4a. Select: Authenticated users can read only their own push tokens
create policy "push_tokens: owner can select own tokens"
  on public.push_tokens
  for select
  to authenticated
  using (auth.uid() = user_id);

-- 4b. Insert: Authenticated users can insert push tokens only for themselves
create policy "push_tokens: owner can insert own tokens"
  on public.push_tokens
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 4c. Update: Authenticated users can update only their own push tokens
create policy "push_tokens: owner can update own tokens"
  on public.push_tokens
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4d. Delete: Authenticated users can delete only their own push tokens
create policy "push_tokens: owner can delete own tokens"
  on public.push_tokens
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 5. Auto-update updated_at timestamp trigger
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_push_tokens_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_push_tokens_updated_at on public.push_tokens;

create trigger set_push_tokens_updated_at
  before update on public.push_tokens
  for each row
  execute function public.set_push_tokens_updated_at();
