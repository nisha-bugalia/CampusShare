import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../src/constants/colors';
import { Spacing, BorderRadius } from '../src/constants/layout';
import { fetchBlockedUsers, unblockUser } from '../src/services/safetyService';

interface BlockedUserItem {
  id: string;
  blocked_id: string;
  name: string;
  email: string;
}

export default function BlockedUsersScreen() {
  const router = useRouter();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const loadBlockedUsers = useCallback(async () => {
    try {
      const data = await fetchBlockedUsers();
      setBlockedUsers(data);
    } catch (err: any) {
      console.error('Error loading blocked users:', err);
      Alert.alert('Error', 'Failed to load blocked users.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBlockedUsers();
  }, [loadBlockedUsers]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadBlockedUsers();
  };

  const handleConfirmUnblock = (user: BlockedUserItem) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${user.name}? They will be able to message you and see your listings again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: async () => {
            setUnblockingId(user.blocked_id);
            try {
              await unblockUser(user.blocked_id);
              setBlockedUsers((prev) =>
                prev.filter((item) => item.blocked_id !== user.blocked_id)
              );
              Alert.alert('User Unblocked', `${user.name} has been unblocked.`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to unblock user.');
            } finally {
              setUnblockingId(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: BlockedUserItem }) => {
    const isUnblocking = unblockingId === item.blocked_id;
    const initial = (item.name || 'U').charAt(0).toUpperCase();

    return (
      <View style={styles.userCard}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.nameBlock}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.name || 'Unknown User'}
            </Text>
            {item.email ? (
              <Text style={styles.userEmail} numberOfLines={1}>
                {item.email}
              </Text>
            ) : null}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.unblockButton, isUnblocking && styles.unblockButtonDisabled]}
          onPress={() => handleConfirmUnblock(item)}
          disabled={isUnblocking}
          activeOpacity={0.7}
        >
          {isUnblocking ? (
            <ActivityIndicator size="small" color={Colors.light.error} />
          ) : (
            <Text style={styles.unblockButtonText}>Unblock</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🛡️</Text>
      <Text style={styles.emptyTitle}>No Blocked Users</Text>
      <Text style={styles.emptySubtitle}>
        When you block someone, they won't be able to message you or see your posts in the campus feed.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.light.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  backIcon: {
    fontSize: 22,
    color: Colors.light.text,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  headerPlaceholder: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
    flexGrow: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  nameBlock: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  unblockButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    minWidth: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unblockButtonDisabled: {
    opacity: 0.6,
  },
  unblockButtonText: {
    color: Colors.light.error,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.light.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
});
