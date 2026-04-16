import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import * as SecureStore from 'expo-secure-store';

import { getMe } from '@/api/auth';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { APPROVAL_STATUS_KEY, useAuthStore } from '@/stores/auth-store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30,
    },
  },
});

function AuthGuard() {
  const router = useRouter();
  const segments = useSegments();
  const { user, isLoading, setUser, clearUser } = useAuthStore();

  usePushNotifications();

  useEffect(() => {
    async function bootstrap() {
      try {
        const [me, savedStatus] = await Promise.all([
          getMe(),
          SecureStore.getItemAsync(APPROVAL_STATUS_KEY),
        ]);
        if (me.role !== 'provider') {
          clearUser();
          return;
        }
        // getMe() doesn't return approvalStatus — restore from last login via SecureStore
        setUser({ ...me, approvalStatus: me.approvalStatus ?? savedStatus ?? null });
      } catch {
        clearUser();
      }
    }
    bootstrap();
  }, []);

  const inAuth    = segments[0] === '(auth)';
  const onPending = segments[1] === 'pending-approval';
  const approved  = user?.approvalStatus === 'approved';

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    // Not approved — keep inside auth group on the pending screen
    if (!approved) {
      if (!onPending) router.replace('/(auth)/pending-approval');
      return;
    }

    // Approved — move out of auth into the app
    if (inAuth) {
      router.replace('/(app)');
    }
  }, [user, isLoading, inAuth, approved, onPending]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#208AEF" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard />
    </QueryClientProvider>
  );
}
