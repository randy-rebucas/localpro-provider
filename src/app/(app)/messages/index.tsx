import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getThreads, type Thread } from '@/api/messages';
import { AppHeader } from '@/components/app-header';
import { Icon } from '@/components/icon';
import { CardSkeleton } from '@/components/loading-skeleton';
import { BottomTabInset, Primary, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function ThreadRow({ thread, onPress }: { thread: Thread; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable style={[styles.row, { backgroundColor: theme.backgroundElement }]} onPress={onPress}>
      <View style={[styles.avatar, { backgroundColor: Primary[100] }]}>
        <Text style={[styles.avatarText, { color: Primary[700] }]}>
          {thread.otherParty.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.name, { color: theme.text }]}>{thread.otherParty.name}</Text>
          <Text style={[styles.time, { color: theme.textSecondary }]}>
            {thread.lastMessageAt ? new Date(thread.lastMessageAt).toLocaleDateString() : ''}
          </Text>
        </View>
        <Text style={[styles.jobTitle, { color: Primary[500] }]} numberOfLines={1}>
          {thread.jobTitle}
        </Text>
        <View style={styles.rowBottom}>
          <Text style={[styles.preview, { color: theme.textSecondary }]} numberOfLines={1}>
            {thread.lastMessage}
          </Text>
          {thread.unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: Primary[500] }]}>
              <Text style={styles.badgeText}>{thread.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function MessagesScreen() {
  const theme = useTheme();
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['threads'],
    queryFn: getThreads,
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <AppHeader title="Messages" />

      {isLoading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Primary[500]} />}
          renderItem={({ item }) => (
            <ThreadRow thread={item} onPress={() => router.push(`/(app)/messages/${item.id}`)} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="chatbubbles-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No messages yet</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Messages from clients about your jobs will appear here.
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
  skeletons: { padding: Spacing.four, gap: Spacing.three },
  list: { padding: Spacing.four, gap: Spacing.two, paddingBottom: BottomTabInset },
  row: { borderRadius: 14, padding: Spacing.three, flexDirection: 'row', gap: Spacing.three },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700' },
  rowContent: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontSize: 15, fontWeight: '700' },
  time: { fontSize: 12 },
  jobTitle: { fontSize: 12, fontWeight: '500' },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  preview: { fontSize: 13, flex: 1 },
  badge: { borderRadius: 10, minWidth: 20, paddingHorizontal: 5, alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.two, paddingHorizontal: Spacing.five },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
