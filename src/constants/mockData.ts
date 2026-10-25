import { Listing, RequestItem, ListingCategory } from '../types/listing';

export const CATEGORIES: ListingCategory[] = [
  'All',
  'Books',
  'Electronics',
  'Clothing',
  'Lab Equipment',
  'Sports',
];

export interface StudentProfile {
  id: string;
  name: string;
  branch: string;
  hostel: string;
  status: string;
}

export const CURRENT_USER: StudentProfile = {
  id: 'user_nisha',
  name: 'Nisha',
  branch: 'Computer Engineering',
  hostel: 'Hostel 4',
  status: 'Verified Student',
};

export const isCurrentUserListing = (item: Listing): boolean => {
  return item.ownerName === CURRENT_USER.name || item.ownerName === 'You';
};

export const isCurrentUserRequest = (item: RequestItem): boolean => {
  return item.requesterName === CURRENT_USER.name || item.requesterName === 'You';
};

export const MOCK_LISTINGS: Listing[] = [
  {
    id: 'l1',
    user_id: 'mock_user_arjun',
    title: 'Scientific Calculator (Casio fx-991EX)',
    category: 'Electronics',
    mode: 'RENT',
    status: 'active',
    price: '\u20B9130 / day',
    rentalUnit: 'day',
    hostel: 'Hostel 4',
    description: 'Available for semester exams. In perfect working condition with a fresh battery. Includes original carry pouch.',
    icon: '\uD83E\uDDEE',
    timeAgo: '15m ago',
    ownerName: 'Arjun Mehta',
    ownerBranch: 'ECE, 3rd Year',
  },
  {
    id: 'l2',
    user_id: 'mock_user_rahul',
    title: 'Black Blazer (Formal, Size 40)',
    category: 'Clothing',
    mode: 'SELL',
    status: 'active',
    price: '\u20B9150 / day',
    hostel: 'Hostel 7',
    description: 'Dry-cleaned Raymond formal blazer. Ideal for placement interviews and club presentations. Return same day by 8 PM.',
    icon: '\uD83E\uDD5C',
    timeAgo: '1h ago',
    ownerName: 'Rahul Singh',
    ownerBranch: 'CSE, 4th Year',
  },
  {
    id: 'l3',
    user_id: 'mock_user_priya',
    title: 'High-Speed 2m HDMI Cable',
    category: 'Electronics',
    mode: 'RENT',
    status: 'active',
    price: '\u20B950',
    hostel: 'Hostel 2',
    description: 'Gold-plated connectors, fully tested with laptops, monitors, and hostel projectors. Works with all 4K displays.',
    icon: '\uD83D\uDCFB',
    timeAgo: '2h ago',
    ownerName: 'Priya Nair',
    ownerBranch: 'EEE, 2nd Year',
  },
  {
    id: 'l4',
    user_id: 'mock_user_sneha',
    title: 'Engineering Mathematics (H.K. Dass)',
    category: 'Books',
    mode: 'FREE',
    status: 'active',
    price: 'Free',
    hostel: 'Hostel 5',
    description: 'Passing on to juniors. Clean condition with highlighted formula sheets inside. Latest edition covering all NIT syllabus topics.',
    icon: '\uD83D\uDCDA',
    timeAgo: '3h ago',
    ownerName: 'Sneha Rao',
    ownerBranch: 'Mech, 4th Year',
  },
  {
    id: 'l5',
    user_id: 'mock_user_divya',
    title: 'White Cotton Lab Coat (Size M)',
    category: 'Lab Equipment',
    mode: 'RENT',
    status: 'active',
    price: '\u20B980',
    hostel: 'Girls Hostel 1',
    description: 'Standard regulation white coat for chemistry and workshop practicals. Washed & ready. Return after practical, same day.',
    icon: '\uD83E\uDD7C',
    timeAgo: '4h ago',
    ownerName: 'Divya Krishnan',
    ownerBranch: 'Chemistry, 2nd Year',
  },
];

export const MOCK_REQUESTS: RequestItem[] = [
  {
    id: 'r1',
    user_id: 'mock_user_vikram',
    title: 'Need a scientific calculator for semester exams',
    category: 'Electronics',
    urgency: 'Urgent',
    status: 'active',
    budget: '\u20B940 / day',
    hostel: 'Hostel 3',
    description: 'Need a Casio fx-991ES or fx-991EX for the upcoming Math-2 end-sem exam. Will return the same evening. Can pay up to \u20B940/day.',
    icon: '\uD83E\uDDEE',
    timeAgo: '10m ago',
    requesterName: 'Vikram Iyer',
    requesterBranch: 'Civil, 2nd Year',
  },
  {
    id: 'r2',
    user_id: 'mock_user_karan',
    title: 'Looking for a black formal blazer for placement interviews',
    category: 'Clothing',
    urgency: 'Needed',
    status: 'active',
    budget: '\u20B9150 / day',
    hostel: 'Hostel 6',
    description: 'Need a clean black blazer in size 38 or 40 for a campus placement drive on Thursday. Will return dry-cleaned the same evening.',
    icon: '\uD83E\uDD5C',
    timeAgo: '45m ago',
    requesterName: 'Karan Desai',
    requesterBranch: 'CSE, 4th Year',
  },
  {
    id: 'r3',
    user_id: 'mock_user_ananya',
    title: 'Need an HDMI adapter for a presentation',
    category: 'Electronics',
    urgency: 'Needed',
    status: 'active',
    budget: '\u20B950 / day',
    hostel: 'Hostel 1',
    description: 'Looking for a Type-C to HDMI adapter or a long HDMI cable for a department presentation tonight in the seminar hall.',
    icon: '\uD83D\uDCFB',
    timeAgo: '1h ago',
    requesterName: 'Ananya Sharma',
    requesterBranch: 'IT, 3rd Year',
  },
  {
    id: 'r4',
    user_id: 'mock_user_meera',
    title: 'Looking for Engineering Mathematics textbook',
    category: 'Books',
    urgency: 'Needed',
    status: 'active',
    budget: 'Free / \u20B930',
    hostel: 'Hostel 8',
    description: 'Need H.K. Dass Engineering Mathematics or B.S. Grewal for exam prep this week. Can borrow or buy at a low price.',
    icon: '\uD83D\uDCDA',
    timeAgo: '2h ago',
    requesterName: 'Meera Pillai',
    requesterBranch: 'Mech, 1st Year',
  },
  {
    id: 'r5',
    user_id: 'mock_user_riya',
    title: 'Lab coat for Chemistry practical',
    category: 'Lab Equipment',
    urgency: 'Urgent',
    status: 'active',
    budget: 'Free / \u20B920',
    hostel: 'Girls Hostel 2',
    description: 'Forgot lab coat at home. Need a standard white lab coat for tomorrow 10 AM chemistry lab (Size S or M).',
    icon: '\uD83E\uDD7C',
    timeAgo: '3h ago',
    requesterName: 'Riya Thomas',
    requesterBranch: 'Chemistry, 2nd Year',
  },
];