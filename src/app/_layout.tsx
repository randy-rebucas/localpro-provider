import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { getMe } from '@/api/auth';
import { isProviderApproved, useAuthStore } from '@/stores/auth-store';

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
  const { user, isLoading, setUser, clearUser, setLoading } = useAuthStore();

  useEffect(() => {
    async function bootstrap() {
      try {
        const me = await getMe();
        if (me.role !== 'provider') {
          clearUser();
          return;
        }
        setUser(me);
      } catch {
        clearUser();
      }
    }
    bootstrap();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === '(auth)';

    if (!user && !inAuth) {
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      if (user.approvalStatus === 'pending' || user.approvalStatus === 'rejected') {
        router.replace('/(auth)/pending-approval');
      } else {
        router.replace('/(app)');
      }
    }
  }, [user, isLoading, segments]);

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
