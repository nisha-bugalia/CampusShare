-- ============================================================
-- CampusShare: requests table ("I NEED") + RLS + indexes
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard.
--   2. Go to SQL Editor.
--   3. Paste this entire file and click "Run".
--   4. Verify the "requests" table appears under Table Editor.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. Create the requests table
-- ─────────────────────────────────────────────────────────────
create table if not exists public.requests (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  title       text        not null check (char_length(trim(title)) > 0),
  category    text        not null check (char_length(trim(category)) > 0),
  description text        not null check (char_length(trim(description)) > 0),
  budget      numeric     check (budget is null or budget >= 0),
  needed_for  text        not null check (needed_for in ('One-time use', 'A few days', 'A few weeks', 'Long term')),
  hostel      text        not null check (char_length(trim(hostel)) > 0),
  visibility  text        not null check (char_length(trim(visibility)) > 0),
  status      text        not null default 'active' check (status in ('active', 'fulfilled', 'inactive', 'archived')),
  created_at  timestamptz not null default now()
);


-- ─────────────────────────────────────────────────────────────
-- 2. Enable Row Level Security (RLS)
-- ─────────────────────────────────────────────────────────────
alter table public.requests enable row level security;


-- ─────────────────────────────────────────────────────────────
-- 3. Row Level Security Policies
-- ─────────────────────────────────────────────────────────────

-- 3a. Read: Authenticated users can read active requests,
--     and owners can read any of their own requests (even if inactive/fulfilled/archived)
create policy "requests: authenticated users can read active requests"
  on public.requests
  for select
  to authenticated
  using (status = 'active' or auth.uid() = user_id);

-- 3b. Create: Authenticated users can inse1rt requests ONLY for themselves
--     Prevents users from spoofing another student's user_id
create policy "requests: authenticated user can insert own requests"
  on public.requests
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 3c. Update: A user can update only their own requests,
--     and CANNOT reassign the request to another user_id
create policy "requests: owner can update own requests"
  on public.requests
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3d. Delete: A user can delete only their own requests
create policy "requests: owner can delete own requests"
  on public.requests
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- NOTE on Anonymous access:
-- Because RLS is enabled and policies are granted ONLY 'to authenticated',
-- anonymous users (anon role) are automatically denied all read/write access.


-- ─────────────────────────────────────────────────────────────
-- 4. Performance Indexes
-- ─────────────────────────────────────────────────────────────

-- Index for retrieving all requests posted by a specific student (Profile / My Requests)
create index if not exists idx_requests_user_id
  on public.requests (user_id);

-- Index for filtering requests by category (e.g., Books, Electronics)
create index if not exists idx_requests_category
  on public.requests (category);

-- Index for filtering by status (e.g., active vs fulfilled)
create index if not exists idx_requests_status
  on public.requests (status);

-- Index for chronological sorting (newest requests first)
create index if not exists idx_requests_created_at
  on public.requests (created_at desc);

-- Composite index: primary feed query (active requests sorted newest first)
create index if not exists idx_requests_status_created_at
  on public.requests (status, created_at desc);

-- Composite index: category browsing query (category filtered + active status)
create index if not exists idx_requests_category_status
  on public.requests (category, status);
