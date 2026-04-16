import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { registerPushToken } from '@/api/notifications';
import { useAuthStore } from '@/stores/auth-store';

/* ── Foreground notification behaviour ──────────────────────── */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/* ── Helper: request permission & return Expo push token ────── */
async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#208AEF',
    });
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

/* ── Deep-link map: notification type → app route ───────────── */
function resolveRoute(notification: Notifications.Notification): string | null {
  const data = notification.request.content.data as Record<string, unknown>;
  const type = data?.type as string | undefined;
  const id = data?.id as string | undefined;

  switch (type) {
    case 'new_job':
    case 'job_assigned':
      return id ? `/(app)/jobs/${id}` : '/(app)/jobs';
    case 'new_quote_request':
    case 'quote_accepted':
    case 'quote_declined':
      return id ? `/(app)/quotes/${id}` : '/(app)/quotes';
    case 'new_message':
      return id ? `/(app)/messages/${id}` : '/(app)/messages';
    case 'earnings_update':
    case 'withdrawal_complete':
      return '/(app)/earnings';
    case 'announcement':
      return '/(app)/announcements';
    default:
      return '/(app)/notifications';
  }
}

/* ── Hook ───────────────────────────────────────────────────── */
export function usePushNotifications() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);
  const appStateRef = useRef(AppState.currentState);

  /* Register token whenever user logs in */
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      const token = await getExpoPushToken();
      if (!token || cancelled) return;
      try {
        await registerPushToken(token);
      } catch {
        // Non-critical — fail silently
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?._id]);

  /* Re-register on app foreground in case token rotated */
  useEffect(() => {
    if (!user) return;

    const sub = AppState.addEventListener('change', async (nextState) => {
      if (appStateRef.current !== 'active' && nextState === 'active') {
        const token = await getExpoPushToken();
        if (token) {
          try {
            await registerPushToken(token);
          } catch {
            // Non-critical
          }
        }
      }
      appStateRef.current = nextState;
    });

    return () => sub.remove();
  }, [user?._id]);

  /* Handle notification taps (background / quit) */
  useEffect(() => {
    responseListenerRef.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const route = resolveRoute(response.notification);
        if (route) router.push(route as Parameters<typeof router.push>[0]);
      });

    return () => {
      responseListenerRef.current?.remove();
    };
  }, [router]);
}
