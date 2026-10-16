import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Profile, ProfileUpdate } from '../types/profile';

export interface UseProfileResult {
  /** The authenticated user's profile row from public.profiles */
  profile: Profile | null;

  /** True while the profile fetch is in progress */
  isLoading: boolean;

  /** Error message if the fetch or update failed */
  error: string | null;

  /** Re-fetches the profile from Supabase */
  refresh: () => Promise<void>;

  /**
   * Updates mutable profile fields (name, branch, hostel, avatar_url).
   * Returns an error string on failure, or null on success.
   */
  updateProfile: (updates: ProfileUpdate) => Promise<string | null>;
}

// Module-level shared cache and listeners to ensure all hook instances stay synchronized
let cachedProfile: Profile | null = null;
let cachedIsLoading = false;
let cachedError: string | null = null;
let fetchedUserId: string | null = null;
let isFetching = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn('[useProfile] Listener notification error:', e);
    }
  });
}

/**
 * Subscribes an external listener to profile updates.
 * Returns an unsubscribe callback.
 */
export function subscribeProfile(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * useProfile
 *
 * Fetches and manages the current authenticated user's profile
 * from `public.profiles` using the existing Supabase client.
 *
 * All callers share synchronized state so that updates in one screen
 * (such as profile onboarding) are instantly reflected across root navigation
 * and all other screens without manual reloads.
 */
export function useProfile(): UseProfileResult {
  const { user } = useAuth();
  const [, setVersion] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setVersion((v) => v + 1);
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const fetchProfile = useCallback(
    async (force = false) => {
      if (!user?.id) {
        cachedProfile = null;
        cachedIsLoading = false;
        cachedError = null;
        fetchedUserId = null;
        isFetching = false;
        notify();
        return;
      }

      if (isFetching && !force) return;
      isFetching = true;
      cachedIsLoading = true;
      cachedError = null;
      notify();

      try {
        let { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        // If trigger is still inserting on first sign up, retry once after a short delay
        if (fetchError && fetchError.code === 'PGRST116') {
          await new Promise((resolve) => setTimeout(resolve, 600));
          const retry = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          data = retry.data;
          fetchError = retry.error;
        }

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            // Profile row does not exist in public.profiles.
            // Attempt to self-heal by inserting a base row from user metadata
            const fallbackProfile = {
              id: user.id,
              name:
                (user.user_metadata?.full_name as string) ||
                (user.user_metadata?.name as string) ||
                (user.email ? user.email.split('@')[0] : 'NIT Kurukshetra Student'),
              email: user.email || null,
              avatar_url:
                (user.user_metadata?.avatar_url as string) ||
                (user.user_metadata?.picture as string) ||
                null,
              branch: null,
              hostel: null,
              verified: true,
            };

            const { data: created, error: createError } = await supabase
              .from('profiles')
              .upsert(fallbackProfile)
              .select('*')
              .single();

            if (!createError && created) {
              cachedProfile = created as Profile;
              cachedError = null;
            } else {
              // If insert is prevented by RLS or fails, set cachedProfile to null
              // but DO NOT re-fetch. Gracefully stop loading so user proceeds to onboarding.
              cachedProfile = null;
              if (createError && createError.code !== 'PGRST116') {
                console.warn('[useProfile] create profile fallback note:', createError.message);
              }
            }
          } else {
            console.warn('[useProfile] fetchProfile error:', fetchError.message);
            cachedProfile = null;
            cachedError = fetchError.message;
          }
        } else {
          cachedProfile = data as Profile;
          cachedError = null;
        }
      } catch (err: any) {
        console.warn('[useProfile] unexpected fetchProfile error:', err);
        cachedProfile = null;
        cachedError = err instanceof Error ? err.message : 'Failed to fetch profile.';
      } finally {
        fetchedUserId = user.id;
        cachedIsLoading = false;
        isFetching = false;
        notify();
      }
    },
    [user?.id, user?.email, user?.user_metadata]
  );

  useEffect(() => {
    if (user?.id) {
      if (fetchedUserId !== user.id && !isFetching) {
        fetchProfile();
      }
    } else {
      if (cachedProfile !== null || fetchedUserId !== null || cachedIsLoading) {
        cachedProfile = null;
        cachedIsLoading = false;
        cachedError = null;
        fetchedUserId = null;
        isFetching = false;
        notify();
      }
    }
  }, [user?.id, fetchProfile]);

  const updateProfile = useCallback(
    async (updates: ProfileUpdate): Promise<string | null> => {
      if (!user?.id) return 'Not authenticated.';

      try {
        // 1. Target only the authenticated user's public.profiles row
        const { data: updatedRows, error: updateError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .select('*');

        if (updateError) {
          console.warn('[useProfile] updateProfile error:', updateError.message);
          return updateError.message;
        }

        // 2. If 0 rows updated, verify whether row exists before deciding whether to upsert
        if (!updatedRows || updatedRows.length === 0) {
          const { data: existingRow, error: checkError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();

          if (checkError) {
            console.warn('[useProfile] profile check error:', checkError.message);
            return checkError.message;
          }

          if (!existingRow) {
            // Profile row did not exist yet; insert a base row with updates
            const fullProfile = {
              id: user.id,
              name:
                (user.user_metadata?.full_name as string) ||
                (user.user_metadata?.name as string) ||
                (user.email ? user.email.split('@')[0] : 'NIT Kurukshetra Student'),
              email: user.email || null,
              avatar_url:
                (user.user_metadata?.avatar_url as string) ||
                (user.user_metadata?.picture as string) ||
                null,
              branch: updates.branch || null,
              hostel: updates.hostel || null,
              verified: true,
              ...updates,
            };

            const { error: upsertError } = await supabase
              .from('profiles')
              .upsert(fullProfile, { onConflict: 'id' });

            if (upsertError) {
              console.warn('[useProfile] upsert profile error:', upsertError.message);
              return upsertError.message;
            }
          } else {
            // Row exists in DB, but 0 rows were updated -> RLS prevented update or invalid state
            console.warn('[useProfile] 0 rows updated for existing profile row id:', user.id);
            return 'Failed to update profile: zero rows affected.';
          }
        }

        // 3. Explicitly verify the persisted data from Supabase before reporting success
        const { data: verified, error: verifyError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (verifyError || !verified) {
          const msg = verifyError?.message || 'Profile verification failed: profile record not found.';
          console.warn('[useProfile] verification error:', msg);
          return msg;
        }

        // Confirm requested updates were actually persisted in the database row
        if (updates.name !== undefined && verified.name !== updates.name) {
          return 'Profile verification failed: name was not persisted in database.';
        }
        if (updates.branch !== undefined && verified.branch !== updates.branch) {
          return 'Profile verification failed: branch was not persisted in database.';
        }
        if (updates.hostel !== undefined && verified.hostel !== updates.hostel) {
          return 'Profile verification failed: hostel was not persisted in database.';
        }

        // 4. Update the shared profile cache and notify all hook instances
        cachedProfile = verified as Profile;
        cachedError = null;
        notify();
        return null;
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : 'Unknown update error';
        console.warn('[useProfile] unexpected updateProfile error:', msg);
        return msg;
      }
    },
    [user?.id, user?.email, user?.user_metadata]
  );

  const refresh = useCallback(async () => {
    await fetchProfile(true);
  }, [fetchProfile]);

  return {
    profile: cachedProfile,
    isLoading: cachedIsLoading,
    error: cachedError,
    refresh,
    updateProfile,
  };
}
