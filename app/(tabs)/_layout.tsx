import { Tabs } from 'expo-router';
import { Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.light.primary,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: Colors.light.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: Colors.light.border,
          height: Platform.OS === 'android'
            ? 60 + insets.bottom
            : 54 + Math.max(insets.bottom, 10),
          paddingBottom: Platform.OS === 'android'
            ? (insets.bottom > 0 ? insets.bottom + 6 : 8)
            : Math.max(insets.bottom, 8),
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'CampusShare',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>🏠</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          headerTitle: 'Search',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>🔍</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          headerTitle: 'Create',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>➕</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          headerTitle: 'Messages',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>💬</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'Profile',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>👤</Text>
          ),
        }}
      />
    </Tabs>
  );
}
