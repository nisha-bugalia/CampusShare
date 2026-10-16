import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMarketplace } from '../../src/context/MarketplaceContext';
import { Colors } from '../../src/constants/colors';
import { Spacing, BorderRadius } from '../../src/constants/layout';
import { ItemMode, Listing, ListingCategory } from '../../src/types/listing';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { getOrCreateListingConversation } from '../../src/services/chatService';
import { blockUser, unblockUser, checkBlockStatus } from '../../src/services/safetyService';
import { BlockStatus } from '../../src/types/safety';
import ReportModal from '../../src/components/ReportModal';

const CATEGORY_ICONS: Record<string, string> = {
  Books: '📚',
  Electronics: '📱',
  Clothing: '👕',
  'Lab Equipment': '🥼',
  Sports: '⚽',
  Other: '📦',
};

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return 'Just now';
  try {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Recently';
  }
}

/** Full-width hero image that falls back to the emoji placeholder on load error */
function ListingImage({ uri, fallbackIcon }: { uri: string; fallbackIcon: string }) {
  const [error, setError] = React.useState(false);
  if (error) {
    return (
      <View style={styles.imagePlaceholder}>
        <Text style={styles.imageIcon}>{fallbackIcon}</Text>
        <Text style={styles.imageLabel}>PHOTO</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={styles.listingImage}
      resizeMode="cover"
      onError={() => setError(true)}
    />
  );
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { listings, refresh: refreshMarketplace } = useMarketplace();
  const { user } = useAuth();
  const localListing = listings.find((item) => item.id === id);

  const [dbListing, setDbListing] = useState<Listing | null>(null);
  const [isLoadingDb, setIsLoadingDb] = useState<boolean>(!localListing && !!id);
  const [isStartingChat, setIsStartingChat] = useState<boolean>(false);

  // Safety state
  const [blockStatus, setBlockStatus] = useState<BlockStatus>({
    isBlocked: false,
    isBlockedBy: false,
    isBidirectional: false,
  });
  const [reportModalConfig, setReportModalConfig] = useState<{
    visible: boolean;
    targetType: 'listing' | 'user';
    targetId: string;
    targetTitle?: string;
  }>({
    visible: false,
    targetType: 'listing',
    targetId: '',
  });
  const [safetyMenuVisible, setSafetyMenuVisible] = useState(false);

  useEffect(() => {
    if (!id) {
      setIsLoadingDb(false);
      return;
    }

    let isMounted = true;
    if (!localListing) {
      setIsLoadingDb(true);
    }

    const fetchDbListing = async () => {
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*, profiles(id, name, branch, hostel, avatar_url, verified)')
          .eq('id', id)
          .single();

        if (error || !data) {
          if (isMounted) {
            if (!localListing) setDbListing(null);
            setIsLoadingDb(false);
          }
          return;
        }

        // Retrieve owner profile: first from join, then fallback to direct query by user_id
        let ownerProfile = data.profiles as {
          id?: string;
          name?: string | null;
          branch?: string | null;
          hostel?: string | null;
          avatar_url?: string | null;
          verified?: boolean;
        } | null;

        if (!ownerProfile?.name && data.user_id) {
          const { data: directProfile } = await supabase
            .from('profiles')
            .select('id, name, branch, hostel, avatar_url, verified')
            .eq('id', data.user_id)
            .single();

          if (directProfile) {
            ownerProfile = directProfile;
          }
        }

        const modeMap: Record<string, ItemMode> = {
          rent: 'RENT',
          sell: 'SELL',
          give: 'FREE',
        };
        const mode = modeMap[data.listing_type] || 'SELL';
        const priceDisplay =
          mode === 'FREE'
            ? 'Free'
            : mode === 'RENT'
              ? `₹${data.price ?? 0} / day`
              : `₹${data.price ?? 0}`;

        const ownerName = ownerProfile?.name || localListing?.ownerName || 'Campus User';
        const ownerBranch = ownerProfile?.branch
          ? `${ownerProfile.branch}, NIT Kurukshetra`
          : localListing?.ownerBranch || 'NIT Kurukshetra';
        const ownerHostel = ownerProfile?.hostel || data.hostel;

        const mapped: Listing = {
          id: data.id,
          user_id: data.user_id,
          title: data.title,
          category: data.category as Exclude<ListingCategory, 'All'>,
          mode,
          price: priceDisplay,
          hostel: data.hostel,
          description: data.description,
          icon: CATEGORY_ICONS[data.category] || '📦',
          timeAgo: formatTimeAgo(data.created_at),
          image_url: data.image_url ?? null,
          ownerName,
          ownerBranch,
          ownerHostel,
          ownerAvatarUrl: ownerProfile?.avatar_url || localListing?.ownerAvatarUrl || null,
          ownerVerified: ownerProfile?.verified ?? localListing?.ownerVerified ?? false,
          visibilityHostels: data.visibility_hostels ?? [],
          visibility: data.visibility,
        };

        if (isMounted) {
          setDbListing(mapped);
          setIsLoadingDb(false);
        }
      } catch (err) {
        console.warn('[ListingDetail] Error fetching listing from Supabase:', err);
        if (isMounted) {
          if (!localListing) setDbListing(null);
          setIsLoadingDb(false);
        }
      }
    };

    fetchDbListing();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const listing = dbListing || localListing;

  useEffect(() => {
    if (listing?.user_id && user?.id && listing.user_id !== user.id) {
      checkBlockStatus(listing.user_id).then((status) => {
        setBlockStatus(status);
      });
    }
  }, [listing?.user_id, user?.id]);

  if (isLoadingDb) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Loading listing details...</Text>
      </SafeAreaView>
    );
  }

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

  const confirmBlockSeller = (sellerId: string, sellerName: string) => {
    Alert.alert(
      `Block ${sellerName}?`,
      'Neither of you will be able to message each other, and you will not see their listings on CampusShare.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(sellerId);
              setBlockStatus((prev) => ({
                ...prev,
                isBlocked: true,
                isBlockedBy: prev.isBlockedBy,
                isBidirectional: true,
              }));
              refreshMarketplace();
              Alert.alert('User Blocked', `${sellerName} has been blocked.`);
            } catch (e: any) {
              Alert.alert('Block Error', e?.message ?? 'Failed to block user.');
            }
          },
        },
      ]
    );
  };

  const confirmUnblockSeller = (sellerId: string, sellerName: string) => {
    Alert.alert(
      `Unblock ${sellerName}?`,
      'You will be able to message each other and view their listings again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'default',
          onPress: async () => {
            try {
              await unblockUser(sellerId);
              setBlockStatus((prev) => ({
                isBlocked: false,
                isBlockedBy: prev.isBlockedBy,
                isBidirectional: prev.isBlockedBy,
              }));
              refreshMarketplace();
              Alert.alert('User Unblocked', `${sellerName} has been unblocked.`);
            } catch (e: any) {
              Alert.alert('Unblock Error', e?.message ?? 'Failed to unblock user.');
            }
          },
        },
      ]
    );
  };

  const handleOpenSafetyMenu = () => {
    if (!listing || listing.user_id === user?.id) return;
    setSafetyMenuVisible(true);
  };

  const handleChat = async () => {
    if (isStartingChat) return;

    if (!user?.id) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to start a chat with the seller.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!listing?.user_id) {
      Alert.alert('Error', 'Listing owner information is unavailable.');
      return;
    }

    if (user.id === listing.user_id) {
      Alert.alert(
        'Your Listing',
        'This is your own listing. You cannot start a conversation with yourself.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (blockStatus.isBidirectional) {
      Alert.alert(
        'Messaging Restricted',
        blockStatus.isBlocked
          ? 'You have blocked this seller. Unblock them first to start a chat.'
          : 'You cannot message this seller due to a block relationship.'
      );
      return;
    }

    try {
      setIsStartingChat(true);
      const { conversationId, error } = await getOrCreateListingConversation(
        listing.id,
        listing.user_id,
        user.id
      );

      if (error || !conversationId) {
        Alert.alert(
          'Chat Error',
          error?.message || 'Could not open conversation. Please try again.'
        );
        return;
      }

      router.push(`/chat/${conversationId}`);
    } catch (err: any) {
      Alert.alert('Chat Error', err?.message || 'An unexpected error occurred.');
    } finally {
      setIsStartingChat(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: listing.title,
          headerBackTitle: 'Back',
          headerTitleStyle: { fontSize: 16, fontWeight: '700' },
          headerTintColor: '#0F172A',
          headerRight: () =>
            listing.user_id !== user?.id ? (
              <TouchableOpacity
                onPress={handleOpenSafetyMenu}
                style={styles.headerRightMenuButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.headerRightMenuIcon}>⋮</Text>
              </TouchableOpacity>
            ) : null,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {listing.image_url ? (
          <ListingImage uri={listing.image_url} fallbackIcon={listing.icon} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imageIcon}>{listing.icon}</Text>
            <Text style={styles.imageLabel}>PHOTO COMING SOON</Text>
          </View>
        )}

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
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Posted by</Text>
            {listing.user_id !== user?.id && (
              <TouchableOpacity
                onPress={handleOpenSafetyMenu}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.reportLink}>Report / Safety</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.ownerCard}>
            {listing.ownerAvatarUrl ? (
              <Image source={{ uri: listing.ownerAvatarUrl }} style={styles.ownerAvatarImage} />
            ) : (
              <View style={styles.ownerAvatar}>
                <Text style={styles.ownerAvatarText}>
                  {listing.ownerName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.ownerInfo}>
              <View style={styles.ownerNameRow}>
                <Text style={styles.ownerName}>{listing.ownerName}</Text>
                {listing.ownerVerified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>✓</Text>
                  </View>
                )}
              </View>
              <Text style={styles.ownerBranch}>{listing.ownerBranch}</Text>
              <Text style={styles.ownerHostel}>{listing.ownerHostel || listing.hostel}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.chatButton,
            (isStartingChat || blockStatus.isBidirectional) && { opacity: 0.6 },
          ]}
          activeOpacity={0.8}
          onPress={handleChat}
          disabled={isStartingChat || blockStatus.isBidirectional}
        >
          {isStartingChat ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.chatButtonText}>
              {blockStatus.isBidirectional ? '🚫  Seller is Blocked' : '💬  Chat with Seller'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Safety Action Sheet Modal */}
      <Modal
        visible={safetyMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSafetyMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setSafetyMenuVisible(false)}
          />
          <View style={styles.actionSheetContainer}>
            <View style={styles.actionSheetHeader}>
              <Text style={styles.actionSheetTitle}>Safety Options</Text>
              <Text style={styles.actionSheetSubtitle}>
                Report or manage this listing and seller
              </Text>
            </View>

            <View style={styles.actionSheetBody}>
              <TouchableOpacity
                style={styles.actionSheetOption}
                activeOpacity={0.7}
                onPress={() => {
                  setSafetyMenuVisible(false);
                  setReportModalConfig({
                    visible: true,
                    targetType: 'listing',
                    targetId: listing.id,
                    targetTitle: listing.title,
                  });
                }}
              >
                <Text style={styles.actionSheetOptionIcon}>🚩</Text>
                <Text style={styles.actionSheetOptionText}>Report Listing</Text>
              </TouchableOpacity>

              <View style={styles.actionSheetDivider} />

              <TouchableOpacity
                style={styles.actionSheetOption}
                activeOpacity={0.7}
                onPress={() => {
                  setSafetyMenuVisible(false);
                  setReportModalConfig({
                    visible: true,
                    targetType: 'user',
                    targetId: listing.user_id,
                    targetTitle: listing.ownerName || 'Seller',
                  });
                }}
              >
                <Text style={styles.actionSheetOptionIcon}>👤</Text>
                <Text style={styles.actionSheetOptionText}>
                  Report Seller ({listing.ownerName || 'Seller'})
                </Text>
              </TouchableOpacity>

              <View style={styles.actionSheetDivider} />

              <TouchableOpacity
                style={styles.actionSheetOption}
                activeOpacity={0.7}
                onPress={() => {
                  setSafetyMenuVisible(false);
                  if (blockStatus.isBlocked) {
                    confirmUnblockSeller(listing.user_id, listing.ownerName || 'Seller');
                  } else {
                    confirmBlockSeller(listing.user_id, listing.ownerName || 'Seller');
                  }
                }}
              >
                <Text style={styles.actionSheetOptionIcon}>🚫</Text>
                <Text
                  style={[
                    styles.actionSheetOptionText,
                    !blockStatus.isBlocked && styles.actionSheetDestructiveText,
                  ]}
                >
                  {blockStatus.isBlocked
                    ? `Unblock Seller (${listing.ownerName || 'Seller'})`
                    : `Block Seller (${listing.ownerName || 'Seller'})`}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.actionSheetCancelButton}
              activeOpacity={0.8}
              onPress={() => setSafetyMenuVisible(false)}
            >
              <Text style={styles.actionSheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Safety Report Modal */}
      <ReportModal
        visible={reportModalConfig.visible}
        onClose={() => setReportModalConfig((prev) => ({ ...prev, visible: false }))}
        targetType={reportModalConfig.targetType}
        targetId={reportModalConfig.targetId}
        targetLabel={reportModalConfig.targetTitle}
      />
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
  listingImage: {
    width: '100%',
    height: 240,
    backgroundColor: '#E2E8F0',
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
  ownerAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
    backgroundColor: '#E2E8F0',
  },
  ownerAvatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ownerInfo: {
    flex: 1,
  },
  ownerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  ownerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
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
  chatButton: {
    backgroundColor: Colors.light.primary,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  chatButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
    fontWeight: '500',
  },
  headerRightMenuButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerRightMenuIcon: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  reportLink: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingTop: 16,
    paddingBottom: 32,
  },
  actionSheetHeader: {
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  actionSheetSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  actionSheetBody: {
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 10,
  },
  actionSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  actionSheetOptionIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  actionSheetOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  actionSheetDestructiveText: {
    color: '#EF4444',
  },
  actionSheetDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  actionSheetCancelButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  actionSheetCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
});
