import { router, Stack } from 'expo-router';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/design/theme';
import { SnackbarProvider } from '@/components/visual';
import { initializeDatabase } from '@/database/database';
import { getSetting, seedDefaults } from '@/database/repositories';
import { reconcileReminders } from '@/services/notification-service';
import { useUIStore } from '@/stores/ui.store';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    initializeDatabase()
      .then(seedDefaults)
      .then(async () => {
        const savedTheme = await getSetting('theme');
        if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') useUIStore.getState().setTheme(savedTheme);
        await reconcileReminders().catch(() => undefined);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);
  useEffect(() => {
    if (Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;
    let subscription: { remove: () => void } | undefined;
    import('expo-notifications')
      .then((Notifications) => {
        if (typeof Notifications.addNotificationResponseReceivedListener !== 'function') return;
        subscription = Notifications.addNotificationResponseReceivedListener((response) => {
          const reminderId = response.notification.request.content.data?.reminderId;
          if (typeof reminderId === 'string') router.push({ pathname: '/reminders/[id]', params: { id: reminderId } });
        });
      })
      .catch(() => undefined);
    return () => subscription?.remove();
  }, []);
  if (!ready)
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaProvider>
    );
  return (
    <SafeAreaProvider>
      <SnackbarProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="notes/new" options={{ presentation: 'card' }} />
          <Stack.Screen name="notes/[id]" />
          <Stack.Screen name="tasks/new" />
          <Stack.Screen name="tasks/[id]" />
          <Stack.Screen name="reminders/new" />
          <Stack.Screen name="reminders/[id]" />
          <Stack.Screen name="calendar" />
          <Stack.Screen name="search" />
          <Stack.Screen name="settings/index" />
          <Stack.Screen name="files" />
          <Stack.Screen name="media/image" />
          <Stack.Screen name="media/audio" />
          <Stack.Screen name="media/preview" />
          <Stack.Screen name="tags" />
          <Stack.Screen name="trash" />
        </Stack>
      </SnackbarProvider>
    </SafeAreaProvider>
  );
}
