import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getTransactions } from '@/api/earnings';
import { Icon, type IconName } from '@/components/icon';
import { CardSkeleton } from '@/components/loading-skeleton';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TX_ICONS: Record<string, IconName> = {
  escrow_released: 'cash-outline',
  commission:      'bar-chart-outline',
  withdrawal:      'arrow-up-circle-outline',
  referral_bonus:  'gift-outline',
};

export default function TransactionsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const { data: rawTxns, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['transactions-all'],
    queryFn: () => getTransactions({ limit: 100 }),
    staleTime: 1000 * 60,
  });

  const txns = Array.isArray(rawTxns) ? rawTxns : [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.nav}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="chevron-back" size={20} color={Primary[500]} />
          <Text style={[styles.back, { color: Primary[500] }]}>Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: theme.text }]}>Transactions</Text>
        <View style={{ width: 60 }} />
      </View>

      {isLoading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
        </View>
      ) : isError ? (
        <View style={styles.empty}>
          <Icon name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Couldn't load transactions</Text>
          <Pressable onPress={() => refetch()} style={styles.retryRow}>
            <Icon name="refresh-outline" size={14} color={Primary[500]} />
            <Text style={[styles.retryText, { color: Primary[500] }]}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={txns}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Primary[500]} />}
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
              <Icon
                name={TX_ICONS[item.type] ?? 'card-outline'}
                size={22}
                color={item.amount >= 0 ? Status.success : Status.error}
              />
              <View style={styles.rowMeta}>
                <Text style={[styles.desc, { color: theme.text }]} numberOfLines={1}>{item.description}</Text>
                <Text style={[styles.date, { color: theme.textSecondary }]}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>
              <Text style={[styles.amount, { color: item.amount >= 0 ? Status.success : Status.error }]}>
                {item.amount >= 0 ? '+' : ''}₱{Math.abs(item.amount).toLocaleString()}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="bar-chart-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No transactions yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.four, paddingVertical: Spacing.two + 2 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 60 },
  back: { fontSize: 15, fontWeight: '600' },
  navTitle: { fontSize: 16, fontWeight: '700' },
  skeletons: { padding: Spacing.four, gap: Spacing.two },
  list: { padding: Spacing.four, gap: Spacing.two, paddingBottom: BottomTabInset + 16 },
  row: { borderRadius: 14, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  rowMeta: { flex: 1, gap: 2 },
  desc: { fontSize: 14, fontWeight: '500' },
  date: { fontSize: 12 },
  amount: { fontSize: 15, fontWeight: '700' },
  empty:     { alignItems: 'center', paddingTop: 80, gap: Spacing.two },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  retryRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  retryText: { fontSize: 14, fontWeight: '600' },
});
