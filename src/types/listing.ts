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
  hostel: string;
  description: string;
  icon: string;
  timeAgo: string;
  /** Public URL of the uploaded item photo from Supabase Storage (null when no photo) */
  image_url?: string | null;
  ownerName: string;
  ownerBranch: string;
  ownerHostel?: string;
  ownerAvatarUrl?: string | null;
  ownerVerified?: boolean;
  /** Allowed hostels for visibility ([] = Everyone) */
  visibilityHostels?: string[];
}

export interface RequestItem {
  id: string;
  /** The Supabase auth user id who posted this request */
  user_id: string;
  title: string;
  category: Exclude<ListingCategory, 'All'>;
  urgency: 'Urgent' | 'Needed' | 'Flexible';
  budget: string;
  hostel: string;
  description: string;
  icon: string;
  timeAgo: string;
  requesterName: string;
  requesterBranch: string;
  requesterHostel?: string;
  requesterAvatarUrl?: string | null;
  requesterVerified?: boolean;
  /** Allowed hostels for visibility ([] = Everyone) */
  visibilityHostels?: string[];
}