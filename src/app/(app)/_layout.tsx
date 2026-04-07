import { useQuery } from '@tanstack/react-query';
import { GlassView } from 'expo-glass-effect';
import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';

import { getProviderProfile } from '@/api/auth';
import { Icon, type IconName } from '@/components/icon';
import { Primary } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';

/* ─────────────────────────────────────────────────────
   Tab bar dimensions (used both here + by screens)
───────────────────────────────────────────────────── */
const BAR_HEIGHT   = 64;
const BAR_BOTTOM   = Platform.select({ ios: 28, android: 14, default: 10 }) as number;

/** Total space the floating bar occupies at the bottom of the screen */
export const TAB_BOTTOM_INSET = BAR_BOTTOM + BAR_HEIGHT + (Platform.OS === 'ios' ? 4 : 0);

/* ─────────────────────────────────────────────────────
   Tab icon component
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
  const theme = useTheme();

  return (
    <View style={styles.tabItem}>
      {/* Icon chip — active state gets a colored pill */}
      <View style={[styles.iconChip, focused && styles.iconChipActive]}>
        <Icon
          name={focused ? iconFocused : icon}
          size={22}
          color={focused ? Primary[600] : theme.textSecondary}
        />
        {/* Unread badge */}
        {!!badge && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>

      {/* Label — only visible when focused */}
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? Primary[600] : theme.textSecondary },
          !focused && styles.tabLabelHidden,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

/* ─────────────────────────────────────────────────────
   Layout
───────────────────────────────────────────────────── */
export default function AppLayout() {
  const theme       = useTheme();
  const colorScheme = useColorScheme();
  const router      = useRouter();
  const user        = useAuthStore((s) => s.user);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const glassScheme = colorScheme === 'dark' ? 'dark' : 'light';

  useQuery({
    queryKey: ['provider-profile'],
    queryFn:  getProviderProfile,
    enabled:  !!user,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (user && user.approvalStatus !== 'approved') {
      router.replace('/(auth)/pending-approval');
    }
  }, [user]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && user && user.approvalStatus !== 'approved') {
        router.replace('/(auth)/pending-approval');
      }
    });
    return () => sub.remove();
  }, [user]);

  return (
    <Tabs
      screenOptions={{
        headerShown:    false,
        tabBarShowLabel: false,
        tabBarStyle:    [
          styles.tabBar,
          // Subtle border in light mode for definition
          colorScheme !== 'dark' && { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.08)' },
        ],
        tabBarBackground: () => (
          <GlassView
            style={[StyleSheet.absoluteFill, styles.glassBackground]}
            glassEffectStyle="regular"
            colorScheme={glassScheme}
          />
        ),
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
              label="Messages"
              focused={focused}
              badge={unreadCount}
            />
          ),
        }}
      />

      {/* ── Hidden tabs (router.push only, not in tab bar) ── */}
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
  );
}

/* ─────────────────────────────────────────────────────
   Styles
───────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  /* Floating pill bar */
  tabBar: {
    position:        'absolute',
    bottom:          BAR_BOTTOM,
    left:            16,
    right:           16,
    height:          BAR_HEIGHT,
    backgroundColor: 'transparent',
    borderTopWidth:  0,
    elevation:       0,
    borderRadius:    24,
    overflow:        'hidden',    // clips GlassView to the rounded corners
    // iOS shadow for depth
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 8 },
    shadowOpacity:   0.12,
    shadowRadius:    20,
  },

  /* GlassView should also carry the corner radius */
  glassBackground: {
    borderRadius: 24,
  },

  /* Each tab slot */
  tabItem: {
    alignItems:     'center',
    justifyContent: 'center',
    gap:            2,
  },

  /* Icon container — pill highlight when active */
  iconChip: {
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderRadius:      20,
    alignItems:        'center',
    justifyContent:    'center',
  },
  iconChipActive: {
    backgroundColor: Primary[50],   // very light brand tint
  },

  /* Label */
  tabLabel: {
    fontSize:   10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  tabLabelHidden: {
    // keep in layout so tab item height stays stable, but invisible
    opacity: 0,
    height:  0,
    overflow: 'hidden',
  },

  /* Notification badge on the icon chip */
  badge: {
    position:         'absolute',
    top:              -2,
    right:            -4,
    backgroundColor:  '#dc2626',
    borderRadius:     8,
    minWidth:         15,
    paddingHorizontal: 3,
    alignItems:       'center',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800', lineHeight: 14 },
});
