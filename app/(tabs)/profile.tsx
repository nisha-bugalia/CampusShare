import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { Spacing, BorderRadius } from '../../src/constants/layout';
import { useAuth } from '../../src/context/AuthContext';
import { useProfile } from '../../src/hooks/useProfile';
import { useMarketplace } from '../../src/context/MarketplaceContext';
import ListingCard from '../../src/components/ListingCard';
import RequestCard from '../../src/components/RequestCard';

type TabType = 'HAVE' | 'NEED';

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { listings, requests, isLoading: feedLoading, refresh, deleteListing, deleteRequest } = useMarketplace();
  const [activeTab, setActiveTab] = useState<TabType>('HAVE');

  // Re-fetch feed whenever Profile tab is active so new posts appear immediately
  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Filter to only the authenticated user's own posts
  const myListings = listings.filter((item) => item.user_id === user?.id);
  const myRequests = requests.filter((item) => item.user_id === user?.id);

  // Derive display values from the real profile (fallback to auth metadata)
  const displayName =
    profile?.name ||
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    'Campus User';

  const displayBranch = profile?.branch ?? '—';
  const displayHostel = profile?.hostel ?? '—';
  const isVerified = profile?.verified ?? false;

  const handleEditListing = (id: string) => {
    router.push(`/edit/have?id=${id}`);
  };

  const handleDeleteListing = (id: string, imageUrl?: string | null) => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this item? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteListing(id, imageUrl);
            if (error) {
              Alert.alert('Delete Failed', error.message);
            }
          },
        },
      ]
    );
  };

  const handleEditRequest = (id: string) => {
    router.push(`/edit/need?id=${id}`);
  };

  const handleDeleteRequest = (id: string) => {
    Alert.alert(
      'Delete Request',
      'Are you sure you want to delete this request? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteRequest(id);
            if (error) {
              Alert.alert('Delete Failed', error.message);
            }
          },
        },
      ]
    );
  };

  const handleActionPlaceholder = (actionName: string) => {
    Alert.alert(
      actionName,
      `${actionName} functionality will be available in an upcoming update.`,
      [{ text: 'OK' }]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your CampusShare account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            const { error } = await signOut();
            if (error) {
              Alert.alert('Log Out Failed', error.message);
            }
          },
        },
      ]
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* ── 1. Profile Header Card ── */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            {profileLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          {isVerified && (
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarBadgeIcon}>✓</Text>
            </View>
          )}
        </View>

        <Text style={styles.userName}>{displayName}</Text>

        {isVerified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedCheck}>✓</Text>
            <Text style={styles.verifiedText}>Verified Student</Text>
          </View>
        )}

        {user?.email ? (
          <Text style={styles.userEmailText}>{user.email}</Text>
        ) : null}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>💻</Text>
            <Text style={styles.metaText}>{displayBranch}</Text>
          </View>
          <Text style={styles.metaDivider}>•</Text>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>📍</Text>
            <Text style={styles.metaText}>{displayHostel}</Text>
          </View>
        </View>
      </View>

      {/* ── 2. Statistics Section ── */}
      <View style={styles.statsContainer}>
        <TouchableOpacity
          style={[styles.statTile, activeTab === 'HAVE' && styles.statTileActive]}
          onPress={() => setActiveTab('HAVE')}
          activeOpacity={0.75}
        >
          <Text style={styles.statNumber}>
            {feedLoading ? '…' : myListings.length}
          </Text>
          <Text style={styles.statLabel}>Active I HAVE</Text>
          <Text style={styles.statSub}>Items for rent/sale</Text>
        </TouchableOpacity>

        <View style={styles.statDivider} />

        <TouchableOpacity
          style={[styles.statTile, activeTab === 'NEED' && styles.statTileActive]}
          onPress={() => setActiveTab('NEED')}
          activeOpacity={0.75}
        >
          <Text style={styles.statNumber}>
            {feedLoading ? '…' : myRequests.length}
          </Text>
          <Text style={styles.statLabel}>Active I NEED</Text>
          <Text style={styles.statSub}>Community requests</Text>
        </TouchableOpacity>
      </View>

      {/* ── 3. "My Posts" Header & Segmented Toggle ── */}
      <View style={styles.postsHeaderContainer}>
        <Text style={styles.sectionTitle}>My Posts</Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, activeTab === 'HAVE' && styles.toggleButtonActive]}
            onPress={() => setActiveTab('HAVE')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, activeTab === 'HAVE' && styles.toggleTextActive]}>
              I HAVE ({feedLoading ? '…' : myListings.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, activeTab === 'NEED' && styles.toggleButtonActive]}
            onPress={() => setActiveTab('NEED')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, activeTab === 'NEED' && styles.toggleTextActive]}>
              I NEED ({feedLoading ? '…' : myRequests.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footerContainer}>
      {/* ── Account & Settings Section ── */}
      <Text style={styles.sectionTitle}>Account & Settings</Text>
      <View style={styles.actionsCard}>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => handleActionPlaceholder('Edit Profile')}
          activeOpacity={0.7}
        >
          <View style={styles.actionRowLeft}>
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIcon}>✏️</Text>
            </View>
            <Text style={styles.actionRowText}>Edit Profile</Text>
          </View>
          <Text style={styles.actionChevron}>›</Text>
        </TouchableOpacity>

        <View style={styles.actionDivider} />

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => handleActionPlaceholder('Settings')}
          activeOpacity={0.7}
        >
          <View style={styles.actionRowLeft}>
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIcon}>⚙️</Text>
            </View>
            <Text style={styles.actionRowText}>Settings</Text>
          </View>
          <Text style={styles.actionChevron}>›</Text>
        </TouchableOpacity>

        <View style={styles.actionDivider} />

        <TouchableOpacity
          style={styles.actionRow}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={styles.actionRowLeft}>
            <View style={[styles.actionIconContainer, { backgroundColor: '#FEF2F2' }]}>
              <Text style={styles.actionIcon}>🚪</Text>
            </View>
            <Text style={[styles.actionRowText, { color: Colors.light.error }]}>Log Out</Text>
          </View>
          <Text style={[styles.actionChevron, { color: Colors.light.error }]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: Spacing.xl }} />
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>{activeTab === 'HAVE' ? '📦' : '🔍'}</Text>
      <Text style={styles.emptyTitle}>
        {activeTab === 'HAVE' ? 'No listings posted yet' : 'No requests posted yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'HAVE'
          ? 'Items you put up for rent, sale, or give away will appear here.'
          : "Requests you create for items you're looking for will appear here."}
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => router.push('/(tabs)/create')}
        activeOpacity={0.8}
      >
        <Text style={styles.emptyButtonText}>
          {activeTab === 'HAVE' ? '+ Post an Item' : '+ Post a Request'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.screen}>
      {activeTab === 'HAVE' ? (
        <FlatList
          data={myListings}
          keyExtractor={(item) => `my-have-${item.id}`}
          renderItem={({ item }) => (
            <ListingCard
              item={item}
              onEdit={() => handleEditListing(item.id)}
              onDelete={() => handleDeleteListing(item.id, item.image_url)}
            />
          )}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={feedLoading ? null : renderEmptyState}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={myRequests}
          keyExtractor={(item) => `my-need-${item.id}`}
          renderItem={({ item }) => (
            <RequestCard
              item={item}
              onEdit={() => handleEditRequest(item.id)}
              onDelete={() => handleDeleteRequest(item.id)}
            />
          )}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={feedLoading ? null : renderEmptyState}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  headerContainer: {
    marginBottom: Spacing.sm,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: Spacing.md,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#DBEAFE',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#10B981',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarBadgeIcon: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: Spacing.sm,
  },
  verifiedCheck: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '800',
    marginRight: 4,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  userEmailText: {
    fontSize: 12,
    color: Colors.light.primary,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.textMuted,
  },
  metaDivider: {
    marginHorizontal: 8,
    color: Colors.light.textMuted,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: Spacing.md,
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  statTileActive: {
    backgroundColor: '#F8FAFC',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.light.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 2,
  },
  statSub: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 4,
  },
  postsHeaderContainer: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.sm,
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
    letterSpacing: 0.3,
    color: Colors.light.textMuted,
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginVertical: Spacing.sm,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: Spacing.sm,
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
    marginBottom: Spacing.md,
  },
  emptyButton: {
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
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  footerContainer: {
    marginTop: Spacing.lg,
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionIcon: {
    fontSize: 15,
  },
  actionRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  actionChevron: {
    fontSize: 20,
    color: '#94A3B8',
    fontWeight: '300',
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 56,
  },
});
