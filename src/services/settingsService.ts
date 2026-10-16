import { supabase } from '../lib/supabase';
import type { FeedbackType } from '../types/settings';

/**
 * Retrieves the user's notification preferences from Supabase.
 * Defaults to true if no preference row exists yet.
 */
export async function getNotificationPreferences(
  userId: string
): Promise<{ chatNotifications: boolean; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('chat_notifications')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[settingsService] Error fetching notification preferences:', error.message);
      return { chatNotifications: true, error: new Error(error.message) };
    }

    if (!data) {
      return { chatNotifications: true, error: null };
    }

    return {
      chatNotifications: data.chat_notifications !== false,
      error: null,
    };
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[settingsService] Unexpected error in getNotificationPreferences:', msg);
    return { chatNotifications: true, error: new Error(msg) };
  }
}

/**
 * Updates or creates the user's notification preferences in Supabase.
 */
export async function updateNotificationPreferences(
  userId: string,
  chatNotifications: boolean
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: userId,
          chat_notifications: chatNotifications,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('[settingsService] Error updating notification preferences:', error.message);
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[settingsService] Unexpected error in updateNotificationPreferences:', msg);
    return { error: new Error(msg) };
  }
}

/**
 * Submits user product feedback or bug reports into public.feedback.
 */
export async function submitFeedback(
  userId: string,
  type: FeedbackType,
  message: string
): Promise<{ error: Error | null }> {
  try {
    const cleanMessage = message.trim();
    if (cleanMessage.length < 5) {
      return { error: new Error('Please provide at least 5 characters describing your feedback or problem.') };
    }

    const { error } = await supabase.from('feedback').insert({
      user_id: userId,
      type,
      message: cleanMessage,
    });

    if (error) {
      console.error('[settingsService] Error submitting feedback:', error.message);
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[settingsService] Unexpected error in submitFeedback:', msg);
    return { error: new Error(msg) };
  }
}
