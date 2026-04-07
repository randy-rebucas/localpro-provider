import { useQuery } from '@tanstack/react-query';
import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';

import { getProviderProfile } from '@/api/auth';
import { Primary } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isProviderApproved, useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';

function TabIcon({ emoji, label, focused, badge }: {
  emoji: string;
  label: string;
  focused: boolean;
  badge?: number;
}) {
  const theme = useTheme();
  return (
    <View style={styles.tabItem}>
      <View>
        <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>{emoji}</Text>
        {!!badge && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.tabLabel, { color: focused ? Primary[500] : theme.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

export default function AppLayout() {
  const theme = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const { data: profile } = useQuery({
    queryKey: ['provider-profile'],
    queryFn: getProviderProfile,
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (user && !isProviderApproved(user)) {
      router.replace('/(auth)/pending-approval');
    }
  }, [user]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && user && !isProviderApproved(user)) {
        router.replace('/(auth)/pending-approval');
      }
    });
    return () => sub.remove();
  }, [user]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          { backgroundColor: theme.background, borderTopColor: theme.backgroundElement },
        ],
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Home" focused={focused} /> }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" label="Market" focused={focused} /> }}
      />
      <Tabs.Screen
        name="jobs"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="💼" label="Jobs" focused={focused} /> }}
      />
      <Tabs.Screen
        name="earnings"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="💰" label="Earnings" focused={focused} /> }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="💬" label="Messages" focused={focused} badge={unreadCount} />
          ),
        }}
      />
      {/* Hidden tabs — accessible via router.push, not shown in tab bar */}
      <Tabs.Screen name="quotes" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="support" options={{ href: null }} />
      <Tabs.Screen name="consultations" options={{ href: null }} />
      <Tabs.Screen name="quote-templates" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="loyalty" options={{ href: null }} />
      <Tabs.Screen name="announcements" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.select({ ios: 80, android: 64, default: 60 }),
    paddingBottom: Platform.select({ ios: 20, default: 8 }),
    borderTopWidth: 1,
  },
  tabItem: { alignItems: 'center', gap: 2, paddingTop: 4 },
  tabEmoji: { fontSize: 22, opacity: 0.5 },
  tabEmojiActive: { opacity: 1 },
  tabLabel: { fontSize: 11, fontWeight: '500' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    minWidth: 16,
    paddingHorizontal: 3,
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
