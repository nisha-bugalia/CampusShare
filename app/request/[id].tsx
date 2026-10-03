import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMarketplace } from '../../src/context/MarketplaceContext';
import { Colors } from '../../src/constants/colors';
import { Spacing, BorderRadius } from '../../src/constants/layout';

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { requests } = useMarketplace();
  const request = requests.find((item) => item.id === id);

  if (!request) {
    return (
      <SafeAreaView style={styles.notFoundContainer}>
        <Stack.Screen options={{ title: 'Request Not Found' }} />
        <Text style={styles.notFoundIcon}>🔍</Text>
        <Text style={styles.notFoundTitle}>Request not found</Text>
        <Text style={styles.notFoundSubtitle}>
          This request may have been removed or is no longer available.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const renderUrgencyBadge = () => {
    if (request.urgency === 'Urgent') {
      return (
        <View style={[styles.badge, styles.badgeUrgent]}>
          <Text style={styles.badgeUrgentText}>URGENT</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, styles.badgeNeeded]}>
        <Text style={styles.badgeNeededText}>I NEED</Text>
      </View>
    );
  };

  const handleComingSoon = () => {
    Alert.alert(
      'I Have This Item',
      'This feature is coming soon! Stay tuned.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen
        options={{
          title: 'Request Detail',
          headerBackTitle: 'Back',
          headerTitleStyle: { fontSize: 15 },
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon Banner */}
        <View style={styles.iconBanner}>
          <Text style={styles.bannerIcon}>{request.icon}</Text>
          <Text style={styles.bannerLabel}>I NEED</Text>
        </View>

        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.badgeRow}>
            {renderUrgencyBadge()}
            <Text style={styles.timeAgo}>Posted {request.timeAgo}</Text>
          </View>
          <Text style={styles.title}>{request.title}</Text>

          <View style={styles.budgetRow}>
            <Text style={styles.budgetLabel}>Budget  </Text>
            <Text style={styles.budgetValue}>{request.budget}</Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>📍</Text>
              <Text style={styles.metaText}>{request.hostel}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>🏷️</Text>
              <Text style={styles.metaText}>{request.category}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What they need</Text>
          <Text style={styles.description}>{request.description}</Text>
        </View>

        <View style={styles.divider} />

        {/* Requester Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requested by</Text>
          <View style={styles.requesterCard}>
            <View style={styles.requesterAvatar}>
              <Text style={styles.requesterAvatarText}>
                {request.requesterName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.requesterInfo}>
              <Text style={styles.requesterName}>{request.requesterName}</Text>
              <Text style={styles.requesterBranch}>{request.requesterBranch}</Text>
              <Text style={styles.requesterHostel}>{request.hostel}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.haveButton}
          activeOpacity={0.8}
          onPress={handleComingSoon}
        >
          <Text style={styles.haveButtonText}>✋  I Have This Item</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // Icon Banner
  iconBanner: {
    width: '100%',
    height: 200,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  bannerIcon: {
    fontSize: 72,
    marginBottom: 8,
  },
  bannerLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 2,
  },

  // Header
  headerSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  badgeUrgent: { backgroundColor: '#FEF2F2' },
  badgeUrgentText: { fontSize: 11, fontWeight: '700', color: '#DC2626', letterSpacing: 0.5 },
  badgeNeeded: { backgroundColor: '#FFFBEB' },
  badgeNeededText: { fontSize: 11, fontWeight: '700', color: '#D97706', letterSpacing: 0.5 },
  timeAgo: {
    fontSize: 12,
    color: '#94A3B8',
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 30,
    marginBottom: 12,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  budgetLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  budgetValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#B45309',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaIcon: {
    fontSize: 14,
  },
  metaText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  metaDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 12,
  },

  // Divider
  divider: {
    height: 8,
    backgroundColor: '#F1F5F9',
  },

  // Sections
  section: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#334155',
  },

  // Requester Card
  requesterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  requesterAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  requesterAvatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  requesterInfo: {
    flex: 1,
  },
  requesterName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  requesterBranch: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 1,
  },
  requesterHostel: {
    fontSize: 12,
    color: '#94A3B8',
  },

  // Bottom Button
  bottomBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  haveButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 16,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  haveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Not Found
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#F8FAFC',
  },
  notFoundIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  notFoundSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});