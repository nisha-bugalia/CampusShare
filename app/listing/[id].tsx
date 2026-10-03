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
import { ItemMode } from '../../src/types/listing';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { listings } = useMarketplace();
  const listing = listings.find((item) => item.id === id);

  if (!listing) {
    return (
      <SafeAreaView style={styles.notFoundContainer}>
        <Stack.Screen options={{ title: 'Listing Not Found' }} />
        <Text style={styles.notFoundIcon}>🔍</Text>
        <Text style={styles.notFoundTitle}>Listing not found</Text>
        <Text style={styles.notFoundSubtitle}>
          This listing may have been removed or is no longer available.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const renderModeBadge = (mode: ItemMode) => {
    switch (mode) {
      case 'RENT':
        return (
          <View style={[styles.badge, styles.badgeRent]}>
            <Text style={styles.badgeRentText}>FOR RENT</Text>
          </View>
        );
      case 'SELL':
        return (
          <View style={[styles.badge, styles.badgeSell]}>
            <Text style={styles.badgeSellText}>FOR SALE</Text>
          </View>
        );
      case 'FREE':
        return (
          <View style={[styles.badge, styles.badgeFree]}>
            <Text style={styles.badgeFreeText}>FREE</Text>
          </View>
        );
    }
  };

  const handleComingSoon = (feature: string) => {
    Alert.alert(
      feature,
      'This feature is coming soon! Stay tuned.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen
        options={{
          title: listing.title,
          headerBackTitle: 'Back',
          headerTitleStyle: { fontSize: 14 },
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imageIcon}>{listing.icon}</Text>
          <Text style={styles.imageLabel}>PHOTO COMING SOON</Text>
        </View>

        <View style={styles.headerSection}>
          <View style={styles.badgeRow}>
            {renderModeBadge(listing.mode)}
            <Text style={styles.timeAgo}>Posted {listing.timeAgo}</Text>
          </View>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.price}>{listing.price}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>📍</Text>
              <Text style={styles.metaText}>{listing.hostel}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>🏷️</Text>
              <Text style={styles.metaText}>{listing.category}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{listing.description}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Posted by</Text>
          <View style={styles.ownerCard}>
            <View style={styles.ownerAvatar}>
              <Text style={styles.ownerAvatarText}>
                {listing.ownerName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.ownerInfo}>
              <Text style={styles.ownerName}>{listing.ownerName}</Text>
              <Text style={styles.ownerBranch}>{listing.ownerBranch}</Text>
              <Text style={styles.ownerHostel}>{listing.hostel}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.actionButton, styles.requestButton]}
          activeOpacity={0.8}
          onPress={() => handleComingSoon('Request Item')}
        >
          <Text style={styles.requestButtonText}>🤝  Request Item</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.chatButton]}
          activeOpacity={0.8}
          onPress={() => handleComingSoon('Chat')}
        >
          <Text style={styles.chatButtonText}>💬  Chat</Text>
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
  imagePlaceholder: {
    width: '100%',
    height: 240,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageIcon: {
    fontSize: 72,
    marginBottom: 8,
  },
  imageLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
  },
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
  badgeRent: { backgroundColor: '#EFF6FF' },
  badgeRentText: { fontSize: 11, fontWeight: '700', color: '#1D4ED8', letterSpacing: 0.5 },
  badgeSell: { backgroundColor: '#ECFDF5' },
  badgeSellText: { fontSize: 11, fontWeight: '700', color: '#047857', letterSpacing: 0.5 },
  badgeFree: { backgroundColor: '#FAF5FF' },
  badgeFreeText: { fontSize: 11, fontWeight: '700', color: '#7E22CE', letterSpacing: 0.5 },
  timeAgo: {
    fontSize: 12,
    color: '#94A3B8',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 30,
    marginBottom: 8,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.light.primary,
    marginBottom: 14,
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
  divider: {
    height: 8,
    backgroundColor: '#F1F5F9',
  },
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
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ownerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  ownerAvatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  ownerBranch: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 1,
  },
  ownerHostel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestButton: {
    backgroundColor: Colors.light.primary,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  requestButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chatButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  chatButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
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