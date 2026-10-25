import { supabase } from '../lib/supabase';
import { DbListingStatus, DbListingWithOwner } from '../types/databaseListing';
import { Listing } from '../types/listing';
import { dbListingToListing } from '../utils/adapters';

export interface UpdateListingStatusOptions {
  rentedToUserId?: string | null;
  rentedAt?: string | null;
}

/**
 * Updates the lifecycle status of a listing.
 *
 * Security & Validation:
 * - Ensures user is authenticated.
 * - Restricts the update to the listing creator (auth.uid() = user_id).
 * - Verifies the update succeeded in the database.
 * - Automatically clears rental metadata when status becomes 'active'.
 * - Sets rental metadata when status becomes 'rented'.
 */
export async function updateListingStatus(
  listingId: string,
  newStatus: DbListingStatus,
  options?: UpdateListingStatusOptions
): Promise<{ data: Listing | null; error: Error | null }> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        data: null,
        error: new Error('You must be signed in to change a listing status.'),
      };
    }

    // Build the payload
    const updatePayload: Record<string, any> = {
      status: newStatus,
    };

    if (newStatus === 'rented') {
      updatePayload.rented_to_user_id = options?.rentedToUserId ?? null;
      updatePayload.rented_at = options?.rentedAt ?? new Date().toISOString();
    } else if (newStatus === 'active') {
      // Returned / Available: clear rental tracking metadata
      updatePayload.rented_to_user_id = null;
      updatePayload.rented_at = null;
    }

    const { data, error: updateError } = await supabase
      .from('listings')
      .update(updatePayload)
      .eq('id', listingId)
      .eq('user_id', user.id) // Extra safety check ensuring ownership
      .select('*, profiles!listings_user_id_fkey(id, name, branch, hostel, avatar_url, verified)')
      .maybeSingle();

    if (updateError) {
      console.error('[listingService] Failed to update listing status:', updateError);
      return { data: null, error: new Error(updateError.message) };
    }

    if (!data) {
      return {
        data: null,
        error: new Error('Listing not found or you do not have permission to modify it.'),
      };
    }

    return {
      data: dbListingToListing(data as DbListingWithOwner),
      error: null,
    };
  } catch (err: any) {
    console.error('[listingService] Unexpected error updating listing status:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Fetches a single listing by its ID, joined with the owner profile.
 */
export async function getListingById(
  listingId: string
): Promise<{ data: Listing | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*, profiles!listings_user_id_fkey(id, name, branch, hostel, avatar_url, verified)')
      .eq('id', listingId)
      .maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (!data) {
      return { data: null, error: new Error('Listing not found') };
    }

    return {
      data: dbListingToListing(data as DbListingWithOwner),
      error: null,
    };
  } catch (err: any) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
