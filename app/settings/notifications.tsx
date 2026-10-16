import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Switch,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { Spacing, BorderRadius } from '../../src/constants/layout';
import { useAuth } from '../../src/context/AuthContext';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../../src/services/settingsService';

export default function NotificationsSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [chatNotifications, setChatNotifications] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadPreferences() {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        const { chatNotifications: enabled, error } = await getNotificationPreferences(user.id);
        if (isMounted) {
          if (error) {
            console.warn('[NotificationsSettings] Error loading preference:', error.message);
          }
          setChatNotifications(enabled);
        }
      } catch (err) {
        console.warn('[NotificationsSettings] Unexpected load error:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadPreferences();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handleToggle = async (newValue: boolean) => {
    if (!user?.id || saving) return;

    // Optimistically update UI
    setChatNotifications(newValue);
    setSaving(true);

    try {
      const { error } = await updateNotificationPreferences(user.id, newValue);
      if (error) {
        // Rollback on error
        setChatNotifications(!newValue);
        Alert.alert('Update Failed', error.message || 'Could not update notification preference.');
      }
    } catch (err: any) {
      setChatNotifications(!newValue);
      Alert.alert('Error', err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Notifications',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: Colors.light.primary,
          headerTitleStyle: { fontWeight: '700', color: '#0F172A' },
          headerBackTitle: 'Settings',
        }}
      />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 24, 40) },
        ]}
      >
        <Text style={styles.sectionHeader}>PUSH NOTIFICATIONS</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>💬</Text>
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.rowTitle}>Chat Notifications</Text>
                <Text style={styles.rowSubtitle}>
                  Receive push alerts for new marketplace messages
                </Text>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator size="small" color={Colors.light.primary} />
            ) : (
              <Switch
                value={chatNotifications}
                onValueChange={handleToggle}
                trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                thumbColor={chatNotifications ? Colors.light.primary : '#F1F5F9'}
                disabled={saving}
              />
            )}
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Disabling chat notifications stops CampusShare from sending push alerts to your
            devices. You will still receive messages in your inbox when you open the app.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 13,
    color: Colors.light.textMuted,
    lineHeight: 18,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.light.textMuted,
    lineHeight: 18,
  },
});
