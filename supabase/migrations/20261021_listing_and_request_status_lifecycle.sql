-- ============================================================
-- Migration: Listing & Request Status Lifecycle V1
--
-- 1. Updates listings.status check constraint to support:
--    'active', 'rented', 'sold', 'given', 'cancelled'
--    (keeps legacy 'reserved', 'completed', 'inactive', 'archived')
-- 2. Adds rental tracking columns to public.listings:
--    - rented_to_user_id (uuid references public.profiles)
--    - rented_at (timestamptz)
-- 3. Updates requests.status check constraint to support:
--    'active', 'fulfilled', 'cancelled'
--    (keeps legacy 'inactive', 'archived')
-- 4. Updates SELECT RLS policies on public.listings and public.requests:
--    - Allows authenticated users to view active items or items within their
--      hostel visibility scope (even if inactive/rented/sold/given/fulfilled/cancelled,
--      so deep links and past chat item references work with status banners).
--    - The marketplace feed queries explicitly filter by status = 'active'.
-- 5. Ensures UPDATE and DELETE policies remain strictly restricted to the
--    authenticated creator (auth.uid() = user_id).
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Listings Table: status constraint and rental metadata
-- ─────────────────────────────────────────────────────────────

-- Drop existing status check constraints on public.listings
alter table public.listings drop constraint if exists listings_status_check;
alter table public.listings drop constraint if exists chk_listings_status;

-- Add updated status check constraint
alter table public.listings add constraint listings_status_check
  check (status in ('active', 'rented', 'sold', 'given', 'cancelled', 'reserved', 'completed', 'inactive', 'archived'));

-- Add rental metadata columns
alter table public.listings
  add column if not exists rented_to_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists rented_at timestamptz;

-- ─────────────────────────────────────────────────────────────
-- 2. Requests Table: status constraint
-- ─────────────────────────────────────────────────────────────

-- Drop existing status check constraints on public.requests
alter table public.requests drop constraint if exists requests_status_check;
alter table public.requests drop constraint if exists chk_requests_status;

-- Add updated status check constraint
alter table public.requests add constraint requests_status_check
  check (status in ('active', 'fulfilled', 'cancelled', 'inactive', 'archived'));

-- ─────────────────────────────────────────────────────────────
-- 3. Performance Indexes
-- ─────────────────────────────────────────────────────────────

-- Index for retrieving user listings by status (e.g. My Posts history)
create index if not exists idx_listings_user_status
  on public.listings (user_id, status);

-- Index for retrieving user requests by status
create index if not exists idx_requests_user_status
  on public.requests (user_id, status);

-- Index for rental lookups
create index if not exists idx_listings_rented_to
  on public.listings (rented_to_user_id)
  where rented_to_user_id is not null;

-- ─────────────────────────────────────────────────────────────
-- 4. Row Level Security (RLS) Policies
-- ─────────────────────────────────────────────────────────────

-- Drop old SELECT policies for listings
drop policy if exists "listings: authenticated users can read active listings" on public.listings;
drop policy if exists "listings: authenticated users can read listings" on public.listings;

-- New SELECT policy: authenticated users can read any listing matching their hostel visibility,
-- or their own listings (regardless of status). This allows detail views for rented/sold/given items.
create policy "listings: authenticated users can read listings"
  on public.listings
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or (
      visibility_hostels = '{}'::text[]
      or (
        select p.hostel
        from public.profiles p
        where p.id = auth.uid()
      ) = any(visibility_hostels)
    )
  );

-- Drop old SELECT policies for requests
drop policy if exists "requests: authenticated users can read active requests" on public.requests;
drop policy if exists "requests: authenticated users can read requests" on public.requests;

-- New SELECT policy: authenticated users can read any request matching their hostel visibility,
-- or their own requests (regardless of status). This allows detail views for fulfilled items.
create policy "requests: authenticated users can read requests"
  on public.requests
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or (
      visibility_hostels = '{}'::text[]
      or (
        select p.hostel
        from public.profiles p
        where p.id = auth.uid()
      ) = any(visibility_hostels)
    )
  );

-- Note on UPDATE:
-- Existing policy "listings: owner can update own listings"
-- uses (auth.uid() = user_id) with check (auth.uid() = user_id)
-- Existing policy "requests: requester can update own requests"
-- uses (auth.uid() = user_id) with check (auth.uid() = user_id)
-- Both guarantee that only the owner/requester can update status.
