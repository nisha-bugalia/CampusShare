import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { Alert } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import {
  registerPushToken,
  resetPushTokenRegistration,
  unregisterPushToken,
} from '../services/pushTokenService';
import { clearActiveChatPresence } from '../services/chatService';

// Ensure any completed web browser auth sessions are closed properly
WebBrowser.maybeCompleteAuthSession();

// ── Constants ────────────────────────────────────────────────────────────────

/**
 * Native deep-link callback URL registered in Supabase Dashboard and Google Cloud Console.
 * Matches the custom scheme in app.json ("campusshare").
 */
export const OAUTH_REDIRECT_URL = 'campusshare://auth/callback';

// ── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<{ error: Error | null; cancelled?: boolean }>;
  signOut: () => Promise<{ error: Error | null }>;
}

// ── URL Extraction Helper ───────────────────────────────────────────────────

/**
 * Robustly parses parameters from both query string (?) and hash fragment (#).
 * Handles Supabase OAuth redirects in native mobile apps.
 */
export function extractParamsFromUrl(url: string): Record<string, string> {
  const params: Record<string, string> = {};

  try {
    // 1. Query parameters (?...)
    const queryIndex = url.indexOf('?');
    if (queryIndex !== -1) {
      const queryString = url.slice(queryIndex + 1).split('#')[0];
      const searchParams = new URLSearchParams(queryString);
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
    }

    // 2. Hash fragment parameters (#...)
    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1) {
      const hashString = url.slice(hashIndex + 1);
      const hashParams = new URLSearchParams(hashString);
      hashParams.forEach((value, key) => {
        params[key] = value;
      });
    }
  } catch (err) {
    console.warn('[AuthContext] Failed to parse URL parameters:', err);
  }

  return params;
}

/**
 * Exchanges deep link tokens or codes for an active Supabase session.
 */
export async function createSessionFromUrl(
  url: string
): Promise<{ error: Error | null; session?: Session | null }> {
  if (!url) return { error: null };

  const params = extractParamsFromUrl(url);

  // Check for error responses from Supabase or Google
  if (params['error'] || params['error_description']) {
    const rawError = params['error_description'] || params['error'] || 'Authentication failed.';
    const decoded = decodeURIComponent(rawError).replace(/\+/g, ' ');
    return { error: new Error(decoded) };
  }

  // Case 1: PKCE authorization code (standard for modern OAuth)
  const code = params['code'];
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return { error };
    return { error: null, session: data.session };
  }

  // Case 2: access_token + refresh_token (implicit flow)
  const accessToken = params['access_token'];
  const refreshToken = params['refresh_token'];
  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) return { error };
    return { error: null, session: data.session };
  }

  // Case 3: token_hash + type (fallback)
  const tokenHash = params['token_hash'];
  const type = params['type'];
  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as any,
    });
    if (error) return { error };
    return { error: null, session: data.session };
  }

  return { error: null };
}

// ── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const processDeepLinkUrl = async (url: string | null) => {
    if (!url) return;

    // Only process URLs that belong to our app's auth callback
    if (
      !url.includes('auth/callback') &&
      !url.includes('access_token=') &&
      !url.includes('code=') &&
      !url.includes('token_hash=')
    ) {
      return;
    }

    try {
      const { error, session: newSession } = await createSessionFromUrl(url);

      if (error) {
        console.warn('[AuthContext] Deep link session error:', error.message);
        Alert.alert(
          'Sign-In Error',
          error.message || 'Unable to complete Google sign-in. Please try again.'
        );
        return;
      }

      if (newSession) {
        setSession(newSession);
        setUser(newSession.user);
      }
    } catch (err: any) {
      console.warn('[AuthContext] Unexpected error processing deep link:', err);
      Alert.alert(
        'Sign-In Error',
        err instanceof Error ? err.message : 'Unexpected error processing your sign-in.'
      );
    }
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Read persisted session from AsyncStorage
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (!isMounted) return;
        if (error) console.warn('[AuthContext] getSession error:', error.message);
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('[AuthContext] Unexpected getSession error:', err);
        setIsLoading(false);
      });

    // 2. Real-time auth listener (catches setSession, exchangeCodeForSession, signOut)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!isMounted) return;
      if (event === 'SIGNED_OUT') {
        resetPushTokenRegistration();
      }
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);
    });

    // 3. Handle cold-start deep link (when app opened directly by OAuth redirect)
    Linking.getInitialURL().then((url) => {
      if (!isMounted) return;
      processDeepLinkUrl(url);
    });

    // 4. Handle warm-start deep link (when app already open in background)
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      if (!isMounted) return;
      processDeepLinkUrl(url);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  // 3. Register Expo push token once user is authenticated
  useEffect(() => {
    if (user?.id) {
      registerPushToken(user.id);
    }
  }, [user?.id]);

  // ── Actions ─────────────────────────────────────────────────────────────

  /**
   * Triggers Google OAuth sign-in flow via Supabase.
   * Opens the OAuth URL in an in-app browser session using expo-web-browser.
   */
  const signInWithGoogle = async (): Promise<{
    error: Error | null;
    cancelled?: boolean;
  }> => {
    try {
      // 1. Get Google OAuth URL from Supabase with skipBrowserRedirect: true
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: OAUTH_REDIRECT_URL,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        return { error };
      }

      if (!data?.url) {
        return {
          error: new Error('No authentication URL was returned by Supabase.'),
        };
      }

      // 2. Open Google sign-in in a native authentication browser session
      const authResult = await WebBrowser.openAuthSessionAsync(
        data.url,
        OAUTH_REDIRECT_URL
      );

      // 3. Handle cancellation/dismissal by user
      if (authResult.type === 'cancel' || authResult.type === 'dismiss') {
        return { error: null, cancelled: true };
      }

      // 4. Handle success redirect returned by the browser session
      if (authResult.type === 'success' && authResult.url) {
        const { error: sessionError, session: newSession } =
          await createSessionFromUrl(authResult.url);

        if (sessionError) {
          return { error: sessionError };
        }

        if (newSession) {
          setSession(newSession);
          setUser(newSession.user);
        }

        return { error: null };
      }

      return { error: null };
    } catch (err: any) {
      return {
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  };

  const signOut = async (): Promise<{ error: Error | null }> => {
    try {
      if (user?.id) {
        await clearActiveChatPresence(user.id);
        await unregisterPushToken(user.id);
      }
      const { error } = await supabase.auth.signOut();
      if (error) return { error };
      setSession(null);
      setUser(null);
      resetPushTokenRegistration();
      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isLoading,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return context;
}
