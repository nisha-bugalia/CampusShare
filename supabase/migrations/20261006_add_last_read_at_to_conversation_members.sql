-- ============================================================
-- Migration: Add last_read_at to conversation_members
-- Enables tracking read/unread state per conversation member
-- ============================================================

begin;

  -- 1. Add last_read_at column to public.conversation_members
  alter table public.conversation_members
    add column if not exists last_read_at timestamptz default null;

  -- 2. Performance index for querying member read state
  create index if not exists idx_conversation_members_last_read_at
    on public.conversation_members (conversation_id, user_id, last_read_at);

  -- 3. RLS Policy: Allow users to UPDATE only their own conversation_members row (e.g. updating last_read_at)
  drop policy if exists "conversation_members: users can update own membership" on public.conversation_members;

  create policy "conversation_members: users can update own membership"
    on public.conversation_members
    for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

commit;
