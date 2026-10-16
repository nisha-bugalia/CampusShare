import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { Spacing, BorderRadius } from '../../src/constants/layout';

interface PrivacySectionProps {
  icon: string;
  title: string;
  description: string;
}

function PrivacySection({ icon, title, description }: PrivacySectionProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.cardDescription}>{description}</Text>
    </View>
  );
}

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Privacy',
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
        <Text style={styles.screenIntro}>
          CampusShare is built with student safety, transparency, and privacy in mind. Here is how your
          data is used and protected on campus.
        </Text>

        <PrivacySection
          icon="🏛️"
          title="NIT Kurukshetra Community"
          description="CampusShare is designed exclusively for verified students and members of the NIT Kurukshetra campus community. Access requires authentication with an authorized institute Google account."
        />

        <PrivacySection
          icon="👤"
          title="Profile Information"
          description="Your display name, academic branch, and hostel or residence are visible to other verified students to facilitate peer-to-peer item sharing, rentals, and pickup coordination."
        />

        <PrivacySection
          icon="👁️"
          title="Listing & Hostel Visibility"
          description="Items and requests are displayed according to their configured visibility settings. Creators can choose to make a post visible campus-wide or restrict it to specific hostel blocks."
        />

        <PrivacySection
          icon="🚫"
          title="Blocking & Interaction"
          description="Blocking another user prevents them from sending you chat messages and removes their posts from your marketplace feed. Block relationships are bilateral and can be managed anytime under Blocked Users."
        />

        <PrivacySection
          icon="🛡️"
          title="Safety & Moderation Reports"
          description="Reports submitted regarding safety violations, fraudulent items, or inappropriate behavior are securely reviewed by campus moderators to maintain a trustworthy marketplace."
        />

        <PrivacySection
          icon="🔐"
          title="Authentication & Identity"
          description="Your institute email address and account credentials are secure and managed directly by Supabase Auth and Google OAuth. Password details are never accessible to CampusShare."
        />
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
  screenIntro: {
    fontSize: 14,
    color: Colors.light.textMuted,
    lineHeight: 20,
    marginBottom: 4,
    paddingHorizontal: 4,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
    flex: 1,
  },
  cardDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
});
