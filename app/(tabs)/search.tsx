import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { Spacing, BorderRadius } from '../../src/constants/layout';
import { Listing, RequestItem, ListingCategory } from '../../src/types/listing';
import { NIT_HOSTELS, NITHostel } from '../../src/constants/campus';
import { useMarketplace } from '../../src/context/MarketplaceContext';
import ListingCard from '../../src/components/ListingCard';
import RequestCard from '../../src/components/RequestCard';

// ─── Filter Types & Options ──────────────────────────────────────────────────

type FeedFilterType = 'ALL' | 'HAVE' | 'NEED';
type CategoryFilterType = ListingCategory;
type HostelFilterType = 'All' | NITHostel;
type ModeFilterType = 'All' | 'Rent' | 'Sell' | 'Give Away';

const FEED_OPTIONS: { label: string; value: FeedFilterType }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'I HAVE', value: 'HAVE' },
  { label: 'I NEED', value: 'NEED' },
];

const CATEGORY_OPTIONS: CategoryFilterType[] = [
  'All',
  'Books',
  'Electronics',
  'Clothing',
  'Lab Equipment',
  'Sports',
  'Other',
];

/** Full hostel list drawn from the shared campus constant — single source of truth. */
const HOSTEL_OPTIONS: HostelFilterType[] = ['All', ...NIT_HOSTELS];

const MODE_OPTIONS: { label: ModeFilterType; value: ModeFilterType }[] = [
  { label: 'All', value: 'All' },
  { label: 'Rent', value: 'Rent' },
  { label: 'Sell', value: 'Sell' },
  { label: 'Give Away', value: 'Give Away' },
];

const CATEGORY_ICONS: Record<CategoryFilterType, string> = {
  All: '🏷️',
  Books: '📚',
  Electronics: '📱',
  Clothing: '👕',
  'Lab Equipment': '🥼',
  Sports: '⚽',
  Other: '📦',
};

const MODE_ICONS: Record<ModeFilterType, string> = {
  All: '✨',
  Rent: '🤝',
  Sell: '🏷️',
  'Give Away': '🎁',
};

// ─── Search Result Item Type ─────────────────────────────────────────────────

type SearchResultItem =
  | { type: 'HAVE'; data: Listing }
  | { type: 'NEED'; data: RequestItem };

export default function SearchScreen() {
  const { listings, requests, refresh } = useMarketplace();

  // Re-fetch every time the Search tab comes into focus so latest listings appear
  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [refresh])
  );

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [feedFilter, setFeedFilter] = useState<FeedFilterType>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilterType>('All');
  const [selectedHostel, setSelectedHostel] = useState<HostelFilterType>('All');
  const [selectedMode, setSelectedMode] = useState<ModeFilterType>('All');

  // Check if any filter is active
  const isFiltered =
    searchQuery.trim().length > 0 ||
    feedFilter !== 'ALL' ||
    selectedCategory !== 'All' ||
    selectedHostel !== 'All' ||
    selectedMode !== 'All';

  // Count active filters (excluding feedFilter from the badge count or including as helpful)
  const activeFilterCount =
    (searchQuery.trim().length > 0 ? 1 : 0) +
    (feedFilter !== 'ALL' ? 1 : 0) +
    (selectedCategory !== 'All' ? 1 : 0) +
    (selectedHostel !== 'All' ? 1 : 0) +
    (selectedMode !== 'All' && feedFilter !== 'NEED' ? 1 : 0);

  const handleResetFilters = () => {
    setSearchQuery('');
    setFeedFilter('ALL');
    setSelectedCategory('All');
    setSelectedHostel('All');
    setSelectedMode('All');
  };

  // Filter listings
  const filteredListings = useMemo(() => {
    if (feedFilter === 'NEED') return [];

    const query = searchQuery.trim().toLowerCase();

    return listings.filter((item) => {
      // 1. Search by item title
      if (query && !item.title.toLowerCase().includes(query)) {
        return false;
      }

      // 2. Category filter
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }

      // 3. Hostel filter
      if (selectedHostel !== 'All' && item.hostel !== selectedHostel) {
        return false;
      }

      // 4. Mode filter (All, Rent, Sell, Give Away)
      if (selectedMode !== 'All') {
        if (selectedMode === 'Rent' && item.mode !== 'RENT') return false;
        if (selectedMode === 'Sell' && item.mode !== 'SELL') return false;
        if (selectedMode === 'Give Away' && item.mode !== 'FREE') return false;
      }

      return true;
    });
  }, [listings, feedFilter, searchQuery, selectedCategory, selectedHostel, selectedMode]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    if (feedFilter === 'HAVE') return [];

    // Requests do not have a mode (Rent/Sell/Give Away). If mode filter is active, exclude requests.
    if (selectedMode !== 'All') {
      return [];
    }

    const query = searchQuery.trim().toLowerCase();

    return requests.filter((item) => {
      // 1. Search by item title
      if (query && !item.title.toLowerCase().includes(query)) {
        return false;
      }

      // 2. Category filter
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }

      // 3. Hostel filter
      if (selectedHostel !== 'All' && item.hostel !== selectedHostel) {
        return false;
      }

      return true;
    });
  }, [requests, feedFilter, searchQuery, selectedCategory, selectedHostel, selectedMode]);

  // Unified search results
  const searchResults: SearchResultItem[] = useMemo(() => {
    const listingItems: SearchResultItem[] = filteredListings.map((item) => ({
      type: 'HAVE',
      data: item,
    }));
    const requestItems: SearchResultItem[] = filteredRequests.map((item) => ({
      type: 'NEED',
      data: item,
    }));

    return [...listingItems, ...requestItems];
  }, [filteredListings, filteredRequests]);

  // Render individual listing or request card
  const renderItem = ({ item }: { item: SearchResultItem }) => {
    if (item.type === 'HAVE') {
      return <ListingCard item={item.data} />;
    }
    return <RequestCard item={item.data} />;
  };

  // Determine empty state message based on type filter
  const getEmptyStateTitle = () => {
    if (feedFilter === 'NEED') {
      return 'No requests found';
    }
    return 'No items found';
  };

  const getEmptyStateSubtitle = () => {
    if (searchQuery.trim().length > 0) {
      return `No matches found for "${searchQuery}". Check your spelling or try resetting your filters.`;
    }
    return 'No matching campus posts found. Try changing your filter criteria or reset to view all.';
  };

  return (
    <View style={styles.screen}>
      {/* ── Fixed Search & Top Controls ── */}
      <View style={styles.topContainer}>
        {/* Search Bar */}
        <View style={styles.searchBarWrapper}>
          <View style={styles.searchInputContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by item name or title..."
              placeholderTextColor={Colors.light.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Text style={styles.clearSearchIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 1. I HAVE / I NEED Filter Toggle */}
        <View style={styles.typeToggleWrapper}>
          <View style={styles.typeToggleContainer}>
            {FEED_OPTIONS.map((opt) => {
              const isActive = feedFilter === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.typeToggleButton, isActive && styles.typeToggleButtonActive]}
                  onPress={() => setFeedFilter(opt.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.typeToggleText, isActive && styles.typeToggleTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Filter Rows (Category, Hostel, Mode) ── */}
        <View style={styles.filterSection}>
          {/* 2. Category Filter Row */}
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Category:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScrollContent}
            >
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setSelectedCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.chipIcon}>{CATEGORY_ICONS[cat]}</Text>
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 3. Hostel Filter Row */}
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Hostel:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScrollContent}
            >
              {HOSTEL_OPTIONS.map((h) => {
                const isSelected = selectedHostel === h;
                return (
                  <TouchableOpacity
                    key={h}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setSelectedHostel(h)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.chipIcon}>🏢</Text>
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {h}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 4. Mode Filter Row (Shown for I HAVE listings) */}
          {feedFilter !== 'NEED' && (
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Mode:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScrollContent}
              >
                {MODE_OPTIONS.map((m) => {
                  const isSelected = selectedMode === m.value;
                  return (
                    <TouchableOpacity
                      key={m.value}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => setSelectedMode(m.value)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.chipIcon}>{MODE_ICONS[m.value]}</Text>
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* ── Status Bar / Result Count & Reset ── */}
        <View style={styles.statusBar}>
          <Text style={styles.resultCountText}>
            {searchResults.length === 1
              ? '1 result found'
              : `${searchResults.length} results found`}
            {feedFilter === 'ALL' && searchResults.length > 0
              ? ` (${filteredListings.length} have • ${filteredRequests.length} need)`
              : ''}
          </Text>

          {isFiltered && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleResetFilters}
              activeOpacity={0.7}
            >
              <Text style={styles.resetButtonText}>Reset Filters ↺</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Results List ── */}
      <FlatList
        data={searchResults}
        keyExtractor={(item) => `${item.type}-${item.data.id}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>{getEmptyStateTitle()}</Text>
            <Text style={styles.emptySubtitle}>{getEmptyStateSubtitle()}</Text>
            {isFiltered && (
              <TouchableOpacity
                style={styles.emptyResetButton}
                onPress={handleResetFilters}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyResetButtonText}>Reset All Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  topContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    paddingTop: Spacing.sm,
  },
  searchBarWrapper: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    paddingVertical: 0,
  },
  clearSearchButton: {
    padding: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
  },
  clearSearchIcon: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
  },
  typeToggleWrapper: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  typeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: BorderRadius.md,
    padding: 3,
  },
  typeToggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
  },
  typeToggleButtonActive: {
    backgroundColor: Colors.light.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  typeToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.textMuted,
    letterSpacing: 0.3,
  },
  typeToggleTextActive: {
    color: '#FFFFFF',
  },
  filterSection: {
    paddingVertical: 4,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingLeft: Spacing.md,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.textMuted,
    width: 64,
  },
  chipsScrollContent: {
    paddingRight: Spacing.md,
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 4,
  },
  chipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  chipIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.light.textMuted,
  },
  chipTextActive: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
  },
  resultCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  resetButton: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.light.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyResetButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyResetButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
