/**
 * Campus constants for NIT Kurukshetra.
 * Used for student onboarding, listings, and filtering.
 */

export const NIT_BRANCHES = [
  'Computer Engineering',
  'Information Technology',
  'Electronics & Communication Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Production & Industrial Engineering',
  'Artificial Intelligence & Machine Learning',
  'Industrial Internet of Things (IIoT)',
  'Mathematics & Computing',
  'Physics / Chemistry (M.Sc)',
  'MBA',
  'MCA',
  'Other',
] as const;

export type NITBranch = (typeof NIT_BRANCHES)[number];

export const NIT_HOSTELS = [
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
  'Girls Hostel 1 (KCB)',
  'Girls Hostel 2 (Bhagirathi)',
  'Girls Hostel 3 (Cauvery)',
  'Girls Hostel 4',
  'Day Scholar / Outside Campus',
] as const;

export type NITHostel = (typeof NIT_HOSTELS)[number];
