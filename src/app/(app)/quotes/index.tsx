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

import { getMyQuotes, type Quote } from '@/api/quotes';
import { CardSkeleton } from '@/components/loading-skeleton';
import { StatusChip } from '@/components/status-chip';
import { Primary, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function QuoteRow({ quote, onPress }: { quote: Quote; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      style={[styles.row, { backgroundColor: theme.backgroundElement }]}
      onPress={onPress}
    >
      <View style={styles.rowMain}>
        <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={2}>
          {quote.jobTitle}
        </Text>
        <Text style={[styles.rowDate, { color: theme.textSecondary }]}>
          {new Date(quote.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.amount, { color: Primary[500] }]}>
          ₱{quote.amount.toLocaleString()}
        </Text>
        <StatusChip status={quote.status} />
      </View>
    </Pressable>
  );
}

export default function QuotesScreen() {
  const theme = useTheme();
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-quotes'],
    queryFn: getMyQuotes,
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <Text style={[styles.heading, { color: theme.text }]}>My Quotes</Text>

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
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Primary[500]} />
          }
          renderItem={({ item }) => (
            <QuoteRow
              quote={item}
              onPress={() => router.push(`/(app)/quotes/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📝</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No quotes yet</Text>
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
  rowDate: { fontSize: 12 },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  amount: { fontSize: 15, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.two },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyLink: { fontSize: 14, fontWeight: '600' },
});
