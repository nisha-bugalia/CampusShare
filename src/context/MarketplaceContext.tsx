/**
 * MarketplaceContext — shared data layer for the CampusShare feed.
 *
 * Fetches active listings and requests from Supabase once and shares them
 * across all consumers (Home, Search). Exposes a `refresh()` function so
 * the Home screen can re-fetch when it becomes active.
 *
 * addListing / addRequest are kept as no-ops for backward-compatibility with
 * any existing callers; the create forms already insert directly into Supabase.
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

// ─── Context value shape ──────────────────────────────────────────────────────

interface MarketplaceContextValue {
  listings: Listing[];
  requests: RequestItem[];
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch active listings joined with owner profile (marketplace-safe fields only)
      const [listingsResult, requestsResult] = await Promise.all([
        supabase
          .from('listings')
          .select('*, profiles(id, name, branch, hostel, avatar_url, verified)')
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
        supabase
          .from('requests')
          .select('*, profiles(id, name, branch, hostel, avatar_url, verified)')
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
      ]);

      if (listingsResult.error) {
        console.warn('[MarketplaceContext] listings fetch error:', listingsResult.error.message);
        setError(listingsResult.error.message);
      } else {
        const mapped = (listingsResult.data as DbListingWithOwner[]).map(dbListingToListing);
        setListings(mapped);
      }

      if (requestsResult.error) {
        console.warn('[MarketplaceContext] requests fetch error:', requestsResult.error.message);
        if (!error) setError(requestsResult.error.message);
      } else {
        const mapped = (requestsResult.data as DbRequestWithOwner[]).map(dbRequestToRequestItem);
        setRequests(mapped);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.warn('[MarketplaceContext] fetchFeed error:', msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchFeed();
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