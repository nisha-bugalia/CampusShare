import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../../src/constants/colors';
import { Spacing, BorderRadius } from '../../src/constants/layout';
import { useAuth } from '../../src/context/AuthContext';

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    const { error: signInError, cancelled } = await signInWithGoogle();

    setLoading(false);

    if (cancelled) {
      // User cancelled or dismissed the Google sign-in window. No error banner needed.
      return;
    }

    if (signInError) {
      setError(
        signInError.message ||
          'Google authentication failed. Please check your network and try again.'
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Brand Header ── */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>🏛️</Text>
          </View>
          <Text style={styles.brandTitle}>CampusShare</Text>
          <Text style={styles.brandSubtitle}>Your campus marketplace</Text>

          <View style={styles.campusPill}>
            <Text style={styles.campusPillIcon}>🎓</Text>
            <Text style={styles.campusPillText}>NIT Kurukshetra Exclusive</Text>
          </View>
        </View>

        {/* ── Sign In Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Sign In with Google</Text>
          <Text style={styles.cardSubheading}>
            Connect with your official college account to buy, sell, or rent items
            with verified peers on campus.
          </Text>

          {/* Institutional Account Notice */}
          <View style={styles.noticeBox}>
            <Text style={styles.noticeIcon}>ℹ️</Text>
            <Text style={styles.noticeText}>
              Use your <Text style={styles.noticeHighlight}>@nitkkr.ac.in</Text> Google account
            </Text>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Google Sign In Button */}
          <TouchableOpacity
            style={[styles.googleButton, loading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.light.primary} size="small" />
            ) : (
              <View style={styles.googleButtonContent}>
                <View style={styles.googleIconBadge}>
                  <Text style={styles.googleG}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Footer Information ── */}
        <View style={styles.footerNotice}>
          <Text style={styles.footerNoticeText}>
            CampusShare is restricted to verified students and faculty of NIT Kurukshetra.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#BFDBFE',
    marginBottom: Spacing.sm,
  },
  logoIcon: {
    fontSize: 32,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.light.primary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 15,
    color: Colors.light.textMuted,
    marginBottom: 12,
  },
  campusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  campusPillIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  campusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: Spacing.lg,
  },
  cardHeading: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 6,
  },
  cardSubheading: {
    fontSize: 13,
    color: Colors.light.textMuted,
    lineHeight: 19,
    marginBottom: Spacing.md,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: Spacing.lg,
  },
  noticeIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: Colors.light.textMuted,
    fontWeight: '500',
  },
  noticeHighlight: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: BorderRadius.md,
    padding: 10,
    marginBottom: Spacing.md,
  },
  errorIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#B91C1C',
    lineHeight: 16,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    height: 50,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  googleG: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  googleButtonText: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '600',
  },
  footerNotice: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  footerNoticeText: {
    fontSize: 11,
    color: Colors.light.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
