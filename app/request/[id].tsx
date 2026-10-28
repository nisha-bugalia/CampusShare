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
import { RequestItem, ListingCategory } from '../../src/types/listing';
import { DbRequestStatus } from '../../src/types/databaseRequest';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { getOrCreateRequestConversation } from '../../src/services/chatService';
import { updateRequestStatus } from '../../src/services/requestService';
import {
  formatTimeAgo,
  formatBudget,
  getCategoryIcon,
} from '../../src/utils/adapters';
import { blockUser, unblockUser, checkBlockStatus } from '../../src/services/safetyService';
import { BlockStatus } from '../../src/types/safety';
import ReportModal from '../../src/components/ReportModal';
import StatusConfirmModal from '../../src/components/StatusConfirmModal';

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { requests, refresh: refreshMarketplace, deleteRequest } = useMarketplace();
  const { user } = useAuth();
  const localRequest = requests.find((item) => item.id === id);

  const [dbRequest, setDbRequest] = useState<RequestItem | null>(null);
  const [isLoadingDb, setIsLoadingDb] = useState<boolean>(!localRequest && !!id);
  const [isStartingChat, setIsStartingChat] = useState<boolean>(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Status confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    confirmColor?: string;
    icon?: string;
    targetStatus: DbRequestStatus;
  }>({
    visible: false,
    title: '',
    message: '',
    confirmLabel: '',
    targetStatus: 'active',
  });

  // Safety state
  const [blockStatus, setBlockStatus] = useState<BlockStatus>({
    isBlocked: false,
    isBlockedBy: false,
    isBidirectional: false,
  });
  const [reportModalConfig, setReportModalConfig] = useState<{
    visible: boolean;
    targetType: 'request' | 'user';
    targetId: string;
    targetLabel?: string;
  }>({
    visible: false,
    targetType: 'request',
    targetId: '',
  });
  const [safetyMenuVisible, setSafetyMenuVisible] = useState(false);

  useEffect(() => {
    if (!id) {
      setIsLoadingDb(false);
      return;
    }

    let isMounted = true;
    if (!localRequest) {
      setIsLoadingDb(true);
    }

    const fetchDbRequest = async () => {
      try {
        const { data, error } = await supabase
          .from('requests')
          .select('*, profiles(id, name, branch, hostel, avatar_url, verified)')
          .eq('id', id)
          .single();

        if (error || !data) {
          if (isMounted) {
            if (!localRequest) setDbRequest(null);
            setIsLoadingDb(false);
          }
          return;
        }

        // Retrieve requester profile: first from join, then fallback to direct query by user_id
        let requesterProfile = data.profiles as {
          id?: string;
          name?: string | null;
          branch?: string | null;
          hostel?: string | null;
          avatar_url?: string | null;
          verified?: boolean;
        } | null;

        if (!requesterProfile?.name && data.user_id) {
          const { data: directProfile } = await supabase
            .from('profiles')
            .select('id, name, branch, hostel, avatar_url, verified')
            .eq('id', data.user_id)
            .single();

          if (directProfile) {
            requesterProfile = directProfile;
          }
        }

        const requesterName =
          requesterProfile?.name || localRequest?.requesterName || 'Campus User';
        const requesterBranch = requesterProfile?.branch
          ? `${requesterProfile.branch}, NIT Kurukshetra`
          : localRequest?.requesterBranch || 'NIT Kurukshetra';
        const requesterHostel = requesterProfile?.hostel || data.hostel;

        const mapped: RequestItem = {
          id: data.id,
          user_id: data.user_id,
          title: data.title,
          category: data.category as Exclude<ListingCategory, 'All'>,
          urgency: 'Needed',
          budget: formatBudget(data.budget),
          rawBudget: data.budget,
          hostel: data.hostel,
          description: data.description,
          icon: getCategoryIcon(data.category),
          timeAgo: formatTimeAgo(data.created_at),
          status: (data.status as DbRequestStatus) || 'active',
          requesterName,
          requesterBranch,
          requesterHostel,
          requesterAvatarUrl:
            requesterProfile?.avatar_url || localRequest?.requesterAvatarUrl || null,
          requesterVerified:
            requesterProfile?.verified ?? localRequest?.requesterVerified ?? false,
          visibilityHostels: data.visibility_hostels ?? [],
          visibility: data.visibility,
        };

        if (isMounted) {
          setDbRequest(mapped);
          setIsLoadingDb(false);
        }
      } catch (err) {
        console.warn('[RequestDetail] Error fetching request from Supabase:', err);
        if (isMounted) {
          if (!localRequest) setDbRequest(null);
          setIsLoadingDb(false);
        }
      }
    };

    fetchDbRequest();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const request = dbRequest || localRequest;

  // Block status check
  useEffect(() => {
    if (request?.user_id && user?.id && request.user_id !== user.id) {
      checkBlockStatus(request.user_id).then((status) => {
        setBlockStatus(status);
      });
    }
  }, [request?.user_id, user?.id]);

  const confirmBlockRequester = (requesterId: string, requesterName: string) => {
    Alert.alert(
      `Block ${requesterName}?`,
      'Neither of you will be able to message each other, and you will not see their posts on CampusShare.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(requesterId);
              setBlockStatus((prev) => ({
                ...prev,
                isBlocked: true,
                isBlockedBy: prev.isBlockedBy,
                isBidirectional: true,
              }));
              refreshMarketplace();
              Alert.alert('User Blocked', `${requesterName} has been blocked.`);
            } catch (e: any) {
              Alert.alert('Block Error', e?.message ?? 'Failed to block user.');
            }
          },
        },
      ]
    );
  };

  const confirmUnblockRequester = (requesterId: string, requesterName: string) => {
    Alert.alert(
      `Unblock ${requesterName}?`,
      'You will be able to message each other and view their posts again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'default',
          onPress: async () => {
            try {
              await unblockUser(requesterId);
              setBlockStatus((prev) => ({
                isBlocked: false,
                isBlockedBy: prev.isBlockedBy,
                isBidirectional: prev.isBlockedBy,
              }));
              refreshMarketplace();
              Alert.alert('Unblocked', `${requesterName} has been unblocked.`);
            } catch (e: any) {
              Alert.alert('Unblock Error', e?.message ?? 'Failed to unblock.');
            }
          },
        },
      ]
    );
  };

  const handleOpenSafetyMenu = () => {
    if (!request || request.user_id === user?.id) return;
    setSafetyMenuVisible(true);
  };

  if (isLoadingDb) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Loading request details...</Text>
      </SafeAreaView>
    );
  }

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

  const isCreator = !!(user?.id && request?.user_id && user.id === request.user_id);

  const handlePromptMarkFulfilled = () => {
    setConfirmModal({
      visible: true,
      title: 'Mark this request as fulfilled?',
      message:
        'This will remove the request from the active feed. It will remain in your history.',
      confirmLabel: 'Mark as Fulfilled',
      confirmColor: '#16A34A',
      icon: '✅',
      targetStatus: 'fulfilled',
    });
  };

  const handlePromptCancelRequest = () => {
    setConfirmModal({
      visible: true,
      title: 'Cancel this request?',
      message: 'This will cancel the request and remove it from the active feed.',
      confirmLabel: 'Cancel Request',
      confirmColor: '#DC2626',
      icon: '🚫',
      targetStatus: 'cancelled',
    });
  };

  const handleConfirmStatusChange = async () => {
    if (!request?.id || isUpdatingStatus) return;
    try {
      setIsUpdatingStatus(true);
      const { data: updated, error } = await updateRequestStatus(
        request.id,
        confirmModal.targetStatus
      );

      if (error || !updated) {
        Alert.alert('Status Error', error?.message || 'Failed to update request status.');
        return;
      }

      setDbRequest(updated);
      setConfirmModal((prev) => ({ ...prev, visible: false }));
      await refreshMarketplace();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'An unexpected error occurred.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteRequest = () => {
    if (!request?.id) return;
    Alert.alert(
      'Delete Request',
      'Are you sure you want to permanently delete this request? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteRequest(request.id);
            if (error) {
              Alert.alert('Delete Failed', error.message);
            } else {
              await refreshMarketplace();
              router.back();
            }
          },
        },
      ]
    );
  };

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

  const renderStatusBadge = () => {
    if (!request) return null;
    const isOwnerRequest = user?.id === request.user_id;

    if (request.status === 'fulfilled') {
      return (
        <View style={[styles.badge, styles.badgeStatusFulfilled]}>
          <Text style={styles.badgeStatusFulfilledText}>✅ FULFILLED</Text>
        </View>
      );
    }
    if (request.status === 'cancelled') {
      return (
        <View style={[styles.badge, styles.badgeStatusCancelled]}>
          <Text style={styles.badgeStatusCancelledText}>⚪ CANCELLED</Text>
        </View>
      );
    }
    if (isOwnerRequest && request.status === 'active') {
      return (
        <View style={[styles.badge, styles.badgeStatusActive]}>
          <Text style={styles.badgeStatusActiveText}>🟢 ACTIVE</Text>
        </View>
      );
    }
    return null;
  };

  const renderInactiveStatusBanner = () => {
    if (!request || request.status === 'active') return null;

    let bannerBg = '#ECFDF5';
    let bannerBorder = '#A7F3D0';
    let bannerTitle = 'Fulfilled — Request Completed';
    let bannerDesc = 'The requester has found what they needed.';
    let bannerIcon = '✅';

    if (request.status === 'cancelled') {
      bannerBg = '#F8FAFC';
      bannerBorder = '#E2E8F0';
      bannerTitle = 'Request Cancelled';
      bannerDesc = 'This request was cancelled by the creator.';
      bannerIcon = '⚪';
    }

    return (
      <View style={[styles.inactiveBanner, { backgroundColor: bannerBg, borderColor: bannerBorder }]}>
        <Text style={styles.inactiveBannerIcon}>{bannerIcon}</Text>
        <View style={styles.inactiveBannerTextCol}>
          <Text style={styles.inactiveBannerTitle}>{bannerTitle}</Text>
          <Text style={styles.inactiveBannerDesc}>{bannerDesc}</Text>
        </View>
      </View>
    );
  };

  const handleChat = async () => {
    if (isStartingChat) return;

    if (!user?.id) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to start a chat with the requester.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!request?.user_id) {
      Alert.alert('Error', 'Requester information is unavailable.');
      return;
    }

    if (user.id === request.user_id) {
      Alert.alert(
        'Your Request',
        'This is your own request. You cannot start a conversation with yourself.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setIsStartingChat(true);
      const { conversationId, error } = await getOrCreateRequestConversation(
        request.id,
        request.user_id,
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
          title: 'Request Detail',
          headerBackTitle: 'Back',
          headerTitleStyle: { fontSize: 16, fontWeight: '700' },
          headerTintColor: '#0F172A',
          headerRight: () =>
            request && request.user_id !== user?.id ? (
              <TouchableOpacity
                onPress={handleOpenSafetyMenu}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ paddingHorizontal: 12 }}
              >
                <Text style={{ fontSize: 22, fontWeight: '700', color: '#0F172A' }}>⋮</Text>
              </TouchableOpacity>
            ) : null,
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

        {renderInactiveStatusBanner()}

        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.badgeRow}>
            <View style={styles.badgeGroup}>
              {renderUrgencyBadge()}
              {renderStatusBadge()}
            </View>
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
              <Text style={styles.metaText}>{request.requesterHostel || request.hostel}</Text>
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
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Requested by</Text>
            {request && request.user_id !== user?.id && (
              <TouchableOpacity
                onPress={handleOpenSafetyMenu}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.reportLink}>Report / Safety</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.requesterCard}>
            {request.requesterAvatarUrl ? (
              <Image
                source={{ uri: request.requesterAvatarUrl }}
                style={styles.requesterAvatarImage}
              />
            ) : (
              <View style={styles.requesterAvatar}>
                <Text style={styles.requesterAvatarText}>
                  {request.requesterName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.requesterInfo}>
              <View style={styles.requesterNameRow}>
                <Text style={styles.requesterName}>{request.requesterName}</Text>
                {request.requesterVerified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>✓</Text>
                  </View>
                )}
              </View>
              <Text style={styles.requesterBranch}>{request.requesterBranch}</Text>
              <Text style={styles.requesterHostel}>
                {request.requesterHostel || request.hostel}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Action Bar */}
      {isCreator ? (
        <View style={styles.ownerBottomBarContainer}>
          {/* Primary Lifecycle CTA */}
          {request.status === 'active' && (
            <TouchableOpacity
              style={[styles.ownerPrimaryButton, styles.primaryFulfilledButton]}
              onPress={handlePromptMarkFulfilled}
              activeOpacity={0.8}
              disabled={isUpdatingStatus}
            >
              <Text style={styles.primaryButtonText}>✅  Mark as Fulfilled</Text>
            </TouchableOpacity>
          )}

          {/* Secondary Controls: Edit, Cancel, Delete */}
          <View style={styles.ownerSecondaryRow}>
            {request.status === 'active' && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push(`/edit/need?id=${request.id}`)}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>✏️ Edit</Text>
              </TouchableOpacity>
            )}

            {request.status === 'active' && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handlePromptCancelRequest}
                activeOpacity={0.8}
                disabled={isUpdatingStatus}
              >
                <Text style={[styles.secondaryButtonText, { color: '#DC2626' }]}>🚫 Cancel</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleDeleteRequest}
              activeOpacity={0.8}
              disabled={isUpdatingStatus}
            >
              <Text style={[styles.secondaryButtonText, { color: '#DC2626' }]}>🗑️ Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.bottomBar}>
          {request.status === 'active' ? (
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
                  {blockStatus.isBidirectional ? '🚫  Requester is Blocked' : '💬  Chat with Requester'}
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={[styles.actionButton, styles.disabledButton]}>
              <Text style={styles.disabledButtonText}>
                {request.status === 'fulfilled'
                  ? '🔒  Request Fulfilled'
                  : '🔒  Request Cancelled'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Status Confirmation Modal */}
      <StatusConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        confirmColor={confirmModal.confirmColor}
        icon={confirmModal.icon}
        isLoading={isUpdatingStatus}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
      />

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
                Report or manage this request and requester
              </Text>
            </View>

            <View style={styles.actionSheetBody}>
              {/* Report the request itself */}
              <TouchableOpacity
                style={styles.actionSheetOption}
                activeOpacity={0.7}
                onPress={() => {
                  setSafetyMenuVisible(false);
                  setReportModalConfig({
                    visible: true,
                    targetType: 'request',
                    targetId: request.id,
                    targetLabel: request.title,
                  });
                }}
              >
                <Text style={styles.actionSheetOptionIcon}>🚩</Text>
                <Text style={styles.actionSheetOptionText}>Report Request</Text>
              </TouchableOpacity>

              <View style={styles.actionSheetDivider} />

              {/* Report the requester as a user */}
              <TouchableOpacity
                style={styles.actionSheetOption}
                activeOpacity={0.7}
                onPress={() => {
                  setSafetyMenuVisible(false);
                  setReportModalConfig({
                    visible: true,
                    targetType: 'user',
                    targetId: request.user_id,
                    targetLabel: request.requesterName || 'Requester',
                  });
                }}
              >
                <Text style={styles.actionSheetOptionIcon}>👤</Text>
                <Text style={styles.actionSheetOptionText}>
                  Report Requester ({request.requesterName || 'Requester'})
                </Text>
              </TouchableOpacity>

              <View style={styles.actionSheetDivider} />

              {/* Block / Unblock the requester */}
              <TouchableOpacity
                style={styles.actionSheetOption}
                activeOpacity={0.7}
                onPress={() => {
                  setSafetyMenuVisible(false);
                  if (blockStatus.isBlocked) {
                    confirmUnblockRequester(
                      request.user_id,
                      request.requesterName || 'Requester'
                    );
                  } else {
                    confirmBlockRequester(
                      request.user_id,
                      request.requesterName || 'Requester'
                    );
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
                    ? `Unblock Requester (${request.requesterName || 'Requester'})`
                    : `Block Requester (${request.requesterName || 'Requester'})`}
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
        targetLabel={reportModalConfig.targetLabel}
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

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
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
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  badgeStatusFulfilled: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
  badgeStatusFulfilledText: { fontSize: 10, fontWeight: '700', color: '#047857', letterSpacing: 0.5 },
  badgeStatusCancelled: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  badgeStatusCancelledText: { fontSize: 10, fontWeight: '700', color: '#64748B', letterSpacing: 0.5 },
  badgeStatusActive: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  badgeStatusActiveText: { fontSize: 10, fontWeight: '700', color: '#1D4ED8', letterSpacing: 0.5 },
  inactiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  inactiveBannerIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  inactiveBannerTextCol: {
    flex: 1,
  },
  inactiveBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  inactiveBannerDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  ownerBottomBarContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 10,
  },
  ownerPrimaryButton: {
    width: '100%',
    minHeight: 50,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryFulfilledButton: {
    backgroundColor: '#16A34A',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    includeFontPadding: false,
    zIndex: 2,
  },
  ownerSecondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  disabledButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  disabledButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
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
  requesterAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
    backgroundColor: '#FDE68A',
  },
  requesterAvatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  requesterInfo: {
    flex: 1,
  },
  requesterNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  requesterName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
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

  // Bottom Buttons
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
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
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

  // Safety Action Sheet Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  actionSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    paddingTop: 4,
  },
  actionSheetHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionSheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  actionSheetSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  actionSheetBody: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 8,
  },
  actionSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 14,
  },
  actionSheetOptionIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  actionSheetOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
    flex: 1,
  },
  actionSheetDestructiveText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  actionSheetDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 42,
  },
  actionSheetCancelButton: {
    marginHorizontal: Spacing.lg,
    marginTop: 12,
    paddingVertical: 15,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  actionSheetCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
});