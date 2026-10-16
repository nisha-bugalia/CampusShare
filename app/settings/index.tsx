import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { Spacing, BorderRadius } from '../../src/constants/layout';
import { useAuth } from '../../src/context/AuthContext';

interface SettingRowProps {
  icon: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  isDestructive?: boolean;
}

function SettingRow({
  icon,
  iconBg = '#EFF6FF',
  title,
  subtitle,
  onPress,
  isDestructive = false,
}: SettingRowProps) {
  return (
    <TouchableOpacity
      style={styles.actionRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.actionRowLeft}>
        <View style={[styles.actionIconContainer, { backgroundColor: iconBg }]}>
          <Text style={styles.actionIcon}>{icon}</Text>
        </View>
        <View style={styles.textColumn}>
          <Text
            style={[
              styles.actionRowText,
              isDestructive && { color: Colors.light.error },
            ]}
          >
            {title}
          </Text>
          {subtitle ? <Text style={styles.actionRowSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <Text
        style={[
          styles.actionChevron,
          isDestructive && { color: Colors.light.error },
        ]}
      >
        ›
      </Text>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();

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

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Settings',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: Colors.light.primary,
          headerTitleStyle: { fontWeight: '700', color: '#0F172A' },
          headerBackTitle: 'Profile',
        }}
      />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 24, 40) },
        ]}
      >
        {/* ── 1. Settings Section ── */}
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.card}>
          <SettingRow
            icon="🔔"
            title="Notifications"
            subtitle="Chat notifications"
            onPress={() => router.push('/settings/notifications')}
          />
          <View style={styles.actionDivider} />
          <SettingRow
            icon="🚫"
            iconBg="#FEF2F2"
            title="Blocked Users"
            subtitle="Manage blocked accounts"
            onPress={() => router.push('/blocked-users')}
          />
          <View style={styles.actionDivider} />
          <SettingRow
            icon="🔒"
            title="Privacy"
            subtitle="Data usage & visibility rules"
            onPress={() => router.push('/settings/privacy')}
          />
        </View>

        {/* ── 2. Help & Support Section ── */}
        <Text style={styles.sectionTitle}>Help & Support</Text>
        <View style={styles.card}>
          <SettingRow
            icon="🆘"
            iconBg="#FEF3C7"
            title="Help & Feedback"
            subtitle="Report a problem or share feedback"
            onPress={() => router.push('/settings/help')}
          />
          <View style={styles.actionDivider} />
          <SettingRow
            icon="ℹ️"
            title="About CampusShare"
            subtitle="Version and project information"
            onPress={() => router.push('/settings/about')}
          />
        </View>

        {/* ── 3. Account Actions ── */}
        <View style={styles.card}>
          <SettingRow
            icon="🚪"
            iconBg="#FEF2F2"
            title="Log Out"
            subtitle="Sign out of your account"
            onPress={handleLogout}
            isDestructive
          />
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
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
    paddingVertical: 12,
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  actionIconContainer: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 18,
  },
  textColumn: {
    flex: 1,
  },
  actionRowText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  actionRowSubtitle: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  actionChevron: {
    fontSize: 20,
    color: '#94A3B8',
    fontWeight: '300',
    marginLeft: Spacing.xs,
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
});
