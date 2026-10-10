/**
 * Profile — represents a row in public.profiles (Supabase).
 *
 * The `id` field corresponds 1-to-1 with `auth.users.id`.
 * A profile row is automatically created by the `handle_new_user` trigger
 * whenever a new user is inserted into `auth.users`.
 */
export interface Profile {
  /** UUID — matches auth.users.id */
  id: string;

  /** Display name — from Google metadata at sign-up, editable later */
  name: string | null;

  /** Email address — from auth.users.email */
  email: string | null;

  /** Academic branch/department — collected during onboarding */
  branch: string | null;

  /** Hostel number/name — collected during onboarding */
  hostel: string | null;

  /** Google profile picture URL or user-uploaded avatar */
  avatar_url: string | null;

  /**
   * Whether the account has been verified.
   * Set to `true` by the trigger because the Supabase Auth Hook
   * enforces the @nitkkr.ac.in domain restriction at sign-in.
   */
  verified: boolean;

  /** Timestamp when the profile row was created */
  created_at: string;
}

/**
 * Partial subset used when updating an existing profile.
 * `id` and `created_at` are immutable — excluded from updates.
 */
export type ProfileUpdate = Partial<
  Pick<Profile, 'name' | 'branch' | 'hostel' | 'avatar_url'>
>;
