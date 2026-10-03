export type ItemMode = 'RENT' | 'SELL' | 'FREE';

export type ListingCategory =
  | 'All'
  | 'Books'
  | 'Electronics'
  | 'Clothing'
  | 'Lab Equipment'
  | 'Sports';

export interface Listing {
  id: string;
  title: string;
  category: Exclude<ListingCategory, 'All'>;
  mode: ItemMode;
  price: string;
  hostel: string;
  description: string;
  icon: string;
  timeAgo: string;
  ownerName: string;
  ownerBranch: string;
}

export interface RequestItem {
  id: string;
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
}