import type { Profile } from './profile';

/**
 * Valid durations for public.requests.needed_for
 * Matches the options in the I NEED form
 */
export type DbRequestDuration =
  | 'One-time use'
  | 'A few days'
  | 'A few weeks'
  | 'Long term';

/**
 * Valid status values for public.requests.status
 */
export type DbRequestStatus =
  | 'active'
  | 'fulfilled'
  | 'cancelled'
  | 'inactive'
  | 'archived';

/**
 * DbRequest — represents a row in public.requests (Supabase).
 *
 * Each request belongs to an authenticated student (user_id -> public.profiles.id).
 * The requester details (name, email, branch) are retrieved by joining with profiles.
 */
export interface DbRequest {
  /** UUID primary key, generated via gen_random_uuid() */
  id: string;

  /** References public.profiles(id) / auth.users(id) */
  user_id: string;

  /** Title of the requested item */
  title: string;

  /** Category (e.g., Books, Electronics, Clothing) */
  category: string;

  /** Detailed description of the requested item */
  description: string;

  /** Maximum budget in INR (null if flexible) */
  budget: number | null;

  /** Duration: 'One-time use', 'A few days', 'A few weeks', 'Long term' */
  needed_for: DbRequestDuration;

  /** Requester's hostel or preferred pickup location */
  hostel: string;

  /** Request visibility scope (e.g., 'Everyone', 'My Hostel') - deprecated, kept for backwards compatibility */
  visibility: string;

  /** Allowed hostels for visibility. Empty array ({}) means Everyone. */
  visibility_hostels: string[];

  /** Status: 'active', 'fulfilled', 'inactive', 'archived' */
  status: DbRequestStatus;

  /** ISO 8601 creation timestamp */
  created_at: string;
}

/**
 * Payload required to insert a new request into public.requests.
 * id, status, and created_at have database defaults.
 */
export type DbRequestInsert = Omit<DbRequest, 'id' | 'created_at' | 'status'> & {
  id?: string;
  status?: DbRequestStatus;
  created_at?: string;
};

/**
 * Payload for updating an existing request.
 * id, user_id, and created_at are immutable.
 */
export type DbRequestUpdate = Partial<
  Omit<DbRequest, 'id' | 'user_id' | 'created_at'>
>;

/**
 * Request row joined with requester profile details from public.profiles
 */
export interface DbRequestWithOwner extends DbRequest {
  profiles?: Profile | null;
}
