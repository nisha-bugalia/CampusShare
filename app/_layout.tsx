import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { Colors } from '../src/constants/colors';
import { MarketplaceProvider } from '../src/context/MarketplaceContext';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { useProfile } from '../src/hooks/useProfile';
import * as Notifications from 'expo-notifications';

// Configure foreground notification behavior so alerts, banners, and sounds appear when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function RootNavigator() {
  const { session, isLoading: isAuthLoading } = useAuth();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const segments = useSegments();
  const router = useRouter();

  // Show splash while checking initial auth session or fetching profile for an authenticated user
  const isCheckingAuth = isAuthLoading || (Boolean(session) && isProfileLoading);

  useEffect(() => {
    if (isCheckingAuth) return;

    const currentSegment = segments[0];
    const inAuthGroup = currentSegment === '(auth)' || currentSegment === 'auth';
    const onOnboarding = currentSegment === 'onboarding';

    if (!session) {
      // User is not authenticated -> redirect to login if not already in auth
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    // Authenticated user: check profile completeness (branch and hostel required)
    const isProfileComplete = Boolean(profile?.branch && profile?.hostel);

    if (!isProfileComplete) {
      // Missing branch or hostel -> redirect to onboarding setup
      if (!onOnboarding) {
        router.replace('/onboarding');
      }
    } else {
      // Profile is complete -> do not allow onboarding or auth screens
      if (inAuthGroup || onOnboarding) {
        router.replace('/(tabs)');
      }
    }
  }, [session, isCheckingAuth, profile?.branch, profile?.hostel, segments]);

  if (isCheckingAuth) {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require('../assets/a_clean_high_resolution_isolated_app_icon_style.png')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
        <Text style={styles.splashTitle}>CampusShare</Text>
        <Text style={styles.splashSubtitle}>NIT Kurukshetra</Text>
        <ActivityIndicator
          size="small"
          color={Colors.light.primary}
          style={styles.splashSpinner}
        />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: Colors.light.background,
        },
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="listing/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="request/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="create/have" options={{ headerShown: false }} />
      <Stack.Screen name="create/need" options={{ headerShown: false }} />
      <Stack.Screen name="edit/have" options={{ headerShown: false }} />
      <Stack.Screen name="edit/need" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="blocked-users" options={{ headerShown: false }} />
      <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
      <Stack.Screen name="settings/index" options={{ headerShown: false }} />
      <Stack.Screen name="settings/notifications" options={{ headerShown: false }} />
      <Stack.Screen name="settings/privacy" options={{ headerShown: false }} />
      <Stack.Screen name="settings/help" options={{ headerShown: false }} />
      <Stack.Screen name="settings/about" options={{ headerShown: false }} />
      <Stack.Screen
        name="+not-found"
        options={{
          headerShown: true,
          title: 'Oops! Page Not Found',
          headerStyle: {
            backgroundColor: Colors.light.primary,
          },
          headerTintColor: '#FFFFFF',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MarketplaceProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </MarketplaceProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
    padding: 24,
  },
  splashLogo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  splashTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.light.primary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  splashSubtitle: {
    fontSize: 14,
    color: Colors.light.textMuted,
    fontWeight: '500',
  },
  splashSpinner: {
    marginTop: 28,
  },
});