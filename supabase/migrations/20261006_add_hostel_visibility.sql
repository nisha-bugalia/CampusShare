-- ============================================================
-- Migration: Add hostel-based visibility to listings and requests
--
-- Adds visibility_hostels text[] NOT NULL DEFAULT '{}'
-- interpretation: '{}' = Everyone; non-empty array = allowed hostels
-- Migrates existing visibility string values:
--   'Everyone' -> '{}'
--   'My Hostel' -> '{}'
--   'Girls Hostel' -> array of 4 girls hostels
--   'Boys Hostel' -> array of Hostel 1 through Hostel 11
-- Updates SELECT RLS policies to enforce visibility at database level.
-- Adds GIN indexes on visibility_hostels.
-- Note: Does NOT drop the existing visibility column (kept for backward compatibility).
-- ============================================================

-- 1. Add visibility_hostels column to public.listings
alter table public.listings
  add column if not exists visibility_hostels text[] not null default '{}';

-- 2. Add visibility_hostels column to public.requests
alter table public.requests
  add column if not exists visibility_hostels text[] not null default '{}';

-- 3. Data migration for public.listings
update public.listings
set visibility_hostels = '{}'::text[]
where visibility in ('Everyone', 'My Hostel') or visibility is null;

update public.listings
set visibility_hostels = array[
  'Girls Hostel 1 (KCB)',
  'Girls Hostel 2 (Bhagirathi)',
  'Girls Hostel 3 (Cauvery)',
  'Girls Hostel 4'
]::text[]
where visibility = 'Girls Hostel';

update public.listings
set visibility_hostels = array[
  'Hostel 1',
  'Hostel 2',
  'Hostel 3',
  'Hostel 4',
  'Hostel 5',
  'Hostel 6',
  'Hostel 7',
  'Hostel 8',
  'Hostel 9',
  'Hostel 10',
  'Hostel 11'
]::text[]
where visibility = 'Boys Hostel';

-- 4. Data migration for public.requests
update public.requests
set visibility_hostels = '{}'::text[]
where visibility in ('Everyone', 'My Hostel') or visibility is null;

update public.requests
set visibility_hostels = array[
  'Girls Hostel 1 (KCB)',
  'Girls Hostel 2 (Bhagirathi)',
  'Girls Hostel 3 (Cauvery)',
  'Girls Hostel 4'
]::text[]
where visibility = 'Girls Hostel';

update public.requests
set visibility_hostels = array[
  'Hostel 1',
  'Hostel 2',
  'Hostel 3',
  'Hostel 4',
  'Hostel 5',
  'Hostel 6',
  'Hostel 7',
  'Hostel 8',
  'Hostel 9',
  'Hostel 10',
  'Hostel 11'
]::text[]
where visibility = 'Boys Hostel';

-- 5. Performance GIN indexes
create index if not exists idx_listings_visibility_hostels
  on public.listings using gin (visibility_hostels);

create index if not exists idx_requests_visibility_hostels
  on public.requests using gin (visibility_hostels);

-- 6. Update SELECT RLS policies
-- Replace the current SELECT policy for listings
drop policy if exists "listings: authenticated users can read active listings" on public.listings;

create policy "listings: authenticated users can read active listings"
  on public.listings
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or (
      status = 'active'
      and (
        visibility_hostels = '{}'::text[]
        or (
          select p.hostel
          from public.profiles p
          where p.id = auth.uid()
        ) = any(visibility_hostels)
      )
    )
  );

-- Replace the current SELECT policy for requests
drop policy if exists "requests: authenticated users can read active requests" on public.requests;

create policy "requests: authenticated users can read active requests"
  on public.requests
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or (
      status = 'active'
      and (
        visibility_hostels = '{}'::text[]
        or (
          select p.hostel
          from public.profiles p
          where p.id = auth.uid()
        ) = any(visibility_hostels)
      )
    )
  );
