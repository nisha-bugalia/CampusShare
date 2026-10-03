import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../src/constants/colors';
import { MarketplaceProvider } from '../src/context/MarketplaceContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <MarketplaceProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: Colors.light.background,
            },
          }}
        >
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
            }}
          />
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
      </MarketplaceProvider>
    </SafeAreaProvider>
  );
}