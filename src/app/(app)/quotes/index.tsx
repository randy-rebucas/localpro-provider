import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getMyQuotes, type Quote } from '@/api/quotes';
import { Icon } from '@/components/icon';
import { CardSkeleton } from '@/components/loading-skeleton';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const STATUS_COLOR: Record<string, string> = {
  pending:  '#f59e0b',
  accepted: Status.success,
  rejected: Status.error,
  retracted: Status.error,
  withdrawn: '#6b7280',
};

function statusLabel(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function QuotesScreen() {
  const theme  = useTheme();
  const router = useRouter();

  const { data: quotes = [], isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['my-quotes'],
    queryFn:  getMyQuotes,
    staleTime: 1000 * 60,
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <Text style={[styles.heading, { color: theme.text }]}>My Quotes</Text>

      {isLoading ? (
        <View style={[styles.skeletons, { paddingBottom: BottomTabInset + 16 }]}>
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </View>
      ) : isError ? (
        <View style={styles.errorState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: '#fee2e2' }]}>
            <Icon name="alert-circle-outline" size={36} color="#ef4444" />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Couldn't load quotes</Text>
          <Pressable style={[styles.emptyBtn, { backgroundColor: Primary[500] }]} onPress={() => refetch()}>
            <Icon name="refresh-outline" size={15} color="#fff" />
            <Text style={styles.emptyBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={quotes}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[styles.list, quotes.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Primary[500]} />
          }
          renderItem={({ item }: { item: Quote }) => {
            const statusColor = STATUS_COLOR[item.status] ?? '#6b7280';
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.75 : 1 },
                ]}
                onPress={() =>
                item._id
                  ? router.push(`/(app)/quotes/${item._id}` as any)
                  : router.push(`/(app)/marketplace/${item.jobId}` as any)
              }
              >
                {/* Title + status badge */}
                <View style={styles.cardTop}>
                  <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
                    {item.jobTitle || 'Untitled Job'}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {statusLabel(item.status)}
                    </Text>
                  </View>
                </View>

                {/* Amount + timeline */}
                <View style={styles.cardMeta}>
                  <View style={styles.metaItem}>
                    <Icon name="wallet-outline" size={13} color={Primary[500]} />
                    <Text style={[styles.metaValue, { color: Primary[500] }]}>
                      ₱{item.proposedAmount.toLocaleString()}
                    </Text>
                  </View>
                  {item.timeline ? (
                    <View style={styles.metaItem}>
                      <Icon name="time-outline" size={13} color={theme.textSecondary} />
                      <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>
                        {item.timeline}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.metaItem}>
                    <Icon name="calendar-outline" size={13} color={theme.textSecondary} />
                    <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                    </Text>
                  </View>
                </View>

                {/* Notes preview */}
                {item.notes ? (
                  <Text style={[styles.notes, { color: theme.textSecondary }]} numberOfLines={2}>
                    {item.notes}
                  </Text>
                ) : null}

                <View style={styles.cardFooter}>
                  <Text style={[styles.viewLink, { color: Primary[500] }]}>
                    {item._id ? 'View details' : 'View job'}
                  </Text>
                  <Icon name="chevron-forward" size={14} color={Primary[500]} />
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIconWrap, { backgroundColor: Primary[50] }]}>
                <Icon name="document-text-outline" size={36} color={Primary[400]} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No quotes yet</Text>
              <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
                Jobs you quote on will appear here.
              </Text>
              <Pressable
                style={[styles.emptyBtn, { backgroundColor: Primary[500] }]}
                onPress={() => router.push('/(app)/marketplace')}
              >
                <Icon name="search-outline" size={15} color="#fff" />
                <Text style={styles.emptyBtnText}>Browse Jobs</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  heading:       { fontSize: 24, fontWeight: '700', paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.two },
  skeletons:     { padding: Spacing.four, gap: Spacing.three },
  list:          { padding: Spacing.four, gap: Spacing.two, paddingBottom: BottomTabInset + 16 },
  listEmpty:     { flex: 1 },

  card:          { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  cardTop:       { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  cardTitle:     { flex: 1, fontSize: 15, fontWeight: '700', lineHeight: 21 },
  statusBadge:   { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3, flexShrink: 0 },
  statusText:    { fontSize: 11, fontWeight: '700' },

  cardMeta:      { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  metaItem:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaValue:     { fontSize: 14, fontWeight: '700' },
  metaLabel:     { fontSize: 12 },

  notes:         { fontSize: 13, lineHeight: 18 },

  cardFooter:    { flexDirection: 'row', alignItems: 'center', gap: 2, justifyContent: 'flex-end' },
  viewLink:      { fontSize: 13, fontWeight: '600' },

  errorState:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingHorizontal: Spacing.four },
  empty:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingHorizontal: Spacing.four },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:    { fontSize: 18, fontWeight: '700' },
  emptyHint:     { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 11, marginTop: 4 },
  emptyBtnText:  { color: '#fff', fontSize: 14, fontWeight: '700' },
});
