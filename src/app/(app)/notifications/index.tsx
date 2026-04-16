import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getNotifications, markAllRead, markOneRead, type AppNotification } from '@/api/notifications';
import { Icon, type IconName } from '@/components/icon';
import { CardSkeleton } from '@/components/loading-skeleton';
import { BottomTabInset, Primary, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useNotificationStore } from '@/stores/notification-store';

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

function NotifRow({ notif, onPress }: { notif: AppNotification; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      style={[
        styles.row,
        { backgroundColor: theme.backgroundElement },
        !notif.read && { borderLeftWidth: 3, borderLeftColor: Primary[500] },
      ]}
      onPress={onPress}
    >
      <Icon
        name={TYPE_ICON[notif.type] ?? 'notifications-outline'}
        size={24}
        color={notif.read ? theme.textSecondary : Primary[500]}
      />
      <View style={styles.rowContent}>
        <Text
          style={[styles.message, { color: theme.text }, !notif.read && { fontWeight: '700' }]}
        >
          {notif.message}
        </Text>
        <Text style={[styles.time, { color: theme.textSecondary }]}>
          {(() => { const d = new Date(notif.createdAt); return isNaN(d.getTime()) ? '—' : d.toLocaleString(); })()}
        </Text>
      </View>
      {!notif.read && <View style={[styles.dot, { backgroundColor: Primary[500] }]} />}
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const storeMarkAllRead = useNotificationStore((s) => s.markAllRead);
  const storeMarkRead    = useNotificationStore((s) => s.markRead);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    staleTime: 1000 * 30,
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const markAll = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      storeMarkAllRead();
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markOne = useMutation({
    mutationFn: markOneRead,
    onSuccess: (_data, id) => {
      storeMarkRead(id);
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.heading, { color: theme.text }]}>
          Notifications {unreadCount > 0 && `(${unreadCount})`}
        </Text>
        {unreadCount > 0 && (
          <Pressable onPress={() => { if (!markAll.isPending) markAll.mutate(); }} disabled={markAll.isPending}>
            <Text style={[styles.markAll, { color: markAll.isPending ? Primary[300] : Primary[500] }]}>
              {markAll.isPending ? 'Marking…' : 'Mark all read'}
            </Text>
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2, 3].map((i) => <CardSkeleton key={i} />)}
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
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Primary[500]} />}
          renderItem={({ item }) => (
            <NotifRow notif={item} onPress={() => { if (!item.read) markOne.mutate(item._id); }} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="notifications-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>All caught up!</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                New job alerts and updates will appear here.
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.two },
  heading: { fontSize: 24, fontWeight: '700' },
  markAll: { fontSize: 14, fontWeight: '600' },
  skeletons: { padding: Spacing.four, gap: Spacing.two },
  list:      { padding: Spacing.four, gap: Spacing.two, paddingBottom: BottomTabInset + 16 },
  retryRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  retryText: { fontSize: 14, fontWeight: '600' },
  row: { borderRadius: 14, padding: Spacing.three, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, overflow: 'hidden' },
  rowContent: { flex: 1, gap: 4 },
  message: { fontSize: 14, lineHeight: 20 },
  time: { fontSize: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.two, paddingHorizontal: Spacing.five },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
