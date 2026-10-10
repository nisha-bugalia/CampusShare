import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Colors } from '../../src/constants/colors';
import { Spacing, BorderRadius } from '../../src/constants/layout';
import { useAuth, createSessionFromUrl } from '../../src/context/AuthContext';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // If AuthContext has already established a session, navigate immediately
    if (session) {
      router.replace('/(tabs)');
      return;
    }

    let isMounted = true;

    // Check if initial URL or current URL has tokens to parse
    const checkUrl = async () => {
      try {
        const url = await Linking.getInitialURL();
        if (url) {
          const { error, session: newSession } = await createSessionFromUrl(url);
          if (!isMounted) return;

          if (error) {
            setErrorMessage(error.message || 'Verification link is invalid or has expired.');
            return;
          }

          if (newSession) {
            router.replace('/(tabs)');
            return;
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        setErrorMessage(
          err instanceof Error ? err.message : 'Could not complete sign-in. Please try again.'
        );
      }
    };

    checkUrl();

    // Also listen for incoming URL in case it fires while on this screen
    const subscription = Linking.addEventListener('url', async ({ url }) => {
      try {
        const { error, session: newSession } = await createSessionFromUrl(url);
        if (!isMounted) return;

        if (error) {
          setErrorMessage(error.message || 'Verification link is invalid or has expired.');
          return;
        }

        if (newSession) {
          router.replace('/(tabs)');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setErrorMessage(
          err instanceof Error ? err.message : 'Could not complete sign-in. Please try again.'
        );
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [session, router]);

  const handleBackToLogin = () => {
    router.replace('/(auth)/login');
  };

  if (errorMessage) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.errorBadge}>
            <Text style={styles.errorIcon}>⚠️</Text>
          </View>
          <Text style={styles.cardHeading}>Sign-in Failed</Text>
          <Text style={styles.cardSubheading}>{errorMessage}</Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleBackToLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.badge}>
          <Text style={styles.logoIcon}>🏛️</Text>
        </View>
        <Text style={styles.cardHeading}>Signing you in...</Text>
        <Text style={styles.cardSubheading}>
          Verifying your credentials and establishing your session.
        </Text>
        <ActivityIndicator
          size="large"
          color={Colors.light.primary}
          style={styles.spinner}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  logoIcon: {
    fontSize: 32,
  },
  errorBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  errorIcon: {
    fontSize: 30,
  },
  cardHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  cardSubheading: {
    fontSize: 14,
    color: Colors.light.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  spinner: {
    marginTop: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: Colors.light.primary,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
