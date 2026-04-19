import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Image, View } from 'react-native';

import * as SecureStore from 'expo-secure-store';

import { getMe } from '@/api/auth';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { APPROVAL_STATUS_KEY, isProviderApproved, useAuthStore } from '@/stores/auth-store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30,
    },
  },
});

/** Same art as `app.config` splash; bundled so it updates without a native rebuild. */
const SPLASH_SOURCE = require('@/assets/images/splash-icon.png');

function AuthGuard() {
  const router = useRouter();
  const segments = useSegments();
  const { user, isLoading, setUser, clearUser } = useAuthStore();

  usePushNotifications();

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

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
  // isProviderApproved checks both approvalStatus === 'approved' AND !isSuspended
  const approved  = isProviderApproved(user);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    // Not approved or suspended — keep inside auth group on the pending screen
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
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
        }}
      >
        <Image
          source={SPLASH_SOURCE}
          style={{ width: 200, height: 200 }}
          resizeMode="contain"
        />
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
