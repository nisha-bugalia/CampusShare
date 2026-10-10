/**
 * DbPushToken — represents a row in public.push_tokens (Supabase).
 */
export interface DbPushToken {
  /** UUID primary key, generated via gen_random_uuid() */
  id: string;

  /** References public.profiles(id) */
  user_id: string;

  /** Unique Expo push token string */
  expo_push_token: string;

  /** Platform ('android' | 'ios' | 'web') */
  platform: string | null;

  /** ISO 8601 creation timestamp */
  created_at: string;

  /** ISO 8601 last update timestamp */
  updated_at: string;
}

export interface DbPushTokenInsert {
  id?: string;
  user_id: string;
  expo_push_token: string;
  platform?: string | null;
  created_at?: string;
  updated_at?: string;
}
