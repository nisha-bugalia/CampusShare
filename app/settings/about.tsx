import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Colors } from '../../src/constants/colors';
import { Spacing, BorderRadius } from '../../src/constants/layout';

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'About',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: Colors.light.primary,
          headerTitleStyle: { fontWeight: '700', color: '#0F172A' },
          headerBackTitle: 'Settings',
        }}
      />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 24, 40) },
        ]}
      >
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>🏛️</Text>
          </View>
          <Text style={styles.brandTitle}>CampusShare</Text>
          <Text style={styles.versionBadge}>Version {appVersion}</Text>
          <Text style={styles.brandSubtitle}>Built for NIT Kurukshetra students.</Text>
        </View>

        {/* Mission Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>About the App</Text>
          <Text style={styles.cardText}>
            CampusShare makes it easier for students to share, find, rent, and request useful items within campus.
          </Text>
          <Text style={[styles.cardText, { marginTop: 10 }]}>
            Whether you need lab equipment for a week, a textbook for a semester, or want to sell your bicycle before graduating, CampusShare connects students directly within our campus hostels.
          </Text>
        </View>

        {/* Student Project Acknowledgment */}
        <View style={styles.card}>
          <View style={styles.rowHeader}>
            <Text style={styles.sectionIcon}>🎓</Text>
            <Text style={styles.cardHeading}>Student Project</Text>
          </View>
          <Text style={styles.cardText}>
            CampusShare is an independent student-built initiative created to foster resource sharing, sustainability, and mutual assistance across NIT Kurukshetra.
          </Text>
        </View>

        {/* Key Features Summary */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Features at a Glance</Text>
          <View style={styles.featureRow}>
            <Text style={styles.featureBullet}>•</Text>
            <Text style={styles.featureText}>
              <Text style={styles.bold}>I HAVE:</Text> List items to rent, sell, or give away freely.
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureBullet}>•</Text>
            <Text style={styles.featureText}>
              <Text style={styles.bold}>I NEED:</Text> Request things you urgently need from peers.
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureBullet}>•</Text>
            <Text style={styles.featureText}>
              <Text style={styles.bold}>Hostel Filtering:</Text> Restrict posts to your hostel or share campus-wide.
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureBullet}>•</Text>
            <Text style={styles.featureText}>
              <Text style={styles.bold}>Real-Time Chat:</Text> Coordinate handoffs safely within the app.
            </Text>
          </View>
        </View>

        {/* Technical Info */}
        <View style={styles.metaContainer}>
          <Text style={styles.metaText}>NIT Kurukshetra • 2026</Text>
          <Text style={styles.metaSubtext}>Powered by Expo & Supabase</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  brandContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  logoIcon: {
    fontSize: 34,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.light.primary,
    letterSpacing: -0.5,
  },
  versionBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    marginTop: 6,
    marginBottom: 8,
  },
  brandSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  sectionIcon: {
    fontSize: 16,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 6,
  },
  cardText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    gap: 6,
  },
  featureBullet: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '800',
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  bold: {
    fontWeight: '700',
    color: Colors.light.text,
  },
  metaContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: 2,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  metaSubtext: {
    fontSize: 11,
    color: '#94A3B8',
  },
});
