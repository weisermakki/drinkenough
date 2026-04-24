import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
  useFonts,
} from '@expo-google-fonts/nunito';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { Brand } from '@/constants/brand';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { WaterProvider } from '@/contexts/WaterContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

function useProtectedRouting() {
  const { session, isLoading, isPasswordRecovery } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const firstSegment = segments[0] as string | undefined;
    const inAuthGroup = firstSegment === '(auth)';
    const onResetScreen = inAuthGroup && segments[1] === 'reset-password';

    if (isPasswordRecovery && !onResetScreen) {
      router.replace('/(auth)/reset-password');
      return;
    }

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup && !isPasswordRecovery) {
      router.replace('/(tabs)');
    }
  }, [session, segments, isLoading, isPasswordRecovery, router]);
}

function RootNavigator() {
  const { isLoading } = useAuth();
  useProtectedRouting();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Brand.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: Brand.background } }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="hinzufuegen"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Getränk hinzufügen',
          headerTitleStyle: { fontWeight: '800', fontSize: 17 },
          headerStyle: { backgroundColor: Brand.background },
          headerTintColor: Brand.primary,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Brand.primary} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <WaterProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <RootNavigator />
          <StatusBar style="auto" />
        </ThemeProvider>
      </WaterProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Brand.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
