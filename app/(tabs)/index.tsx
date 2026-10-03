import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { Spacing, BorderRadius } from '../../src/constants/layout';
import { CATEGORIES } from '../../src/constants/mockData';
import { Listing, RequestItem, ListingCategory, ItemMode } from '../../src/types/listing';
import RequestCard from '../../src/components/RequestCard';
import { useMarketplace } from '../../src/context/MarketplaceContext';

type FeedType = 'HAVE' | 'NEED';

export default function HomeScreen() {
  const router = useRouter();
  const { listings, requests } = useMarketplace();
  const [feedType, setFeedType] = useState<FeedType>('HAVE');
  const [selectedCategory, setSelectedCategory] = useState<ListingCategory>('All');

  const filteredListings =
    selectedCategory === 'All'
      ? listings
      : listings.filter((item) => item.category === selectedCategory);

  const filteredRequests =
    selectedCategory === 'All'
      ? requests
      : requests.filter((item) => item.category === selectedCategory);

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

  const renderListingCard = ({ item }: { item: Listing }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => router.push(`/listing/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        {renderModeBadge(item.mode)}
        <Text style={styles.timeAgo}>{item.timeAgo}</Text>
      </View>

      <View style={styles.cardMain}>
        <View style={styles.imagePlaceholder}>
          <Text style={styles.itemGlyph}>{item.icon}</Text>
          <Text style={styles.placeholderLabel}>PHOTO</Text>
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.itemPrice}>{item.price}</Text>
          <View style={styles.locationRow}>
            <Text style={styles.locationPin}>📍</Text>
            <Text style={styles.locationText}>{item.hostel}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.itemDescription} numberOfLines={2}>
        {item.description}
      </Text>
    </TouchableOpacity>
  );

  const renderRequestCard = ({ item }: { item: RequestItem }) => (
    <RequestCard item={item} />
  );

  return (
    <View style={styles.screen}>
      {/* 1. Segmented Toggle */}
      <View style={styles.toggleWrapper}>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, feedType === 'HAVE' && styles.toggleButtonActive]}
            onPress={() => setFeedType('HAVE')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, feedType === 'HAVE' && styles.toggleTextActive]}>
              I HAVE
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, feedType === 'NEED' && styles.toggleButtonActive]}
            onPress={() => setFeedType('NEED')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, feedType === 'NEED' && styles.toggleTextActive]}>
              I NEED
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Horizontal Category List */}
      <View style={styles.categorySection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(category)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryText,
                    isSelected && styles.categoryTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Items Feed List */}
      <View style={styles.listContainer}>
        {feedType === 'HAVE' ? (
          <FlatList
            data={filteredListings}
            keyExtractor={(item) => item.id}
            renderItem={renderListingCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyTitle}>No items available</Text>
                <Text style={styles.emptySubtitle}>
                  No listings found under "{selectedCategory}". Try switching
                  categories or selecting "All".
                </Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={filteredRequests}
            keyExtractor={(item) => item.id}
            renderItem={renderRequestCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyTitle}>No requests found</Text>
                <Text style={styles.emptySubtitle}>
                  No community requests under "{selectedCategory}". Try
                  selecting "All" to view all campus needs.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  toggleWrapper: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    backgroundColor: '#FFFFFF',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: BorderRadius.md,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
  },
  toggleButtonActive: {
    backgroundColor: Colors.light.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: Colors.light.textMuted,
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  categorySection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    paddingVertical: Spacing.sm,
  },
  categoryScrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.textMuted,
  },
  categoryTextActive: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  badgeRent: { backgroundColor: '#EFF6FF' },
  badgeRentText: { fontSize: 10, fontWeight: '700', color: '#1D4ED8', letterSpacing: 0.5 },
  badgeSell: { backgroundColor: '#ECFDF5' },
  badgeSellText: { fontSize: 10, fontWeight: '700', color: '#047857', letterSpacing: 0.5 },
  badgeFree: { backgroundColor: '#FAF5FF' },
  badgeFreeText: { fontSize: 10, fontWeight: '700', color: '#7E22CE', letterSpacing: 0.5 },
  timeAgo: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  imagePlaceholder: {
    width: 68,
    height: 68,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  itemGlyph: {
    fontSize: 26,
    marginBottom: 2,
  },
  placeholderLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.light.textMuted,
    letterSpacing: 0.5,
  },
  cardInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.primary,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationPin: {
    fontSize: 11,
    marginRight: 2,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.light.textMuted,
  },
  itemDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.light.textMuted,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: Spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.light.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});