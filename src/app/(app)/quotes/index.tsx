import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getJob } from '@/api/jobs';
import { getQuotedJobIds } from '@/api/quotes';
import { CardSkeleton } from '@/components/loading-skeleton';
import { Primary, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function QuotesScreen() {
  const theme = useTheme();
  const router = useRouter();

  const { data: jobIds = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['quoted-job-ids'],
    queryFn: getQuotedJobIds,
  });

  // Fetch job details for each quoted job ID
  const { data: quotedJobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['quoted-jobs', jobIds],
    queryFn: async () => {
      if (jobIds.length === 0) return [];
      const results = await Promise.allSettled(jobIds.map((id) => getJob(id)));
      return results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map((r) => r.value);
    },
    enabled: jobIds.length > 0,
  });

  const loading = isLoading || jobsLoading;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <Text style={[styles.heading, { color: theme.text }]}>My Quotes</Text>

      {loading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={quotedJobs}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Primary[500]} />
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.row, { backgroundColor: theme.backgroundElement }]}
              onPress={() => router.push(`/(app)/marketplace/${item._id}`)}
            >
              <View style={styles.rowMain}>
                <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={[styles.rowMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                  📍 {item.location}
                </Text>
                <Text style={[styles.rowDate, { color: theme.textSecondary }]}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={[styles.amount, { color: Primary[500] }]}>
                  ₱{item.budget.toLocaleString()}
                </Text>
                <View style={[styles.quotedBadge, { backgroundColor: Primary[50] }]}>
                  <Text style={[styles.quotedText, { color: Primary[600] }]}>Quoted ✓</Text>
                </View>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📝</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No quotes yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Jobs you quote on will appear here.
              </Text>
              <Pressable onPress={() => router.push('/(app)/marketplace')}>
                <Text style={[styles.emptyLink, { color: Primary[500] }]}>Browse open jobs →</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  heading: { fontSize: 24, fontWeight: '700', paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.two },
  skeletons: { padding: Spacing.four, gap: Spacing.three },
  list: { padding: Spacing.four, gap: Spacing.two, paddingBottom: 32 },
  row: { borderRadius: 14, padding: Spacing.three, flexDirection: 'row', gap: Spacing.two },
  rowMain: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  rowMeta: { fontSize: 13 },
  rowDate: { fontSize: 12 },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  amount: { fontSize: 15, fontWeight: '700' },
  quotedBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  quotedText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.two },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
  emptyLink: { fontSize: 14, fontWeight: '600' },
});
