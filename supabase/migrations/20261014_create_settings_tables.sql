-- ============================================================
-- CampusShare: Settings Tables — Notification Preferences & Feedback
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard.
--   2. Go to SQL Editor.
--   3. Paste this entire file and click "Run".
--   4. Verify "notification_preferences" and "feedback" appear under Table Editor.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Create notification_preferences table
-- ─────────────────────────────────────────────────────────────
create table if not exists public.notification_preferences (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  chat_notifications  boolean not null default true,
  updated_at          timestamptz not null default now()
);

-- Index for user queries
create index if not exists idx_notification_preferences_user_id
  on public.notification_preferences (user_id);

-- Enable RLS
alter table public.notification_preferences enable row level security;

-- Drop existing policies if re-running
drop policy if exists "notification_preferences: owner can select own" on public.notification_preferences;
drop policy if exists "notification_preferences: owner can insert own" on public.notification_preferences;
drop policy if exists "notification_preferences: owner can update own" on public.notification_preferences;

-- Users may only read their own notification preferences
create policy "notification_preferences: owner can select own"
  on public.notification_preferences
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Users may only insert their own notification preferences
create policy "notification_preferences: owner can insert own"
  on public.notification_preferences
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users may only update their own notification preferences
create policy "notification_preferences: owner can update own"
  on public.notification_preferences
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 2. Create feedback table
-- ─────────────────────────────────────────────────────────────
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  type        text not null check (type in ('Report a Problem', 'Send Feedback')),
  message     text not null check (length(trim(message)) >= 5),
  created_at  timestamptz not null default now()
);

-- Index for user submissions
create index if not exists idx_feedback_user_id
  on public.feedback (user_id);

-- Enable RLS
alter table public.feedback enable row level security;

-- Drop existing policies if re-running
drop policy if exists "feedback: owner can select own feedback" on public.feedback;
drop policy if exists "feedback: owner can insert own feedback" on public.feedback;

-- Users may only view their own feedback submissions
create policy "feedback: owner can select own feedback"
  on public.feedback
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Users may only submit feedback as themselves
create policy "feedback: owner can insert own feedback"
  on public.feedback
  for insert
  to authenticated
  with check (auth.uid() = user_id);
