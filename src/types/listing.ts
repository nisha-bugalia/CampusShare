import type { DbListingStatus, RentalUnit } from './databaseListing';
import type { DbRequestStatus } from './databaseRequest';

export type { RentalUnit };
export type ItemMode = 'RENT' | 'SELL' | 'FREE';

export type ListingCategory =
  | 'All'
  | 'Books'
  | 'Electronics'
  | 'Clothing'
  | 'Lab Equipment'
  | 'Sports'
  | 'Other';

export interface Listing {
  id: string;
  /** The Supabase auth user id who owns this listing */
  user_id: string;
  title: string;
  category: Exclude<ListingCategory, 'All'>;
  mode: ItemMode;
  price: string;
  rawPrice?: number | null;
  /** Rental billing unit: 'day' or 'hour' (default 'day') */
  rentalUnit?: RentalUnit;
  hostel: string;
  description: string;
  icon: string;
  timeAgo: string;
  /** Public URL of the uploaded item photo from Supabase Storage (null when no photo) */
  image_url?: string | null;
  /** Listing status */
  status: DbListingStatus;
  /** Renter user ID (when status is 'rented') */
  rentedToUserId?: string | null;
  /** ISO 8601 timestamp when marked as rented */
  rentedAt?: string | null;
  ownerName: string;
  ownerBranch: string;
  ownerHostel?: string;
  ownerAvatarUrl?: string | null;
  ownerVerified?: boolean;
  /** Allowed hostels for visibility ([] = Everyone) */
  visibilityHostels?: string[];
  /** Visibility scope label (e.g., 'Everyone', 'My Hostel') */
  visibility?: string;
}

export interface RequestItem {
  id: string;
  /** The Supabase auth user id who posted this request */
  user_id: string;
  title: string;
  category: Exclude<ListingCategory, 'All'>;
  urgency: 'Urgent' | 'Needed' | 'Flexible';
  budget: string;
  rawBudget?: number | null;
  hostel: string;
  description: string;
  icon: string;
  timeAgo: string;
  /** Request status */
  status: DbRequestStatus;
  requesterName: string;
  requesterBranch: string;
  requesterHostel?: string;
  requesterAvatarUrl?: string | null;
  requesterVerified?: boolean;
  /** Allowed hostels for visibility ([] = Everyone) */
  visibilityHostels?: string[];
  /** Visibility scope label (e.g., 'Everyone', 'My Hostel') */
  visibility?: string;
}