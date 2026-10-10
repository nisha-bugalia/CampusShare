-- ============================================================
-- Enable Supabase Realtime for public.messages
-- Allows clients to receive postgres_changes (INSERT) for messages table
-- ============================================================

begin;
  -- Add public.messages to supabase_realtime publication if not already added
  alter publication supabase_realtime add table public.messages;
commit;
