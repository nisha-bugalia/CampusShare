-- ============================================================
-- CampusShare: Messaging Backend & Database Foundation
-- Tables: conversations, conversation_members, messages
-- Includes: Foreign keys, Constraints, Functions, RLS policies, Indexes
--
-- EXECUTION ORDER:
--   1. Create tables (conversations, conversation_members, messages)
--   2. Create helper functions (referencing conversation_members)
--   3. Enable Row Level Security (RLS)
--   4. Create RLS policies
--   5. Create performance indexes
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard.
--   2. Go to SQL Editor.
--   3. Paste this entire file and click "Run".
--   4. Verify all 3 tables appear under Table Editor.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. Create the conversations table
-- ─────────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id          uuid        primary key default gen_random_uuid(),
  listing_id  uuid        references public.listings (id) on delete set null,
  request_id  uuid        references public.requests (id) on delete set null,
  created_at  timestamptz not null default now(),

  -- At most one originating object: either a listing OR a request (or neither)
  constraint chk_conversation_origin check (
    not (listing_id is not null and request_id is not null)
  )
);


-- ─────────────────────────────────────────────────────────────
-- 2. Create the conversation_members table
-- ─────────────────────────────────────────────────────────────
create table if not exists public.conversation_members (
  conversation_id uuid        not null references public.conversations (id) on delete cascade,
  user_id         uuid        not null references public.profiles (id) on delete cascade,
  joined_at       timestamptz not null default now(),

  primary key (conversation_id, user_id)
);


-- ─────────────────────────────────────────────────────────────
-- 3. Create the messages table
-- ─────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id              uuid        primary key default gen_random_uuid(),
  conversation_id uuid        not null references public.conversations (id) on delete cascade,
  sender_id       uuid        not null references public.profiles (id) on delete cascade,
  message         text        not null check (char_length(trim(message)) > 0),
  created_at      timestamptz not null default now()
);


-- ─────────────────────────────────────────────────────────────
-- 4. Helper Functions (SECURITY DEFINER to avoid RLS recursion)
-- ─────────────────────────────────────────────────────────────

-- 4a. Check if a user is a member of a given conversation
create or replace function public.is_conversation_member(
  p_conversation_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.conversation_members
    where conversation_id = p_conversation_id
      and user_id = p_user_id
  );
$$;

revoke all on function public.is_conversation_member(uuid, uuid) from public, anon;
grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;

-- 4b. Check if a conversation currently has no members
create or replace function public.conversation_has_no_members(
  p_conversation_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1
    from public.conversation_members
    where conversation_id = p_conversation_id
  );
$$;

revoke all on function public.conversation_has_no_members(uuid) from public, anon;
grant execute on function public.conversation_has_no_members(uuid) to authenticated;

-- 4c. Atomically get existing or create new conversation between authenticated user and owner
create or replace function public.create_or_get_conversation(
  p_listing_id uuid default null,
  p_request_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_convo_id uuid;
begin
  -- 1. Must be authenticated
  if v_current_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- 2. Must provide exactly one of listing_id or request_id
  if (p_listing_id is null and p_request_id is null) or (p_listing_id is not null and p_request_id is not null) then
    raise exception 'Must provide either listing_id or request_id (not both, not neither)';
  end if;

  -- 3. Determine and verify owner from database
  if p_listing_id is not null then
    select user_id into v_owner_id
    from public.listings
    where id = p_listing_id;

    if v_owner_id is null then
      raise exception 'Listing not found';
    end if;
  else
    select user_id into v_owner_id
    from public.requests
    where id = p_request_id;

    if v_owner_id is null then
      raise exception 'Request not found';
    end if;
  end if;

  -- 4. Prevent self-chat
  if v_current_user_id = v_owner_id then
    raise exception 'You cannot start a conversation on your own item';
  end if;

  -- 5. Find existing conversation for this listing/request between these 2 users
  select c.id into v_convo_id
  from public.conversations c
  join public.conversation_members m1 on m1.conversation_id = c.id and m1.user_id = v_current_user_id
  join public.conversation_members m2 on m2.conversation_id = c.id and m2.user_id = v_owner_id
  where (p_listing_id is not null and c.listing_id = p_listing_id)
     or (p_request_id is not null and c.request_id = p_request_id)
  limit 1;

  if v_convo_id is not null then
    return v_convo_id;
  end if;

  -- 6. Atomically create conversation
  insert into public.conversations (listing_id, request_id)
  values (p_listing_id, p_request_id)
  returning id into v_convo_id;

  -- 7. Add both users as conversation members
  insert into public.conversation_members (conversation_id, user_id)
  values
    (v_convo_id, v_current_user_id),
    (v_convo_id, v_owner_id);

  return v_convo_id;
end;
$$;

revoke all on function public.create_or_get_conversation(uuid, uuid) from public, anon;
grant execute on function public.create_or_get_conversation(uuid, uuid) to authenticated;


-- ─────────────────────────────────────────────────────────────
-- 5. Enable Row Level Security (RLS)
-- ─────────────────────────────────────────────────────────────
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;


-- ─────────────────────────────────────────────────────────────
-- 6. Row Level Security Policies
-- ─────────────────────────────────────────────────────────────

-- ── 6a. public.conversations Policies ──

-- SELECT: Authenticated users can select only conversations they are a member of
create policy "conversations: members can select conversations"
  on public.conversations
  for select
  to authenticated
  using (public.is_conversation_member(id));

-- INSERT: Authenticated users can create conversations
create policy "conversations: authenticated can insert conversation"
  on public.conversations
  for insert
  to authenticated
  with check (true);

-- UPDATE: Members can update conversations
create policy "conversations: members can update conversation"
  on public.conversations
  for update
  to authenticated
  using (public.is_conversation_member(id))
  with check (public.is_conversation_member(id));

-- DELETE: Members can delete conversations
create policy "conversations: members can delete conversation"
  on public.conversations
  for delete
  to authenticated
  using (public.is_conversation_member(id));


-- ── 6b. public.conversation_members Policies ──

-- SELECT: Authenticated users can view members of conversations they belong to
create policy "conversation_members: members can view conversation members"
  on public.conversation_members
  for select
  to authenticated
  using (public.is_conversation_member(conversation_id));

-- INSERT: Users can add themselves when starting a brand new conversation,
-- or existing members can add participants to their conversation.
-- Prevents arbitrary joining of existing conversations by non-members.
create policy "conversation_members: secure member insertion"
  on public.conversation_members
  for insert
  to authenticated
  with check (
    (user_id = auth.uid() and public.conversation_has_no_members(conversation_id))
    or public.is_conversation_member(conversation_id)
  );

-- DELETE: A user can leave a conversation (delete own membership) or existing members can remove
create policy "conversation_members: members can delete membership"
  on public.conversation_members
  for delete
  to authenticated
  using (user_id = auth.uid() or public.is_conversation_member(conversation_id));


-- ── 6c. public.messages Policies ──

-- SELECT: Authenticated users can select messages only from conversations they belong to
create policy "messages: members can select messages"
  on public.messages
  for select
  to authenticated
  using (public.is_conversation_member(conversation_id));

-- INSERT: Authenticated users can insert messages only if:
--   1. sender_id = auth.uid() (cannot spoof sender)
--   2. user is a member of the conversation
create policy "messages: members can insert own messages"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  );

-- UPDATE: Sender can update their own message in a conversation they belong to
create policy "messages: sender can update own messages"
  on public.messages
  for update
  to authenticated
  using (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  )
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  );

-- DELETE: Sender can delete their own message in a conversation they belong to
create policy "messages: sender can delete own messages"
  on public.messages
  for delete
  to authenticated
  using (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  );


-- ─────────────────────────────────────────────────────────────
-- 7. Performance Indexes
-- ─────────────────────────────────────────────────────────────

-- conversations indexes
create index if not exists idx_conversations_listing_id
  on public.conversations (listing_id);

create index if not exists idx_conversations_request_id
  on public.conversations (request_id);

create index if not exists idx_conversations_created_at
  on public.conversations (created_at desc);

-- conversation_members indexes
create index if not exists idx_conversation_members_user_id
  on public.conversation_members (user_id);

create index if not exists idx_conversation_members_joined_at
  on public.conversation_members (joined_at desc);

-- messages indexes
create index if not exists idx_messages_conversation_id
  on public.messages (conversation_id);

create index if not exists idx_messages_sender_id
  on public.messages (sender_id);

create index if not exists idx_messages_created_at
  on public.messages (created_at desc);

-- Composite index for high performance chronological chat thread loading
create index if not exists idx_messages_conversation_created
  on public.messages (conversation_id, created_at asc);
