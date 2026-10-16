import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { BorderRadius, Spacing } from '../../src/constants/layout';
import { useAuth } from '../../src/context/AuthContext';
import { DbMessage } from '../../src/types/databaseMessage';
import {
  fetchMessages,
  sendMessage,
  fetchConversationDetails,
  subscribeToMessages,
  unsubscribeFromMessages,
  updateLastReadAt,
  setActiveChatPresence,
  clearActiveChatPresence,
  ConversationDetails,
} from '../../src/services/chatService';
import { blockUser, unblockUser, checkBlockStatus } from '../../src/services/safetyService';
import { BlockStatus } from '../../src/types/safety';
import ReportModal from '../../src/components/ReportModal';

function formatMessageTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [convoDetails, setConvoDetails] = useState<ConversationDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);

  const flatListRef = useRef<FlatList<DbMessage>>(null);

  // Safety state
  const [blockStatus, setBlockStatus] = useState<BlockStatus>({
    isBlocked: false,
    isBlockedBy: false,
    isBidirectional: false,
  });
  const [reportModalVisible, setReportModalVisible] = useState(false);

  // ── Keyboard Listener (Rock-solid Android & iOS positioning) ──
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 50);
      }
    );

    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ── Active Chat Presence & Stale Protection ──
  useEffect(() => {
    if (!id || !user?.id) return;

    let isMounted = true;
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

    const activate = () => {
      if (!isMounted) return;
      setActiveChatPresence(id, user.id).catch((err) => {
        console.warn('[ChatScreen] Non-critical: could not set active presence:', err);
      });
    };

    const deactivate = () => {
      clearActiveChatPresence(user.id, id).catch((err) => {
        console.warn('[ChatScreen] Non-critical: could not clear active presence:', err);
      });
    };

    // 1. Activate presence immediately when chat mounts (if app is foregrounded)
    if (AppState.currentState === 'active') {
      activate();
    }

    // 2. Heartbeat every 20s while viewing chat (keeps active_at fresh against 45s stale cutoff)
    heartbeatInterval = setInterval(() => {
      if (AppState.currentState === 'active') {
        activate();
      }
    }, 20000);

    // 3. Listen for app foreground/background transitions
    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          activate();
        } else if (nextState.match(/inactive|background/)) {
          deactivate();
        }
      }
    );

    return () => {
      isMounted = false;
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      appStateSubscription.remove();
      deactivate();
    };
  }, [id, user?.id]);

  // ── Block Status Check ──
  useEffect(() => {
    if (!convoDetails?.otherUser?.id || !user?.id) return;
    checkBlockStatus(convoDetails.otherUser.id).then((status) => {
      setBlockStatus(status);
    });
  }, [convoDetails?.otherUser?.id, user?.id]);

  const handleConfirmUnblock = () => {
    if (!convoDetails?.otherUser) return;
    const otherUser = convoDetails.otherUser;
    Alert.alert(
      `Unblock ${otherUser.name}?`,
      'You will be able to message each other and view their listings again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'default',
          onPress: async () => {
            try {
              await unblockUser(otherUser.id);
              setBlockStatus((prev) => ({
                isBlocked: false,
                isBlockedBy: prev.isBlockedBy,
                isBidirectional: prev.isBlockedBy,
              }));
              Alert.alert('User Unblocked', `${otherUser.name} has been unblocked.`);
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Failed to unblock.');
            }
          },
        },
      ]
    );
  };

  const handleConfirmBlock = () => {
    if (!convoDetails?.otherUser) return;
    const otherUser = convoDetails.otherUser;
    Alert.alert(
      `Block ${otherUser.name}?`,
      'Neither of you will be able to message each other, and you will not see their listings on CampusShare.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(otherUser.id);
              setBlockStatus((prev) => ({
                ...prev,
                isBlocked: true,
                isBidirectional: true,
              }));
              Alert.alert('User Blocked', `${otherUser.name} has been blocked.`);
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Failed to block.');
            }
          },
        },
      ]
    );
  };

  const handleOpenSafetyMenu = () => {
    if (!convoDetails?.otherUser) return;
    const otherUser = convoDetails.otherUser;
    Alert.alert('Safety Options', 'Report or manage this conversation', [
      {
        text: `Report ${otherUser.name}`,
        onPress: () => setReportModalVisible(true),
      },
      blockStatus.isBlocked
        ? {
            text: `Unblock ${otherUser.name}`,
            onPress: handleConfirmUnblock,
          }
        : {
            text: `Block ${otherUser.name}`,
            style: 'destructive' as const,
            onPress: handleConfirmBlock,
          },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  // ── 1. Fetch initial data + Realtime subscription ──
  useEffect(() => {
    if (!id || !user?.id) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setErrorMessage(null);

      // Fetch conversation metadata (item name & participant)
      const detailsPromise = fetchConversationDetails(id, user!.id);
      // Fetch messages
      const messagesPromise = fetchMessages(id);

      const [detailsRes, messagesRes] = await Promise.all([detailsPromise, messagesPromise]);

      if (!isMounted) return;

      if (detailsRes.data) {
        setConvoDetails(detailsRes.data);
      }

      if (messagesRes.error) {
        console.error('[ChatScreen] Error fetching messages:', messagesRes.error);
        setErrorMessage(
          messagesRes.error.message.includes('row-level security')
            ? 'You do not have permission to access this conversation.'
            : 'Failed to load messages. Please try again.'
        );
      } else {
        setMessages(messagesRes.data || []);
        // Mark conversation as read on initial open
        updateLastReadAt(id, user!.id).catch((err) => {
          console.warn('[ChatScreen] Non-critical: could not update last_read_at on load:', err);
        });
      }

      setIsLoading(false);
    }

    loadData();

    // ── Subscribe to Realtime new message INSERT events ──
    const channel = subscribeToMessages(
      id,
      (newMsg: DbMessage) => {
        if (!isMounted) return;

        setMessages((prev) => {
          // Prevent duplicates by message id
          if (prev.some((m) => m.id === newMsg.id)) {
            return prev;
          }
          const updated = [...prev, newMsg];
          return updated.sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });

        // User is actively viewing the conversation -> update active presence and last_read_at
        setActiveChatPresence(id, user.id).catch((err) => {
          console.warn('[ChatScreen] Non-critical: could not update presence on incoming message:', err);
        });

        // Auto-scroll when new message arrives
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
      (status) => {
        console.log(`[ChatScreen] Realtime channel status (${id}):`, status);
      }
    );

    return () => {
      isMounted = false;
      unsubscribeFromMessages(channel);
    };
  }, [id, user?.id]);

  // ── 2. Scroll to bottom on load / new messages ──
  const handleScrollToEnd = () => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  };

  // ── 3. Send message ──
  const handleSend = async () => {
    const textToSend = inputText.trim();
    if (!textToSend || isSending) return;

    if (!user?.id || !id) {
      Alert.alert('Error', 'You must be signed in to send a message.');
      return;
    }

    setIsSending(true);

    const { data: newMsg, error } = await sendMessage(id, user.id, textToSend);

    if (error || !newMsg) {
      console.error('[ChatScreen] Error sending message:', error);
      Alert.alert('Send Error', error?.message || 'Could not send message. Please try again.');
      setIsSending(false);
      return;
    }

    // Success: append message to local state immediately (with duplicate check) and clear input
    setMessages((prev) => {
      if (prev.some((m) => m.id === newMsg.id)) {
        return prev;
      }
      return [...prev, newMsg];
    });
    setInputText('');
    setIsSending(false);

    // Update sender's read timestamp
    updateLastReadAt(id, user.id).catch((err) => {
      console.warn('[ChatScreen] Non-critical: could not update last_read_at on send:', err);
    });

    // Ensure view scrolls to the newly sent message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const headerTitle = convoDetails?.otherUser?.name || 'Chat';
  const headerSubtitle = convoDetails?.title
    ? convoDetails.title
    : convoDetails?.otherUser?.branch || null;

  // ── Render Message Bubble ──
  const renderMessageItem = ({ item }: { item: DbMessage }) => {
    const isMe = item.sender_id === user?.id;

    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
            {item.message}
          </Text>
          <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
            {formatMessageTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackTitle: 'Back',
          headerTitleAlign: 'left',
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: Colors.light.primary,
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitleText} numberOfLines={1}>
                {headerTitle}
              </Text>
              {headerSubtitle && (
                <Text style={styles.headerSubtitleText} numberOfLines={1}>
                  {headerSubtitle}
                </Text>
              )}
            </View>
          ),
          headerRight: convoDetails?.otherUser
            ? () => (
                <TouchableOpacity
                  onPress={handleOpenSafetyMenu}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ paddingHorizontal: 12 }}
                >
                  <Text style={{ fontSize: 22, fontWeight: '700', color: '#0F172A' }}>⋮</Text>
                </TouchableOpacity>
              )
            : undefined,
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View
          style={[
            styles.mainContent,
            Platform.OS === 'android' && { paddingBottom: keyboardHeight },
          ]}
        >
          {/* Blocked user banner */}
          {blockStatus.isBidirectional && (
            <View style={styles.blockedBanner}>
              <View style={styles.blockedBannerContent}>
                <Text style={styles.blockedBannerText}>
                  {blockStatus.isBlocked
                    ? '🚫 You have blocked this user.'
                    : '🚫 You cannot message this user due to campus safety and blocking policies.'}
                </Text>
                {blockStatus.isBlocked && (
                  <TouchableOpacity
                    style={styles.unblockBannerButton}
                    onPress={handleConfirmUnblock}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.unblockBannerButtonText}>Unblock</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={Colors.light.primary} />
              <Text style={styles.loadingText}>Loading conversation...</Text>
            </View>
          ) : errorMessage ? (
            <View style={styles.centerContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorTitle}>Conversation Error</Text>
              <Text style={styles.errorSubtitle}>{errorMessage}</Text>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <Text style={styles.backButtonText}>← Go Back</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              style={styles.messageList}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessageItem}
              contentContainerStyle={[
                styles.messageListContent,
                messages.length === 0 && styles.emptyListContent,
              ]}
              onContentSizeChange={handleScrollToEnd}
              onLayout={handleScrollToEnd}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Text style={styles.emptyIcon}>💬</Text>
                  </View>
                  <Text style={styles.emptyTitle}>No messages yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Say hello to {convoDetails?.otherUser?.name || 'start the chat'}!
                  </Text>
                </View>
              }
            />
          )}

          {/* Input Bar / Composer */}
          <View
            style={[
              styles.composerWrapper,
              {
                paddingBottom:
                  Platform.OS === 'android' && keyboardHeight > 0
                    ? 8
                    : Math.max(insets.bottom, 10),
              },
            ]}
          >
            {blockStatus.isBlocked ? (
              <View style={styles.blockedComposer}>
                <Text style={styles.blockedComposerText} numberOfLines={2}>
                  You blocked this user.
                </Text>
                <TouchableOpacity
                  style={styles.unblockComposerButton}
                  onPress={handleConfirmUnblock}
                  activeOpacity={0.8}
                >
                  <Text style={styles.unblockComposerButtonText}>Unblock to Chat</Text>
                </TouchableOpacity>
              </View>
            ) : blockStatus.isBlockedBy ? (
              <View style={styles.blockedComposer}>
                <Text style={styles.blockedComposerText}>
                  You cannot message this user due to campus safety policies.
                </Text>
              </View>
            ) : (
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Type a message..."
                  placeholderTextColor="#94A3B8"
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={1000}
                  editable={!isLoading && !errorMessage}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!inputText.trim() || isSending || isLoading || !!errorMessage) &&
                      styles.sendButtonDisabled,
                  ]}
                  onPress={handleSend}
                  disabled={!inputText.trim() || isSending || isLoading || !!errorMessage}
                  activeOpacity={0.8}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.sendIcon}>➤</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Safety Report Modal */}
      {convoDetails?.otherUser && (
        <ReportModal
          visible={reportModalVisible}
          onClose={() => setReportModalVisible(false)}
          targetType="user"
          targetId={convoDetails.otherUser.id}
          targetLabel={convoDetails.otherUser.name}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardContainer: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },
  headerTitleContainer: {
    justifyContent: 'center',
  },
  headerTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitleText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // Message List
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
  },
  bubbleMe: {
    backgroundColor: Colors.light.primary,
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomLeftRadius: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextMe: {
    color: '#FFFFFF',
  },
  messageTextOther: {
    color: '#0F172A',
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeTextMe: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  timeTextOther: {
    color: '#94A3B8',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },

  // Bottom Input
  composerWrapper: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    color: '#0F172A',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
    opacity: 0.7,
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 2,
  },

  // Blocked banner
  blockedBanner: {
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  blockedBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  blockedBannerText: {
    fontSize: 13,
    color: '#DC2626',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 18,
  },
  unblockBannerButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  unblockBannerButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Blocked composer
  blockedComposer: {
    backgroundColor: '#F1F5F9',
    borderRadius: BorderRadius.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  blockedComposerText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  unblockComposerButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    marginLeft: 8,
  },
  unblockComposerButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
