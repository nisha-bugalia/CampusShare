import type { Profile } from './profile';

/**
 * Valid listing modes for public.listings.listing_type
 */
export type DbListingType = 'rent' | 'sell' | 'give';

/**
 * Valid status values for public.listings.status
 */
export type DbListingStatus =
  | 'active'
  | 'reserved'
  | 'completed'
  | 'inactive'
  | 'archived';

/**
 * DbListing — represents a row in public.listings (Supabase).
 *
 * Each listing belongs to an authenticated student (user_id -> public.profiles.id).
 * The owner details (name, email, branch) are retrieved by joining with profiles.
 */
export interface DbListing {
  /** UUID primary key, generated via gen_random_uuid() */
  id: string;

  /** References public.profiles(id) / auth.users(id) */
  user_id: string;

  /** Listing title / item name */
  title: string;

  /** Category (e.g., Books, Electronics, Clothing) */
  category: string;

  /** Listing classification: 'rent', 'sell', or 'give' */
  listing_type: DbListingType;

  /** Price in INR (null for free/give items) */
  price: number | null;

  /** Item description and details */
  description: string;

  /** Hostel or pickup location for this item */
  hostel: string;

  /** Listing visibility scope (e.g., 'Everyone', 'My Hostel') - deprecated, kept for backwards compatibility */
  visibility: string;

  /** Allowed hostels for visibility. Empty array ({}) means Everyone. */
  visibility_hostels: string[];

  /** Optional image URL (placeholder for future Supabase Storage integration) */
  image_url: string | null;

  /** Listing status */
  status: DbListingStatus;

  /** ISO 8601 creation timestamp */
  created_at: string;
}

/**
 * Payload required to insert a new listing into public.listings.
 * id, status, and created_at have database defaults.
 */
export type DbListingInsert = Omit<DbListing, 'id' | 'created_at' | 'status'> & {
  id?: string;
  status?: DbListingStatus;
  created_at?: string;
};

/**
 * Payload for updating an existing listing.
 * id, user_id, and created_at are immutable.
 */
export type DbListingUpdate = Partial<
  Omit<DbListing, 'id' | 'user_id' | 'created_at'>
>;

/**
 * Listing row joined with owner profile details from public.profiles
 */
export interface DbListingWithOwner extends DbListing {
  profiles?: Profile | null;
}
