import { supabase } from '../lib/supabase';

export interface GetOrCreateConversationResult {
  conversationId: string | null;
  error: Error | null;
}

/**
 * Finds an existing conversation for an I HAVE listing between the current user and the owner,
 * or creates a new conversation and registers both members via secure database RPC.
 */
export async function getOrCreateListingConversation(
  listingId: string,
  ownerId: string,
  currentUserId: string
): Promise<GetOrCreateConversationResult> {
  if (!currentUserId) {
    return {
      conversationId: null,
      error: new Error('You must be signed in to start a conversation.'),
    };
  }

  if (currentUserId === ownerId) {
    return {
      conversationId: null,
      error: new Error('You cannot start a conversation on your own listing.'),
    };
  }

  try {
    const { data, error } = await supabase.rpc('create_or_get_conversation', {
      p_listing_id: listingId,
      p_request_id: null,
    });

    if (error) {
      console.error('[chatService] Error in create_or_get_conversation RPC for listing:', error);
      return { conversationId: null, error: new Error(error.message) };
    }

    if (!data) {
      return { conversationId: null, error: new Error('No conversation ID returned by database.') };
    }

    return { conversationId: data as string, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unexpected error creating conversation.';
    console.error('[chatService] Unexpected exception in getOrCreateListingConversation:', err);
    return { conversationId: null, error: new Error(msg) };
  }
}

/**
 * Finds an existing conversation for an I NEED request between the current user and the requester,
 * or creates a new conversation and registers both members via secure database RPC.
 */
export async function getOrCreateRequestConversation(
  requestId: string,
  ownerId: string,
  currentUserId: string
): Promise<GetOrCreateConversationResult> {
  if (!currentUserId) {
    return {
      conversationId: null,
      error: new Error('You must be signed in to start a conversation.'),
    };
  }

  if (currentUserId === ownerId) {
    return {
      conversationId: null,
      error: new Error('You cannot start a conversation on your own request.'),
    };
  }

  try {
    const { data, error } = await supabase.rpc('create_or_get_conversation', {
      p_listing_id: null,
      p_request_id: requestId,
    });

    if (error) {
      console.error('[chatService] Error in create_or_get_conversation RPC for request:', error);
      return { conversationId: null, error: new Error(error.message) };
    }

    if (!data) {
      return { conversationId: null, error: new Error('No conversation ID returned by database.') };
    }

    return { conversationId: data as string, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unexpected error creating conversation.';
    console.error('[chatService] Unexpected exception in getOrCreateRequestConversation:', err);
    return { conversationId: null, error: new Error(msg) };
  }
}

export interface ConversationDetails {
  id: string;
  listingId: string | null;
  requestId: string | null;
  title: string | null;
  otherUser: {
    id: string;
    name: string;
    branch?: string | null;
    hostel?: string | null;
    avatarUrl?: string | null;
  } | null;
}

/**
 * Fetches conversation metadata (listing/request subject and other participant profile)
 */
export async function fetchConversationDetails(
  conversationId: string,
  currentUserId: string
): Promise<{ data: ConversationDetails | null; error: Error | null }> {
  try {
    const { data: convo, error: convoErr } = await supabase
      .from('conversations')
      .select(`
        id,
        listing_id,
        request_id,
        listings (id, title),
        requests (id, title)
      `)
      .eq('id', conversationId)
      .single();

    if (convoErr) {
      return { data: null, error: new Error(convoErr.message) };
    }

    const { data: members, error: memErr } = await supabase
      .from('conversation_members')
      .select(`
        user_id,
        profiles (id, name, branch, hostel, avatar_url)
      `)
      .eq('conversation_id', conversationId);

    if (memErr) {
      console.warn('[chatService] Non-critical error fetching members:', memErr.message);
    }

    let otherUser = null;
    if (members && members.length > 0) {
      const otherMember = members.find((m) => m.user_id !== currentUserId) || members[0];
      if (otherMember && otherMember.profiles) {
        const p = Array.isArray(otherMember.profiles)
          ? otherMember.profiles[0]
          : otherMember.profiles;
        if (p) {
          otherUser = {
            id: p.id,
            name: p.name || 'Campus Student',
            branch: p.branch,
            hostel: p.hostel,
            avatarUrl: p.avatar_url,
          };
        }
      }
    }

    let title: string | null = null;
    if (convo.listings) {
      const l = Array.isArray(convo.listings) ? convo.listings[0] : convo.listings;
      if (l) title = l.title;
    } else if (convo.requests) {
      const r = Array.isArray(convo.requests) ? convo.requests[0] : convo.requests;
      if (r) title = r.title;
    }

    return {
      data: {
        id: convo.id,
        listingId: convo.listing_id,
        requestId: convo.request_id,
        title,
        otherUser,
      },
      error: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch conversation details';
    return { data: null, error: new Error(msg) };
  }
}

/**
 * Loads messages for a given conversation ordered chronologically (ascending).
 */
export async function fetchMessages(
  conversationId: string
): Promise<{ data: import('../types/databaseMessage').DbMessage[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as import('../types/databaseMessage').DbMessage[], error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch messages';
    return { data: null, error: new Error(msg) };
  }
}

/**
 * Inserts a new message into public.messages
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string
): Promise<{ data: import('../types/databaseMessage').DbMessage | null; error: Error | null }> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { data: null, error: new Error('Message cannot be empty.') };
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        message: trimmed,
      })
      .select('*')
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as import('../types/databaseMessage').DbMessage, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to send message';
    return { data: null, error: new Error(msg) };
  }
}

/**
 * Subscribes to realtime INSERT events for messages in a given conversation.
 * Returns the active RealtimeChannel.
 */
export function subscribeToMessages(
  conversationId: string,
  onNewMessage: (message: import('../types/databaseMessage').DbMessage) => void,
  onStatusChange?: (status: string) => void
): import('@supabase/supabase-js').RealtimeChannel {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        if (payload.new) {
          onNewMessage(payload.new as import('../types/databaseMessage').DbMessage);
        }
      }
    )
    .subscribe((status) => {
      if (onStatusChange) {
        onStatusChange(status);
      }
    });

  return channel;
}

/**
 * Unsubscribes and removes a Realtime channel.
 */
export function unsubscribeFromMessages(
  channel: import('@supabase/supabase-js').RealtimeChannel
): void {
  supabase.removeChannel(channel);
}

/**
 * Updates the last_read_at timestamp for the current user in a given conversation.
 */
export async function updateLastReadAt(
  conversationId: string,
  userId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update read state';
    return { error: new Error(msg) };
  }
}

/**
 * Sets active chat presence for the user in a conversation.
 * Marks this conversation as active with an updated active_at timestamp and last_read_at.
 * Automatically clears active presence on any other conversations for this user.
 */
export async function setActiveChatPresence(
  conversationId: string,
  userId: string
): Promise<{ error: Error | null }> {
  if (!conversationId || !userId) {
    return { error: null };
  }

  try {
    const nowIso = new Date().toISOString();

    // 1. Mark this conversation active and refresh last_read_at
    const { error: activeError } = await supabase
      .from('conversation_members')
      .update({
        is_active: true,
        active_at: nowIso,
        last_read_at: nowIso,
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (activeError) {
      return { error: new Error(activeError.message) };
    }

    // 2. Clear active presence on any other conversations for this user
    await supabase
      .from('conversation_members')
      .update({
        is_active: false,
        active_at: null,
      })
      .eq('user_id', userId)
      .neq('conversation_id', conversationId)
      .eq('is_active', true);

    return { error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to set active presence';
    return { error: new Error(msg) };
  }
}

/**
 * Clears active chat presence for a specific conversation or all conversations of a user.
 */
export async function clearActiveChatPresence(
  userId: string,
  conversationId?: string
): Promise<{ error: Error | null }> {
  if (!userId) {
    return { error: null };
  }

  try {
    let query = supabase
      .from('conversation_members')
      .update({
        is_active: false,
        active_at: null,
      })
      .eq('user_id', userId);

    if (conversationId) {
      query = query.eq('conversation_id', conversationId);
    } else {
      query = query.eq('is_active', true);
    }

    const { error } = await query;
    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to clear active presence';
    return { error: new Error(msg) };
  }
}

/**
 * Checks if a member of a conversation is currently actively viewing it.
 * Evaluates false if is_active is false, active_at is null, or active_at is older than staleThresholdSeconds (default: 45s).
 */
export async function isUserActiveInConversation(
  conversationId: string,
  userId: string,
  staleThresholdSeconds: number = 45
): Promise<boolean> {
  if (!conversationId || !userId) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('conversation_members')
      .select('is_active, active_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    if (!data.is_active || !data.active_at) {
      return false;
    }

    const activeTimestamp = new Date(data.active_at).getTime();
    if (isNaN(activeTimestamp)) {
      return false;
    }

    const now = Date.now();
    const ageSeconds = (now - activeTimestamp) / 1000;

    return ageSeconds <= staleThresholdSeconds;
  } catch {
    return false;
  }
}



// ── Conversation List ────────────────────────────────────────────────────────

export interface ConversationListItem {
  id: string;
  listingId: string | null;
  requestId: string | null;
  subjectTitle: string | null;
  otherUser: {
    id: string;
    name: string;
    branch: string | null;
    avatarUrl: string | null;
  };
  latestMessageText: string | null;
  latestMessageSenderId: string | null;
  latestActivityAt: string;
  /** The current user's last_read_at for this conversation (ISO string or null). */
  lastReadAt: string | null;
}

export async function fetchConversations(currentUserId: string): Promise<{
  data: ConversationListItem[] | null;
  error: Error | null;
}> {
  try {
    const { data: myMemberships, error: memErr } = await supabase
      .from('conversation_members')
      .select('conversation_id, last_read_at')
      .eq('user_id', currentUserId);

    if (memErr) return { data: null, error: new Error(memErr.message) };
    if (!myMemberships || myMemberships.length === 0) return { data: [], error: null };

    // Build a map of conversationId -> last_read_at for the current user
    const lastReadAtMap = new Map<string, string | null>();
    for (const m of myMemberships as any[]) {
      lastReadAtMap.set(m.conversation_id, m.last_read_at ?? null);
    }

    const conversationIds = myMemberships.map((m: any) => m.conversation_id);

    // Fetch messages for these conversations ordered by newest first
    const { data: allMessages, error: msgErr } = await supabase
      .from('messages')
      .select('conversation_id, sender_id, message, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false });

    if (msgErr) {
      console.warn('[chatService] Non-critical: could not fetch messages:', msgErr.message);
    }

    // Determine latest message per conversation
    const latestMsgMap = new Map<string, { sender_id: string; message: string; created_at: string }>();
    if (allMessages) {
      for (const msg of allMessages as any[]) {
        if (!latestMsgMap.has(msg.conversation_id)) {
          latestMsgMap.set(msg.conversation_id, {
            sender_id: msg.sender_id,
            message: msg.message,
            created_at: msg.created_at,
          });
        }
      }
    }

    // Only include conversations that have at least one message
    const activeConversationIds = conversationIds.filter((id: string) => latestMsgMap.has(id));
    if (activeConversationIds.length === 0) {
      return { data: [], error: null };
    }

    const { data: conversations, error: convoErr } = await supabase
      .from('conversations')
      .select(`id, listing_id, request_id, created_at, listings (id, title), requests (id, title)`)
      .in('id', activeConversationIds);

    if (convoErr) return { data: null, error: new Error(convoErr.message) };
    if (!conversations || conversations.length === 0) return { data: [], error: null };

    const { data: otherMembers, error: otherMemErr } = await supabase
      .from('conversation_members')
      .select(`conversation_id, user_id, profiles (id, name, branch, avatar_url)`)
      .in('conversation_id', activeConversationIds)
      .neq('user_id', currentUserId);

    if (otherMemErr) {
      console.warn('[chatService] Non-critical: could not fetch other members:', otherMemErr.message);
    }

    const otherMemberMap = new Map<string, { id: string; name: string; branch: string | null; avatarUrl: string | null }>();
    if (otherMembers) {
      for (const member of otherMembers as any[]) {
        if (!otherMemberMap.has(member.conversation_id)) {
          const p = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
          if (p) {
            otherMemberMap.set(member.conversation_id, {
              id: p.id,
              name: p.name || 'Campus Student',
              branch: p.branch ?? null,
              avatarUrl: p.avatar_url ?? null,
            });
          }
        }
      }
    }

    const items: ConversationListItem[] = [];
    for (const convo of (conversations as any[])) {
      const latestMsg = latestMsgMap.get(convo.id);
      if (!latestMsg) continue;

      const otherUser = otherMemberMap.get(convo.id) ?? { id: '', name: 'Campus Student', branch: null, avatarUrl: null };

      let subjectTitle: string | null = null;
      if (convo.listings) {
        const l = Array.isArray(convo.listings) ? convo.listings[0] : convo.listings;
        if (l) subjectTitle = l.title ?? null;
      } else if (convo.requests) {
        const r = Array.isArray(convo.requests) ? convo.requests[0] : convo.requests;
        if (r) subjectTitle = r.title ?? null;
      }

      const isMe = latestMsg.sender_id === currentUserId;
      const displayMessage = isMe ? `You: ${latestMsg.message}` : latestMsg.message;

      items.push({
        id: convo.id,
        listingId: convo.listing_id,
        requestId: convo.request_id,
        subjectTitle,
        otherUser,
        latestMessageText: displayMessage,
        latestMessageSenderId: latestMsg.sender_id,
        latestActivityAt: latestMsg.created_at,
        lastReadAt: lastReadAtMap.get(convo.id) ?? null,
      });
    }

    items.sort((a, b) => new Date(b.latestActivityAt).getTime() - new Date(a.latestActivityAt).getTime());

    return { data: items, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch conversations';
    return { data: null, error: new Error(msg) };
  }
}
