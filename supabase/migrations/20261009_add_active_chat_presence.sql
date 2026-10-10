-- ============================================================
-- Migration: Add active_chat_presence to conversation_members
-- Tracks which conversation the current user is actively viewing
-- ============================================================

begin;

  -- 1. Add presence tracking columns to conversation_members
  alter table public.conversation_members
    add column if not exists is_active boolean not null default false,
    add column if not exists active_at timestamptz default null;

  -- 2. Performance indexes for active presence lookup and cleanup
  create index if not exists idx_conversation_members_active_presence
    on public.conversation_members (conversation_id, user_id, is_active, active_at);

  create index if not exists idx_conversation_members_user_active
    on public.conversation_members (user_id, is_active);

  -- 3. Stale-safe presence verification function
  -- Evaluates true ONLY if member is marked active and their heartbeat timestamp is fresh
  create or replace function public.is_member_active_in_conversation(
    p_conversation_id uuid,
    p_user_id uuid,
    p_stale_seconds int default 45
  )
  returns boolean
  language sql
  stable
  security definer
  as $$
    select exists (
      select 1
      from public.conversation_members
      where conversation_id = p_conversation_id
        and user_id = p_user_id
        and is_active = true
        and active_at is not null
        and active_at > (now() - (p_stale_seconds || ' seconds')::interval)
    );
  $$;

commit;
