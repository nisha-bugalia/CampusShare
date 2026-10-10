import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { BorderRadius, Spacing } from '../../src/constants/layout';
import { useAuth } from '../../src/context/AuthContext';
import {
  fetchConversations,
  ConversationListItem,
} from '../../src/services/chatService';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const now = Date.now();
    const diff = now - date.getTime();
    const mins = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

const AVATAR_COLOURS = [
  '#1E3A8A', '#0D9488', '#7C3AED', '#D97706', '#DC2626',
  '#059669', '#2563EB', '#DB2777', '#EA580C', '#0891B2',
];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLOURS[Math.abs(hash) % AVATAR_COLOURS.length];
}

// ── Conversation Card ─────────────────────────────────────────────────────────

interface ConversationCardProps {
  item: ConversationListItem;
  currentUserId: string;
  onPress: () => void;
}

function ConversationCard({ item, currentUserId, onPress }: ConversationCardProps) {
  const { otherUser, subjectTitle, latestMessageText, latestMessageSenderId, latestActivityAt, lastReadAt } = item;
  const initials = getInitials(otherUser.name);
  const bgColor = avatarColor(otherUser.name);
  const timeLabel = formatRelativeTime(latestActivityAt);

  // A conversation is unread when:
  // - it has a latest message from someone else AND
  // - either last_read_at is null OR the latest message arrived after last_read_at
  const isUnread: boolean = (() => {
    if (!latestMessageSenderId || latestMessageSenderId === currentUserId) return false;
    if (!lastReadAt) return true;
    return new Date(latestActivityAt).getTime() > new Date(lastReadAt).getTime();
  })();

  const preview = latestMessageText
    ? latestMessageText.length > 55
      ? `${latestMessageText.slice(0, 55)}…`
      : latestMessageText
    : '';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.avatar, { backgroundColor: bgColor }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={[styles.nameText, isUnread && styles.nameTextUnread]} numberOfLines={1}>
            {otherUser.name}
          </Text>
          <View style={styles.timeRow}>
            {isUnread && <View style={styles.unreadDot} />}
            <Text style={[styles.timeText, isUnread && styles.timeTextUnread]}>{timeLabel}</Text>
          </View>
        </View>
        {subjectTitle ? (
          <Text style={styles.subjectText} numberOfLines={1}>📌 {subjectTitle}</Text>
        ) : null}
        <Text
          style={[
            styles.previewText,
            !latestMessageText && styles.previewTextMuted,
            isUnread && styles.previewTextUnread,
          ]}
          numberOfLines={1}
        >
          {preview}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function MessagesScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadConversations = useCallback(
    async (silent = false) => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }
      if (!silent) setIsLoading(true);
      setErrorMessage(null);
      const { data, error } = await fetchConversations(user.id);
      if (error) {
        console.error('[MessagesScreen] Error fetching conversations:', error);
        setErrorMessage('Could not load your conversations. Pull down to retry.');
      } else {
        setConversations(data ?? []);
      }
      setIsLoading(false);
      setIsRefreshing(false);
    },
    [user?.id]
  );

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Refresh automatically whenever the tab comes into focus
  useFocusEffect(
    useCallback(() => {
      loadConversations(true);
    }, [loadConversations])
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadConversations(true);
  }, [loadConversations]);

  const handleOpenConversation = (conversationId: string) => {
    router.push(`/chat/${conversationId}` as any);
  };

  const renderItem = ({ item }: { item: ConversationListItem }) => (
    <ConversationCard
      item={item}
      currentUserId={user?.id ?? ''}
      onPress={() => handleOpenConversation(item.id)}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Text style={styles.emptyIcon}>💬</Text>
      </View>
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptySubtitle}>
        When you tap Chat on any listing or request, your conversations will appear here.
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconCircle, styles.errorIconCircle]}>
        <Text style={styles.emptyIcon}>⚠️</Text>
      </View>
      <Text style={styles.emptyTitle}>Could not load messages</Text>
      <Text style={styles.emptySubtitle}>{errorMessage}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => loadConversations()}
        activeOpacity={0.8}
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.light.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        {conversations.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{conversations.length}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading conversations…</Text>
        </View>
      ) : errorMessage ? (
        renderError()
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            conversations.length === 0 && styles.listContentEmpty,
          ]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.light.primary}
              colors={[Colors.light.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 52;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    gap: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  badge: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingVertical: Spacing.sm,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginLeft: Spacing.lg + AVATAR_SIZE + Spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.light.surface,
    gap: Spacing.md,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginRight: Spacing.sm,
  },
  nameTextUnread: {
    fontWeight: '800',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.primary,
  },
  timeText: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  timeTextUnread: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
  subjectText: {
    fontSize: 12,
    color: Colors.light.secondary,
    fontWeight: '600',
  },
  previewText: {
    fontSize: 14,
    color: Colors.light.textMuted,
    lineHeight: 18,
  },
  previewTextMuted: {
    fontStyle: 'italic',
  },
  previewTextUnread: {
    color: Colors.light.text,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.textMuted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: 60,
    gap: 12,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  errorIconCircle: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.light.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
