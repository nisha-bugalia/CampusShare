/**
 * MarketplaceContext — shared data layer for the CampusShare feed.
 *
 * Fetches active listings and requests from Supabase once and shares them
 * across all consumers (Home, Search). Exposes a `refresh()` function so
 * the Home screen can re-fetch when it becomes active.
 *
 * addListing / addRequest are kept as no-ops for backward-compatibility with
 * any existing callers; the create forms already insert directly into Supabase.
 *
 * Block filtering: listings/requests from users that the current user has
 * blocked (or who have blocked the current user) are excluded from the feed.
 * RLS on the DB enforces this server-side; the client also filters defensively.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { Listing, RequestItem } from '../types/listing';
import { DbListingWithOwner } from '../types/databaseListing';
import { DbRequestWithOwner } from '../types/databaseRequest';
import { dbListingToListing, dbRequestToRequestItem } from '../utils/adapters';
import { subscribeProfile } from '../hooks/useProfile';

const GIRLS_HOSTELS = new Set([
  'Girls Hostel 1 (KCB)',
  'Girls Hostel 2 (Bhagirathi)',
  'Girls Hostel 3 (Cauvery)',
  'Girls Hostel 4',
]);

const BOYS_HOSTELS = new Set([
  'Hostel 1',
  'Hostel 2',
  'Hostel 3',
  'Hostel 4',
  'Hostel 5',
  'Hostel 6',
  'Hostel 7',
  'Hostel 8',
  'Hostel 9',
  'Hostel 10',
  'Hostel 11',
]);

/**
 * Determines whether a listing or request should be visible to a viewer.
 *
 * Rules:
 * 1. Owner always sees their own listings and requests.
 * 2. If modern visibility_hostels array is non-empty, viewer must have a hostel
 *    set and it must be included in visibility_hostels.
 * 3. Fallback to legacy visibility string column ('Everyone', 'My Hostel',
 *    'Girls Hostel', 'Boys Hostel', or comma-separated list of hostels).
 */
export function isItemVisibleToUser(
  item: {
    user_id: string;
    hostel?: string | null;
    visibility?: string | null;
    visibility_hostels?: string[] | null;
  },
  currentUserId: string | null | undefined,
  currentUserHostel: string | null | undefined
): boolean {
  // 1. Owner always sees their own posts
  if (currentUserId && item.user_id === currentUserId) {
    return true;
  }

  const allowedHostels = item.visibility_hostels;

  // 2. If modern visibility_hostels array is non-empty
  if (Array.isArray(allowedHostels) && allowedHostels.length > 0) {
    if (!currentUserHostel) return false;
    return allowedHostels.includes(currentUserHostel);
  }

  // 3. Fallback / legacy visibility string handling
  const vis = item.visibility?.trim();
  if (!vis || vis.toLowerCase() === 'everyone') {
    return true;
  }

  if (vis === 'My Hostel') {
    if (!currentUserHostel) return false;
    return !!item.hostel && item.hostel === currentUserHostel;
  }

  if (vis === 'Girls Hostel') {
    if (!currentUserHostel) return false;
    return GIRLS_HOSTELS.has(currentUserHostel);
  }

  if (vis === 'Boys Hostel') {
    if (!currentUserHostel) return false;
    return BOYS_HOSTELS.has(currentUserHostel);
  }

  // Comma-separated list of allowed hostels
  if (vis.includes(',')) {
    if (!currentUserHostel) return false;
    const parts = vis.split(',').map((h) => h.trim());
    return parts.includes(currentUserHostel);
  }

  // Single target hostel name
  if (currentUserHostel && vis === currentUserHostel) {
    return true;
  }

  return false;
}

// ─── Context value shape ──────────────────────────────────────────────────────

interface MarketplaceContextValue {
  listings: Listing[];
  requests: RequestItem[];
  myListings: Listing[];
  myRequests: RequestItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** @deprecated – create forms insert directly via Supabase; call refresh() after */
  addListing: (listing: Listing) => void;
  /** @deprecated – create forms insert directly via Supabase; call refresh() after */
  addRequest: (request: RequestItem) => void;
  deleteListing: (id: string, imageUrl?: string | null) => Promise<{ error: Error | null }>;
  deleteRequest: (id: string) => Promise<{ error: Error | null }>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const MarketplaceContext = createContext<MarketplaceContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [myRequests, setMyRequests] = useState<RequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();

      let currentUserHostel: string | null = null;
      let blockedUserIds: Set<string> = new Set();

      if (user) {
        const [blockResult, profileResult] = await Promise.all([
          supabase
            .from('blocks')
            .select('blocker_id, blocked_id')
            .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`),
          supabase
            .from('profiles')
            .select('hostel')
            .eq('id', user.id)
            .maybeSingle(),
        ]);

        (blockResult.data ?? []).forEach((row: { blocker_id: string; blocked_id: string }) => {
          if (row.blocker_id !== user.id) blockedUserIds.add(row.blocker_id);
          if (row.blocked_id !== user.id) blockedUserIds.add(row.blocked_id);
        });

        currentUserHostel = profileResult.data?.hostel ?? null;
      }

      // Fetch active listings joined with owner profile (marketplace-safe fields only)
      // Simultaneously fetch the authenticated user's own listings and requests (all statuses: active, rented, sold, etc.)
      const publicFetches = Promise.all([
        supabase
          .from('listings')
          .select('*, profiles!listings_user_id_fkey(id, name, branch, hostel, avatar_url, verified)')
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
        supabase
          .from('requests')
          .select('*, profiles(id, name, branch, hostel, avatar_url, verified)')
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
      ]);

      const userFetches = user
        ? Promise.all([
            supabase
              .from('listings')
              .select('*, profiles!listings_user_id_fkey(id, name, branch, hostel, avatar_url, verified)')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false }),
            supabase
              .from('requests')
              .select('*, profiles(id, name, branch, hostel, avatar_url, verified)')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false }),
          ])
        : Promise.resolve([null, null]);

      const [[listingsResult, requestsResult], [userListingsRes, userRequestsRes]] =
        await Promise.all([publicFetches, userFetches]);

      if (listingsResult.error) {
        console.warn('[MarketplaceContext] listings fetch error:', listingsResult.error.message);
        setError(listingsResult.error.message);
      } else {
        const mapped = (listingsResult.data as DbListingWithOwner[])
          .filter((l) => !blockedUserIds.has(l.user_id))
          .filter((l) => isItemVisibleToUser(l, user?.id, currentUserHostel))
          .map(dbListingToListing);
        setListings(mapped);
      }

      if (requestsResult.error) {
        console.warn('[MarketplaceContext] requests fetch error:', requestsResult.error.message);
        if (!error) setError(requestsResult.error.message);
      } else {
        const mapped = (requestsResult.data as DbRequestWithOwner[])
          .filter((r) => !blockedUserIds.has(r.user_id))
          .filter((r) => isItemVisibleToUser(r, user?.id, currentUserHostel))
          .map(dbRequestToRequestItem);
        setRequests(mapped);
      }

      // Populate current user's posts (all statuses)
      if (userListingsRes && userListingsRes.data) {
        setMyListings(
          (userListingsRes.data as DbListingWithOwner[]).map(dbListingToListing)
        );
      } else if (!user) {
        setMyListings([]);
      }

      if (userRequestsRes && userRequestsRes.data) {
        setMyRequests(
          (userRequestsRes.data as DbRequestWithOwner[]).map(dbRequestToRequestItem)
        );
      } else if (!user) {
        setMyRequests([]);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.warn('[MarketplaceContext] fetchFeed error:', msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount and subscribe to profile changes (e.g. hostel update)
  useEffect(() => {
    fetchFeed();
    const unsubscribeProfile = subscribeProfile(() => {
      fetchFeed();
    });
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchFeed();
    });

    return () => {
      unsubscribeProfile();
      authListener?.subscription.unsubscribe();
    };
  }, [fetchFeed]);

  // Delete a listing from Supabase and remove it from context state immediately
  const deleteListing = useCallback(async (id: string, imageUrl?: string | null): Promise<{ error: Error | null }> => {
    try {
      const { error: dbError } = await supabase
        .from('listings')
        .delete()
        .eq('id', id);

      if (dbError) {
        return { error: new Error(dbError.message) };
      }

      // If the listing had an image stored in listing-images, attempt to clean it up
      if (imageUrl) {
        try {
          const marker = '/listing-images/';
          const idx = imageUrl.indexOf(marker);
          if (idx !== -1) {
            const path = decodeURIComponent(imageUrl.substring(idx + marker.length).split('?')[0]);
            await supabase.storage.from('listing-images').remove([path]);
          }
        } catch (storageErr) {
          console.warn('[MarketplaceContext] Storage delete cleanup error:', storageErr);
        }
      }

      // Immediately remove from context state
      setListings((prev) => prev.filter((item) => item.id !== id));
      setMyListings((prev) => prev.filter((item) => item.id !== id));
      return { error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown delete error';
      return { error: new Error(msg) };
    }
  }, []);

  // Delete a request from Supabase and remove it from context state immediately
  const deleteRequest = useCallback(async (id: string): Promise<{ error: Error | null }> => {
    try {
      const { error: dbError } = await supabase
        .from('requests')
        .delete()
        .eq('id', id);

      if (dbError) {
        return { error: new Error(dbError.message) };
      }

      // Immediately remove from context state
      setRequests((prev) => prev.filter((item) => item.id !== id));
      setMyRequests((prev) => prev.filter((item) => item.id !== id));
      return { error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown delete error';
      return { error: new Error(msg) };
    }
  }, []);

  // no-op stubs kept for API compatibility
  const addListing = useCallback((_listing: Listing) => {}, []);
  const addRequest = useCallback((_request: RequestItem) => {}, []);

  return (
    <MarketplaceContext.Provider
      value={{
        listings,
        requests,
        myListings,
        myRequests,
        isLoading,
        error,
        refresh: fetchFeed,
        addListing,
        addRequest,
        deleteListing,
        deleteRequest,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMarketplace(): MarketplaceContextValue {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) {
    throw new Error('useMarketplace must be used inside <MarketplaceProvider>');
  }
  return ctx;
}
