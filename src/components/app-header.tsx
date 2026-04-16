/**
 * AppHeader — shared top bar for all main tab screens.
 * Shows the screen title on the left and quick-access icon buttons on the right:
 *   search  →  /(app)/search
 *   notifications (with unread badge)  →  /(app)/notifications
 *   profile avatar  →  /(app)/profile
 */
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { getMe, getProviderProfile } from '@/api/auth';
import { getNotifications } from '@/api/notifications';
import { Icon } from '@/components/icon';
import { Primary, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/auth-store';

interface AppHeaderProps {
  title: string;
  /** Replace title with a custom left node (e.g. greeting block) */
  left?: React.ReactNode;
  /** Extra nodes rendered between the title and the action icons */
  right?: React.ReactNode;
}

export function AppHeader({ title, left, right }: AppHeaderProps) {
  const theme  = useTheme();
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn:  getNotifications,
    staleTime: 1000 * 30,
  });
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn:  getMe,
    staleTime: 1000 * 60 * 5,
  });
  const { data: profile } = useQuery({
    queryKey: ['provider-profile'],
    queryFn:  getProviderProfile,
    staleTime: 1000 * 60 * 5,
  });

  const unreadCount = notifData?.unreadCount ?? 0;
  const avatarUrl   = me?.avatar ?? profile?.userId?.avatar ?? user?.avatar;

  return (
    <View style={[styles.bar, { borderBottomColor: theme.backgroundElement }]}>
      {/* Left */}
      <View style={styles.left}>
        {left ?? <Text style={[styles.title, { color: theme.text }]}>{title}</Text>}
      </View>

      {/* Right actions */}
      <View style={styles.actions}>
        {right}

        {/* Search */}
        <Pressable
          style={[styles.iconBtn, { backgroundColor: theme.backgroundElement }]}
          onPress={() => router.push('/(app)/search')}
          hitSlop={8}
        >
          <Icon name="search-outline" size={20} color={theme.text} />
        </Pressable>

        {/* Notifications */}
        <Pressable
          style={[styles.iconBtn, { backgroundColor: theme.backgroundElement }]}
          onPress={() => router.push('/(app)/notifications')}
          hitSlop={8}
        >
          <Icon name="notifications-outline" size={20} color={theme.text} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </Pressable>

        {/* Profile avatar */}
        <Pressable
          style={[styles.avatar, !avatarUrl && { backgroundColor: Primary[500] }]}
          onPress={() => router.push('/(app)/profile')}
          hitSlop={8}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarInitial}>
              {user?.name?.charAt(0).toUpperCase() ?? 'P'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical:   Spacing.two + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left:    { flex: 1 },
  title:   { fontSize: 20, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  iconBtn: {
    width:        36,
    height:       36,
    borderRadius: 18,
    alignItems:   'center',
    justifyContent: 'center',
  },
  badge: {
    position:        'absolute',
    top:    -2,
    right:  -2,
    backgroundColor: '#dc2626',
    borderRadius:    8,
    minWidth:        16,
    paddingHorizontal: 3,
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800', lineHeight: 14 },
  avatar: {
    width:          36,
    height:         36,
    borderRadius:   18,
    alignItems:     'center',
    justifyContent: 'center',
    overflow:       'hidden',
  },
  avatarImg:     { width: 36, height: 36, borderRadius: 18 },
  avatarInitial: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
