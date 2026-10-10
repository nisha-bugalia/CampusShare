import type { Profile } from './profile';
import type { DbListing } from './databaseListing';
import type { DbRequest } from './databaseRequest';

/**
 * DbConversation — represents a row in public.conversations (Supabase).
 */
export interface DbConversation {
  /** UUID primary key, generated via gen_random_uuid() */
  id: string;

  /** Optional reference to public.listings(id) */
  listing_id: string | null;

  /** Optional reference to public.requests(id) */
  request_id: string | null;

  /** ISO 8601 creation timestamp */
  created_at: string;
}

/**
 * DbConversationMember — represents a row in public.conversation_members.
 */
export interface DbConversationMember {
  /** References public.conversations(id) */
  conversation_id: string;

  /** References public.profiles(id) */
  user_id: string;

  /** ISO 8601 timestamp when user joined */
  joined_at: string;

  /** Optional ISO 8601 timestamp when user last viewed the conversation */
  last_read_at?: string | null;

  /** Whether the member is currently viewing this conversation */
  is_active?: boolean;

  /** Timestamp of the most recent active presence heartbeat */
  active_at?: string | null;
}

/**
 * DbConversationMemberWithProfile — member row joined with profile details.
 */
export interface DbConversationMemberWithProfile extends DbConversationMember {
  profiles?: Pick<Profile, 'id' | 'name' | 'branch' | 'hostel' | 'avatar_url' | 'verified'> | null;
}

/**
 * DbMessage — represents a row in public.messages (Supabase).
 */
export interface DbMessage {
  /** UUID primary key, generated via gen_random_uuid() */
  id: string;

  /** References public.conversations(id) */
  conversation_id: string;

  /** References public.profiles(id) */
  sender_id: string;

  /** Text message payload (cannot be empty or whitespace-only) */
  message: string;

  /** ISO 8601 creation timestamp */
  created_at: string;
}

/**
 * DbMessageWithSender — message row joined with sender profile info.
 */
export interface DbMessageWithSender extends DbMessage {
  profiles?: Pick<Profile, 'id' | 'name' | 'avatar_url'> | null;
}

/**
 * Payload for inserting a new message.
 */
export interface DbMessageInsert {
  conversation_id: string;
  sender_id: string;
  message: string;
}

/**
 * Payload for creating a new conversation.
 */
export interface DbConversationInsert {
  listing_id?: string | null;
  request_id?: string | null;
}
