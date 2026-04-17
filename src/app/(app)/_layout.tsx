import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { getUnreadCount } from '@/api/messages';
import { Icon, type IconName } from '@/components/icon';
import { Primary } from '@/constants/theme';
import { ApprovalProvider } from '@/context/approval-context';
import { ProfileCompletionProvider } from '@/context/profile-completion-context';

/* ─────────────────────────────────────────────────────
   Dimensions
───────────────────────────────────────────────────── */
const BAR_HEIGHT = 70;
const BAR_BOTTOM = Platform.select({ ios: 24, android: 12, default: 8 }) as number;

export const TAB_BOTTOM_INSET = BAR_BOTTOM + BAR_HEIGHT + 8;

/* ─────────────────────────────────────────────────────
   Tab icon
───────────────────────────────────────────────────── */
function TabIcon({
  icon,
  iconFocused,
  label,
  focused,
  badge,
}: {
  icon: IconName;
  iconFocused: IconName;
  label: string;
  focused: boolean;
  badge?: number;
}) {
  return (
    <View style={styles.tabItem}>
      {/* Icon pill — gray oval only on active */}
      <View style={[styles.iconOval, focused && styles.iconOvalActive]}>
        <Icon
          name={focused ? iconFocused : icon}
          size={22}
          color={focused ? Primary[500] : '#1f2937'}
        />
        {!!badge && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>

      {/* Label */}
      <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/* ─────────────────────────────────────────────────────
   Layout
───────────────────────────────────────────────────── */
export default function AppLayout() {
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['messages-unread'],
    queryFn: getUnreadCount,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60, // poll every minute while app is open
  });

  return (
    <ApprovalProvider>
      <ProfileCompletionProvider>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarShowLabel: false,
            tabBarStyle: styles.tabBar,
            tabBarItemStyle: styles.tabBarItem,
            tabBarBackground: () => <View style={styles.pill} />,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon icon="home-outline" iconFocused="home" label="Home" focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="marketplace"
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon icon="search-outline" iconFocused="search" label="Market" focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="jobs"
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon icon="briefcase-outline" iconFocused="briefcase" label="Jobs" focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="earnings"
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon icon="wallet-outline" iconFocused="wallet" label="Wallet" focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="messages"
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon
                  icon="chatbubble-outline"
                  iconFocused="chatbubble"
                  label="Chat"
                  focused={focused}
                  badge={unreadCount}
                />
              ),
            }}
          />

          {/* ── Hidden routes ── */}
          <Tabs.Screen name="quotes"          options={{ href: null }} />
          <Tabs.Screen name="notifications"   options={{ href: null }} />
          <Tabs.Screen name="support"         options={{ href: null }} />
          <Tabs.Screen name="consultations"   options={{ href: null }} />
          <Tabs.Screen name="quote-templates" options={{ href: null }} />
          <Tabs.Screen name="profile"         options={{ href: null }} />
          <Tabs.Screen name="loyalty"         options={{ href: null }} />
          <Tabs.Screen name="announcements"   options={{ href: null }} />
          <Tabs.Screen name="search"          options={{ href: null }} />
        </Tabs>
      </ProfileCompletionProvider>
    </ApprovalProvider>
  );
}

/* ─────────────────────────────────────────────────────
   Styles
───────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  /* ── Floating tab bar container ── */
  tabBar: {
    position: 'absolute',
    bottom: BAR_BOTTOM,
    left: 16,
    right: 16,
    height: BAR_HEIGHT,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },

  /* Pure white pill */
  pill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: BAR_HEIGHT,
    backgroundColor: '#ffffff',
    borderRadius: 36,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },

  /* Tab slot */
  tabBarItem: {
    paddingTop: 0,
    paddingBottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Tab content: icon above label */
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },

  /* Icon container — perfect circle, sized by width/height */
  iconOval: {
    marginTop: 22,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Active: light gray circle background */
  iconOvalActive: {
    backgroundColor: '#e9eaf0',
    borderWidth: 4,
    borderColor: '#ffffff',
    width: 60,
    height: 60,
    borderRadius: 30,
    marginTop: 0,
  },

  /* Label */
  label: {
    fontSize: 8,
    fontWeight: '600',
    color: '#374151',
    // letterSpacing: 0.1,
  },
  labelActive: {
    color: Primary[500],
    fontWeight: '700',
  },

  /* Badge */
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', lineHeight: 13 },
});
