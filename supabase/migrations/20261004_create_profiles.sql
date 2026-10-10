-- ============================================================
-- CampusShare: profiles table + RLS + auto-create trigger
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard.
--   2. Go to SQL Editor.
--   3. Paste this entire file and click "Run".
--   4. Verify the "profiles" table appears in Table Editor.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. Create the profiles table
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid        primary key references auth.users (id) on delete cascade,
  name        text,
  email       text,
  branch      text,
  hostel      text,
  avatar_url  text,
  verified    boolean     not null default false,
  created_at  timestamptz not null default now()
);


-- ─────────────────────────────────────────────────────────────
-- 2. Enable Row Level Security
-- ─────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;


-- ─────────────────────────────────────────────────────────────
-- 3. RLS Policies
-- ─────────────────────────────────────────────────────────────

-- 3a. Authenticated users can view profiles of student members on the marketplace
create policy "profiles: authenticated users can read public profiles"
  on public.profiles
  for select
  to authenticated
  using (true);

-- 3b. Authenticated user can update their own profile only
create policy "profiles: owner can update own row"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 3c. Authenticated user can insert their own profile row if not created by trigger
create policy "profiles: owner can insert own row"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- No delete policy — profiles should only be removed via cascade
-- when the corresponding auth.users row is deleted.


-- ─────────────────────────────────────────────────────────────
-- 4. Trigger function: auto-create profile on new user signup
-- ─────────────────────────────────────────────────────────────

-- The function runs as the database owner (SECURITY DEFINER),
-- which allows it to insert into public.profiles even though
-- anonymous users have no INSERT policy.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    name,
    email,
    avatar_url,
    branch,
    hostel,
    verified,
    created_at
  )
  values (
    new.id,
    -- Prefer display name from Google metadata, fall back to email local-part
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    -- Google profile picture when available
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    ),
    null,   -- branch: collected in onboarding
    null,   -- hostel: collected in onboarding
    -- Mark verified = true because the existing Supabase Auth Hook
    -- already enforces the @nitkkr.ac.in domain restriction.
    true,
    now()
  )
  on conflict (id) do nothing;  -- Idempotent: safe to call multiple times

  return new;
end;
$$;


-- ─────────────────────────────────────────────────────────────
-- 5. Attach trigger to auth.users
-- ─────────────────────────────────────────────────────────────

-- Drop first if it already exists so re-running this file is safe
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- ─────────────────────────────────────────────────────────────
-- 6. Backfill existing auth.users who signed up before the trigger
-- ─────────────────────────────────────────────────────────────
insert into public.profiles (
  id,
  name,
  email,
  avatar_url,
  branch,
  hostel,
  verified,
  created_at
)
select
  id,
  coalesce(
    raw_user_meta_data ->> 'name',
    raw_user_meta_data ->> 'full_name',
    split_part(email, '@', 1)
  ),
  email,
  coalesce(
    raw_user_meta_data ->> 'avatar_url',
    raw_user_meta_data ->> 'picture'
  ),
  null,
  null,
  true,
  created_at
from auth.users
on conflict (id) do nothing;

