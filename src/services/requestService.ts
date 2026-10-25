import { supabase } from '../lib/supabase';
import { DbRequestStatus, DbRequestWithOwner } from '../types/databaseRequest';
import { RequestItem } from '../types/listing';
import { dbRequestToRequestItem } from '../utils/adapters';

/**
 * Updates the lifecycle status of a request.
 *
 * Security & Validation:
 * - Ensures user is authenticated.
 * - Restricts the update to the request creator (auth.uid() = user_id).
 * - Verifies the update succeeded in the database.
 */
export async function updateRequestStatus(
  requestId: string,
  newStatus: DbRequestStatus
): Promise<{ data: RequestItem | null; error: Error | null }> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        data: null,
        error: new Error('You must be signed in to change a request status.'),
      };
    }

    const { data, error: updateError } = await supabase
      .from('requests')
      .update({ status: newStatus })
      .eq('id', requestId)
      .eq('user_id', user.id) // Extra safety check ensuring ownership
      .select('*, profiles(id, name, branch, hostel, avatar_url, verified)')
      .maybeSingle();

    if (updateError) {
      console.error('[requestService] Failed to update request status:', updateError);
      return { data: null, error: new Error(updateError.message) };
    }

    if (!data) {
      return {
        data: null,
        error: new Error('Request not found or you do not have permission to modify it.'),
      };
    }

    return {
      data: dbRequestToRequestItem(data as DbRequestWithOwner),
      error: null,
    };
  } catch (err: any) {
    console.error('[requestService] Unexpected error updating request status:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Fetches a single request by its ID, joined with the requester profile.
 */
export async function getRequestById(
  requestId: string
): Promise<{ data: RequestItem | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('requests')
      .select('*, profiles(id, name, branch, hostel, avatar_url, verified)')
      .eq('id', requestId)
      .maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (!data) {
      return { data: null, error: new Error('Request not found') };
    }

    return {
      data: dbRequestToRequestItem(data as DbRequestWithOwner),
      error: null,
    };
  } catch (err: any) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
