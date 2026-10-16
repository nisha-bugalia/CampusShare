-- ============================================================
-- CampusShare: Safety System — Blocks & Reports Tables + RLS
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard.
--   2. Go to SQL Editor.
--   3. Paste this entire file and click "Run".
--   4. Verify "blocks" and "reports" tables appear under Table Editor.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Create the blocks table
-- ─────────────────────────────────────────────────────────────
create table if not exists public.blocks (
  id          uuid        primary key default gen_random_uuid(),
  blocker_id  uuid        not null default auth.uid(),
  blocked_id  uuid        not null,
  created_at  timestamptz not null default now(),

  constraint blocks_blocker_id_fkey
    foreign key (blocker_id) references public.profiles (id) on delete cascade,
  constraint blocks_blocked_id_fkey
    foreign key (blocked_id) references public.profiles (id) on delete cascade,
  constraint blocks_no_self_block
    check (blocker_id != blocked_id),
  constraint blocks_unique_pair
    unique (blocker_id, blocked_id)
);

-- Ensure column default exists even if table was created previously without it
alter table public.blocks
  alter column blocker_id set default auth.uid();

-- ─────────────────────────────────────────────────────────────
-- 2. Performance Indexes for blocks
-- ─────────────────────────────────────────────────────────────
create index if not exists idx_blocks_blocker_id
  on public.blocks (blocker_id);

create index if not exists idx_blocks_blocked_id
  on public.blocks (blocked_id);

-- ─────────────────────────────────────────────────────────────
-- 3. Enable Row Level Security (RLS) for blocks
-- ─────────────────────────────────────────────────────────────
alter table public.blocks enable row level security;

-- Drop existing policies if re-running
drop policy if exists "blocks: view blocks involving user" on public.blocks;
drop policy if exists "blocks: insert own block" on public.blocks;
drop policy if exists "blocks: delete own block" on public.blocks;

-- 3a. Select: Users can view block rows if they are blocker or blocked
create policy "blocks: view blocks involving user"
  on public.blocks
  for select
  to authenticated
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);

-- 3b. Insert: Users can only insert blocks where they are the blocker
create policy "blocks: insert own block"
  on public.blocks
  for insert
  to authenticated
  with check (auth.uid() = blocker_id);

-- 3c. Delete: Users can only delete (unblock) their own blocks
create policy "blocks: delete own block"
  on public.blocks
  for delete
  to authenticated
  using (auth.uid() = blocker_id);


-- ─────────────────────────────────────────────────────────────
-- 4. Create the reports table
-- ─────────────────────────────────────────────────────────────
create table if not exists public.reports (
  id          uuid        primary key default gen_random_uuid(),
  reporter_id uuid        not null default auth.uid(),
  target_type text        not null check (target_type in ('user', 'listing', 'request', 'message')),
  target_id   text        not null,
  reason      text        not null check (
    reason in (
      'harassment',
      'spam',
      'scam_fraud',
      'scam',
      'impersonation',
      'inappropriate_behaviour',
      'misleading_information',
      'spam_duplicate',
      'prohibited_item',
      'suspicious_listing',
      'fake_listing',
      'inappropriate_content',
      'other'
    )
  ),
  description text,
  status      text        not null default 'pending' check (status in ('pending', 'reviewing', 'reviewed', 'resolved', 'dismissed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint reports_reporter_id_fkey
    foreign key (reporter_id) references public.profiles (id) on delete cascade
);

-- Ensure column defaults and constraints exist even if table was created previously
alter table public.reports
  alter column reporter_id set default auth.uid();

alter table public.reports drop constraint if exists reports_reason_check;
alter table public.reports drop constraint if exists chk_reports_reason;
alter table public.reports add constraint reports_reason_check check (
  reason in (
    'harassment',
    'spam',
    'scam_fraud',
    'scam',
    'impersonation',
    'inappropriate_behaviour',
    'misleading_information',
    'spam_duplicate',
    'prohibited_item',
    'suspicious_listing',
    'fake_listing',
    'inappropriate_content',
    'other'
  )
);

alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports drop constraint if exists chk_reports_status;
alter table public.reports add constraint reports_status_check check (
  status in ('pending', 'reviewing', 'reviewed', 'resolved', 'dismissed')
);

-- ─────────────────────────────────────────────────────────────
-- 5. Performance Indexes for reports
-- ─────────────────────────────────────────────────────────────
create index if not exists idx_reports_reporter_id
  on public.reports (reporter_id);

create index if not exists idx_reports_status
  on public.reports (status);

create index if not exists idx_reports_target
  on public.reports (target_type, target_id);

-- ─────────────────────────────────────────────────────────────
-- 6. Enable Row Level Security (RLS) for reports
-- ─────────────────────────────────────────────────────────────
alter table public.reports enable row level security;

-- Drop existing policies if re-running
drop policy if exists "reports: select own reports" on public.reports;
drop policy if exists "reports: insert own report" on public.reports;

-- 6a. Select: Users can view their own submitted reports
create policy "reports: select own reports"
  on public.reports
  for select
  to authenticated
  using (auth.uid() = reporter_id);

-- 6b. Insert: Authenticated users can insert reports with themselves as reporter
create policy "reports: insert own report"
  on public.reports
  for insert
  to authenticated
  with check (auth.uid() = reporter_id);

-- ─────────────────────────────────────────────────────────────
-- 7. Auto-update updated_at timestamp trigger for reports
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_reports_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_reports_updated_at on public.reports;

create trigger set_reports_updated_at
  before update on public.reports
  for each row
  execute function public.set_reports_updated_at();
