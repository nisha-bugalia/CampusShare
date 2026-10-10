import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

// In-memory state:
// - cachedDeviceToken: remembers the device's token across account sign-ins on the same device
// - registeredUserId: tracks which user currently has their push token successfully registered
// - isRegistering: concurrency lock
let cachedDeviceToken: string | null = null;
let registeredUserId: string | null = null;
let isRegistering = false;

/**
 * Resets the in-memory push token registration state for the current session/user.
 * Note: Keeps cachedDeviceToken intact so subsequent signed-in users on this device
 * can immediately reuse the device token without re-requesting permissions.
 */
export function resetPushTokenRegistration(): void {
  registeredUserId = null;
  isRegistering = false;
}

/**
 * Unlinks / removes the push token for a user when they log out.
 * This frees the device token so the next user on the same device can claim it without RLS conflicts.
 */
export async function unregisterPushToken(userId: string): Promise<void> {
  if (!userId) return;
  try {
    await supabase.from('push_tokens').delete().eq('user_id', userId);
  } catch (err) {
    console.warn('[pushTokenService] Failed to remove push token on signout:', err);
  }
}

/**
 * Registers the device's Expo push token in Supabase for the authenticated user.
 * - Prompts for notification permission if not yet granted.
 * - Reuses the existing device token if already obtained, or fetches it via expo-notifications.
 * - Upserts the token into public.push_tokens on conflict (expo_push_token),
 *   updating user_id, platform, and updated_at.
 * - Handles denied permissions and errors gracefully without blocking app usage.
 * - Runs only once per user session upon successful registration.
 */
export async function registerPushToken(userId: string): Promise<string | null> {
  if (!userId) {
    return null;
  }

  // Guard: if this user is already registered in this session, reuse cached token
  if (registeredUserId === userId || isRegistering) {
    return cachedDeviceToken;
  }

  // Push notifications via Expo are not supported on web
  if (Platform.OS === 'web') {
    return null;
  }

  isRegistering = true;

  try {
    let expoPushToken = cachedDeviceToken;

    // If we don't have a cached device token yet, obtain it
    if (!expoPushToken) {
      // 1. Android channel setup
      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        } catch (channelError) {
          console.warn('[pushTokenService] Failed to set Android notification channel:', channelError);
        }
      }

      // 2. Request notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[pushTokenService] Push notification permission not granted.');
        return null;
      }

      // 3. Obtain EAS projectId
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        (Constants as any)?.easConfig?.projectId;

      if (!projectId) {
        console.warn('[pushTokenService] EAS projectId not found in configuration.');
        return null;
      }

      // 4. Retrieve Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      expoPushToken = tokenData?.data ?? null;

      if (!expoPushToken) {
        console.warn('[pushTokenService] No Expo push token returned.');
        return null;
      }

      cachedDeviceToken = expoPushToken;
    }

    // 5. Upsert token in public.push_tokens for current user_id
    const { error: upsertError } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          expo_push_token: expoPushToken,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'expo_push_token',
        }
      );

    if (upsertError) {
      console.warn('[pushTokenService] Failed to save push token for user:', userId, upsertError.message);
      // Do not lock registeredUserId on failure so registration can retry
      return null;
    }

    // Only mark user as registered upon successful database write
    registeredUserId = userId;
    return expoPushToken;
  } catch (error: any) {
    console.warn('[pushTokenService] Unexpected error during push token registration:', error?.message ?? error);
    return null;
  } finally {
    isRegistering = false;
  }
}
