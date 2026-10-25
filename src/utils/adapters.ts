/**
 * Adapter utilities for CampusShare
 *
 * Maps Supabase database row shapes (DbListing, DbRequest) to the UI shapes
 * (Listing, RequestItem) that the existing card components expect.
 */

import type { DbListingWithOwner } from '../types/databaseListing';
import type { DbRequestWithOwner } from '../types/databaseRequest';
import type { Listing, RequestItem } from '../types/listing';

// ─── Category icons ───────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  Books: '📚',
  Electronics: '📱',
  Clothing: '👕',
  'Lab Equipment': '🥼',
  Sports: '⚽',
  Other: '📦',
};

export function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? '📦';
}

// ─── Time formatting ──────────────────────────────────────────────────────────

export function formatTimeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

// ─── Price formatting ─────────────────────────────────────────────────────────

export function formatListingPrice(
  listingType: string,
  price: number | null,
  rentalUnit?: string | null
): string {
  if (listingType === 'give' || price === null) return 'Free';
  if (listingType === 'rent') {
    const unit = rentalUnit === 'hour' ? 'hour' : 'day';
    return `\u20B9${price} / ${unit}`;
  }
  return `\u20B9${price}`;
}

export function formatBudget(budget: number | null): string {
  if (budget === null) return 'Flexible';
  return `\u20B9${budget}`;
}

// ─── listing_type → ItemMode ──────────────────────────────────────────────────

function listingTypeToMode(listingType: string): Listing['mode'] {
  switch (listingType) {
    case 'rent':
      return 'RENT';
    case 'sell':
      return 'SELL';
    case 'give':
      return 'FREE';
    default:
      return 'SELL';
  }
}

// ─── Main adapters ─────────────────────────────────────────────────────────────

/**
 * Convert a Supabase public.listings row (optionally joined with profiles)
 * into the Listing UI shape that ListingCard and the Home feed expect.
 */
export function dbListingToListing(db: DbListingWithOwner): Listing {
  const owner = db.profiles;
  return {
    id: db.id,
    user_id: db.user_id,
    title: db.title,
    category: db.category as Listing['category'],
    mode: listingTypeToMode(db.listing_type),
    price: formatListingPrice(db.listing_type, db.price, db.rental_unit),
    rawPrice: db.price,
    rentalUnit: db.rental_unit === 'hour' ? 'hour' : 'day',
    hostel: db.hostel,
    description: db.description,
    icon: getCategoryIcon(db.category),
    timeAgo: formatTimeAgo(db.created_at),
    image_url: db.image_url ?? null,
    status: db.status || 'active',
    rentedToUserId: db.rented_to_user_id ?? null,
    rentedAt: db.rented_at ?? null,
    ownerName: owner?.name ?? 'Campus User',
    ownerBranch: owner?.branch ? `${owner.branch}, NIT Kurukshetra` : 'NIT Kurukshetra',
    ownerHostel: owner?.hostel ?? db.hostel,
    ownerAvatarUrl: owner?.avatar_url ?? null,
    ownerVerified: owner?.verified ?? false,
    visibilityHostels: db.visibility_hostels ?? [],
    visibility: db.visibility,
  };
}

/**
 * Convert a Supabase public.requests row (optionally joined with profiles)
 * into the RequestItem UI shape that RequestCard and the Home feed expect.
 */
export function dbRequestToRequestItem(db: DbRequestWithOwner): RequestItem {
  const requester = db.profiles;
  return {
    id: db.id,
    user_id: db.user_id,
    title: db.title,
    category: db.category as RequestItem['category'],
    urgency: 'Needed',
    budget: formatBudget(db.budget),
    rawBudget: db.budget,
    hostel: db.hostel,
    description: db.description,
    icon: getCategoryIcon(db.category),
    timeAgo: formatTimeAgo(db.created_at),
    status: db.status || 'active',
    requesterName: requester?.name ?? 'Campus User',
    requesterBranch: requester?.branch ? `${requester.branch}, NIT Kurukshetra` : 'NIT Kurukshetra',
    requesterHostel: requester?.hostel ?? db.hostel,
    requesterAvatarUrl: requester?.avatar_url ?? null,
    requesterVerified: requester?.verified ?? false,
    visibilityHostels: db.visibility_hostels ?? [],
    visibility: db.visibility,
  };
}
