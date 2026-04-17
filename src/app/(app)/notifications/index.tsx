import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getNotifications, markAllRead, markOneRead, type AppNotification } from '@/api/notifications';
import { Icon, type IconName } from '@/components/icon';
import { CardSkeleton } from '@/components/loading-skeleton';
import { BottomTabInset, Primary, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useNotificationStore } from '@/stores/notification-store';

/**
 * Maps a notification to a deep-link route so tapping takes the user directly
 * to the relevant resource. Priority: explicit `link` field → type+id heuristic.
 */
function resolveNotifRoute(notif: AppNotification): string | null {
  if (notif.link) return notif.link;
  const id = notif.data?.id as string | undefined;
  switch (notif.type) {
    case 'job_assigned':
    case 'job_completed':
      return id ? `/(app)/jobs/${id}` : '/(app)/jobs';
    case 'quote_accepted':
    case 'quote_rejected':
      return id ? `/(app)/quotes/${id}` : '/(app)/quotes';
    case 'payment_received':
      return '/(app)/earnings';
    case 'message':
      return id ? `/(app)/messages/${id}` : '/(app)/messages';
    case 'review_received':
      return '/(app)/profile';
    case 'announcement':
      return id ? `/(app)/announcements/${id}` : '/(app)/announcements';
    default:
      return null;
  }
}

const TYPE_ICON: Record<string, IconName> = {
  job_assigned:     'briefcase-outline',
  quote_accepted:   'checkmark-circle-outline',
  quote_rejected:   'close-circle-outline',
  payment_received: 'cash-outline',
  message:          'chatbubble-outline',
  job_completed:    'trophy-outline',
  review_received:  'star-outline',
  system:           'notifications-outline',
};

const TYPE_COLOR: Record<string, string> = {
  job_assigned:     '#208AEF',
  quote_accepted:   '#16a34a',
  quote_rejected:   '#dc2626',
  payment_received: '#d97706',
  message:          '#7c3aed',
  job_completed:    '#0891b2',
  review_received:  '#f59e0b',
  system:           '#6b7280',
};

function NotifRow({ notif, onPress }: { notif: AppNotification; onPress: (route: string | null) => void }) {
  const theme = useTheme();
  const color = TYPE_COLOR[notif.type] ?? '#6b7280';
  const icon  = TYPE_ICON[notif.type] ?? 'notifications-outline';

  return (
    <Pressable
      style={[
        styles.row,
        { backgroundColor: theme.backgroundElement },
        !notif.read && { borderLeftWidth: 3, borderLeftColor: Primary[500] },
      ]}
      onPress={() => onPress(resolveNotifRoute(notif))}
    >
      <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
        <Icon name={icon} size={20} color={notif.read ? theme.textSecondary : color} />
      </View>
      <View style={styles.rowContent}>
        <Text
          style={[styles.message, { color: theme.text }, !notif.read && styles.messageBold]}
          numberOfLines={3}
        >
          {notif.message}
        </Text>
        <Text style={[styles.time, { color: theme.textSecondary }]}>
          {formatTime(notif.createdAt)}
        </Text>
      </View>
      <View style={styles.rowTrailing}>
        {!notif.read && <View style={[styles.dot, { backgroundColor: Primary[500] }]} />}
        {resolveNotifRoute(notif) && (
          <Icon name="chevron-forward" size={14} color={theme.textSecondary} />
        )}
      </View>
    </Pressable>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString();
}

export default function NotificationsScreen() {
  const theme  = useTheme();
  const router = useRouter();
  const qc     = useQueryClient();
  const setBadgeCount  = useNotificationStore((s) => s.setBadgeCount);
  // Prevent double-navigation if mutation is in-flight
  const navigatingRef = useRef(false);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    staleTime: 1000 * 30,
  });

  const notifications = data?.notifications ?? [];
  const unreadCount   = data?.unreadCount ?? 0;

  /* Sync store badge count whenever API data changes */
  useEffect(() => {
    setBadgeCount(unreadCount);
  }, [unreadCount, setBadgeCount]);

  /* Clear app icon badge when screen is focused */
  useFocusEffect(
    useCallback(() => {
      Notifications.setBadgeCountAsync(0).catch(() => {});
      // Refresh so the bell in AppHeader always reflects reality
      qc.invalidateQueries({ queryKey: ['notifications'] });
    }, [qc]),
  );

  const markAll = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      setBadgeCount(0);
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markOne = useMutation({
    mutationFn: markOneRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Icon name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.heading, { color: theme.text }]}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <Pressable
            onPress={() => { if (!markAll.isPending) markAll.mutate(); }}
            disabled={markAll.isPending}
            hitSlop={8}
          >
            <Text style={[styles.markAll, { color: markAll.isPending ? Primary[300] : Primary[500] }]}>
              {markAll.isPending ? 'Marking…' : 'Mark all read'}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.headerRight} />
        )}
      </View>

      {isLoading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
        </View>
      ) : isError ? (
        <View style={styles.empty}>
          <Icon name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Couldn't load notifications</Text>
          <Pressable onPress={() => refetch()} style={styles.retryRow}>
            <Icon name="refresh-outline" size={14} color={Primary[500]} />
            <Text style={[styles.retryText, { color: Primary[500] }]}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Primary[500]}
              colors={[Primary[500]]}
            />
          }
          renderItem={({ item }) => (
            <NotifRow
              notif={item}
              onPress={(route) => {
                if (!item.read) markOne.mutate(item._id);
                if (route && !navigatingRef.current) {
                  navigatingRef.current = true;
                  // Small delay so mark-read fires before unmount
                  setTimeout(() => {
                    router.push(route as Parameters<typeof router.push>[0]);
                    navigatingRef.current = false;
                  }, 50);
                }
              }}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: Primary[50] }]}>
                <Icon name="notifications-outline" size={40} color={Primary[400]} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>All caught up!</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                New job alerts, quote updates, and payment notifications will appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  backBtn: { width: 32, alignItems: 'flex-start' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerRight: { width: 80 },
  heading: { fontSize: 20, fontWeight: '700' },
  unreadBadge: {
    backgroundColor: Primary[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', lineHeight: 14 },
  markAll: { fontSize: 13, fontWeight: '600' },

  /* List */
  skeletons: { padding: Spacing.four, gap: Spacing.two },
  list: { padding: Spacing.three, gap: Spacing.two, paddingBottom: BottomTabInset + 16 },
  retryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  retryText: { fontSize: 14, fontWeight: '600' },

  /* Row */
  row: {
    borderRadius: 14,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    overflow: 'hidden',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowContent: { flex: 1, gap: 4 },
  message: { fontSize: 14, lineHeight: 20 },
  messageBold: { fontWeight: '700' },
  time: { fontSize: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  rowTrailing: { alignItems: 'center', justifyContent: 'center', gap: 4, flexShrink: 0 },

  /* Empty */
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.two, paddingHorizontal: Spacing.five },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
