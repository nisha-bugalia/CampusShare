import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Listing, RequestItem } from '../types/listing';
import { MOCK_LISTINGS, MOCK_REQUESTS } from '../constants/mockData';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketplaceContextValue {
  listings: Listing[];
  requests: RequestItem[];
  addListing: (listing: Listing) => void;
  addRequest: (request: RequestItem) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const MarketplaceContext = createContext<MarketplaceContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  // User-created items are stored separately so we can prepend them.
  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [userRequests, setUserRequests] = useState<RequestItem[]>([]);

  // Merged views: newest user-created items appear at the top.
  const listings: Listing[] = [...userListings, ...MOCK_LISTINGS];
  const requests: RequestItem[] = [...userRequests, ...MOCK_REQUESTS];

  function addListing(listing: Listing) {
    setUserListings((prev) => [listing, ...prev]);
  }

  function addRequest(request: RequestItem) {
    setUserRequests((prev) => [request, ...prev]);
  }

  return (
    <MarketplaceContext.Provider value={{ listings, requests, addListing, addRequest }}>
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