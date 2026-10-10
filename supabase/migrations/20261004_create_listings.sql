-- ============================================================
-- CampusShare: listings table + RLS + performance indexes
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard.
--   2. Go to SQL Editor.
--   3. Paste this entire file and click "Run".
--   4. Verify the "listings" table appears under Table Editor.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. Create the listings table
-- ─────────────────────────────────────────────────────────────
create table if not exists public.listings (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles (id) on delete cascade,
  title        text        not null check (char_length(trim(title)) > 0),
  category     text        not null check (char_length(trim(category)) > 0),
  listing_type text        not null check (listing_type in ('rent', 'sell', 'give')),
  price        numeric     check (price is null or price >= 0),
  description  text        not null,
  hostel       text        not null check (char_length(trim(hostel)) > 0),
  visibility   text        not null check (char_length(trim(visibility)) > 0),
  image_url    text,
  status       text        not null default 'active' check (status in ('active', 'reserved', 'completed', 'inactive', 'archived')),
  created_at   timestamptz not null default now()
);


-- ─────────────────────────────────────────────────────────────
-- 2. Enable Row Level Security (RLS)
-- ─────────────────────────────────────────────────────────────
alter table public.listings enable row level security;


-- ─────────────────────────────────────────────────────────────
-- 3. Row Level Security Policies
-- ─────────────────────────────────────────────────────────────

-- 3a. Read: Authenticated users can read active listings,
--     and owners can read any of their own listings (even if inactive/archived)
create policy "listings: authenticated users can read active listings"
  on public.listings
  for select
  to authenticated
  using (status = 'active' or auth.uid() = user_id);

-- 3b. Create: Authenticated users can insert listings ONLY for themselves
--     Prevents users from spoofing another student's user_id
create policy "listings: authenticated user can insert own listings"
  on public.listings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 3c. Update: A user can update only their own listings,
--     and CANNOT reassign the listing to another user_id
create policy "listings: owner can update own listings"
  on public.listings
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3d. Delete: A user can delete only their own listings
create policy "listings: owner can delete own listings"
  on public.listings
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- NOTE on Anonymous access:
-- Because RLS is enabled and policies are granted ONLY 'to authenticated',
-- anonymous users (anon role) are automatically denied all read/write access.


-- ─────────────────────────────────────────────────────────────
-- 4. Performance Indexes
-- ─────────────────────────────────────────────────────────────

-- Index for retrieving all listings posted by a specific student (Profile / My Posts)
create index if not exists idx_listings_user_id
  on public.listings (user_id);

-- Index for filtering listings by category (e.g., Books, Electronics)
create index if not exists idx_listings_category
  on public.listings (category);

-- Index for filtering by status (e.g., active vs completed)
create index if not exists idx_listings_status
  on public.listings (status);

-- Index for chronological sorting (newest listings first)
create index if not exists idx_listings_created_at
  on public.listings (created_at desc);

-- Composite index: primary feed query (active listings sorted newest first)
create index if not exists idx_listings_status_created_at
  on public.listings (status, created_at desc);

-- Composite index: category browsing query (category filtered + active status)
create index if not exists idx_listings_category_status
  on public.listings (category, status);
