import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getTransactions, getWallet } from '@/api/earnings';
import { AppHeader } from '@/components/app-header';
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

export default function EarningsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const {
    data: wallet,
    isLoading: walletLoading,
    isError: walletError,
    refetch: refetchWallet,
    isRefetching,
  } = useQuery({
    queryKey: ['wallet'],
    queryFn:  getWallet,
    staleTime: 1000 * 60,
  });

  const {
    data: rawTxns,
    isLoading: txLoading,
    isError: txError,
    refetch: refetchTxns,
  } = useQuery({
    queryKey: ['transactions', { limit: 5 }],
    queryFn: () => getTransactions({ limit: 5 }),
    staleTime: 1000 * 60,
  });

  const txns = Array.isArray(rawTxns) ? rawTxns : [];
  const isLoading = walletLoading || txLoading;

  async function handleRefresh() {
    await Promise.all([refetchWallet(), refetchTxns()]);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <AppHeader title="Earnings" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={Primary[500]} />}
      >
        {/* Balance card */}
        <View style={[styles.balanceCard, { backgroundColor: walletError ? '#ef4444' : Primary[500] }]}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          {walletLoading ? (
            <View style={[styles.balanceSkeleton, { backgroundColor: Primary[400] }]} />
          ) : walletError ? (
            <Text style={styles.balanceAmount}>—</Text>
          ) : (
            <Text style={styles.balanceAmount}>₱{(wallet?.balance ?? 0).toLocaleString()}</Text>
          )}
          <Pressable
            style={[styles.withdrawBtn, { backgroundColor: '#fff' }]}
            onPress={() => router.push('/(app)/earnings/withdraw')}
          >
            <Icon name="arrow-up-circle-outline" size={15} color={Primary[600]} />
            <Text style={[styles.withdrawBtnText, { color: Primary[600] }]}>Withdraw to Bank</Text>
          </Pressable>
        </View>

        {/* Summary row */}
        {isLoading ? (
          <CardSkeleton />
        ) : (
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.summaryValue, { color: Status.success }]}>
                ₱{(wallet?.thisMonth ?? 0).toLocaleString()}
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>This Month</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.summaryValue, { color: theme.text }]}>
                ₱{(wallet?.allTime ?? 0).toLocaleString()}
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>All Time</Text>
            </View>
            {(wallet?.pendingWithdrawals ?? 0) > 0 && (
              <View style={[styles.summaryCard, { backgroundColor: theme.backgroundElement }]}>
                <Text style={[styles.summaryValue, { color: Status.warning }]}>
                  ₱{wallet!.pendingWithdrawals.toLocaleString()}
                </Text>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Pending</Text>
              </View>
            )}
          </View>
        )}

        {/* Commission notice */}
        <View style={[styles.notice, { backgroundColor: theme.backgroundElement }]}>
          <Icon name="information-circle-outline" size={16} color={theme.textSecondary} />
          <Text style={[styles.noticeText, { color: theme.textSecondary }]}>
            LocalPro deducts a 10% commission per completed job. Amounts shown are net.
          </Text>
        </View>

        {/* Recent transactions */}
        <View style={styles.txHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Transactions</Text>
          <Pressable
            style={styles.seeAllRow}
            onPress={() => router.push('/(app)/earnings/transactions')}
          >
            <Text style={[styles.seeAll, { color: Primary[500] }]}>See All</Text>
            <Icon name="chevron-forward" size={14} color={Primary[500]} />
          </Pressable>
        </View>

        {txLoading ? (
          [0, 1, 2].map((i) => <CardSkeleton key={i} />)
        ) : txError ? (
          <Text style={[styles.emptyTx, { color: '#ef4444' }]}>Couldn't load transactions. Pull down to retry.</Text>
        ) : txns.length === 0 ? (
          <Text style={[styles.emptyTx, { color: theme.textSecondary }]}>No transactions yet.</Text>
        ) : (
          txns.map((tx) => (
            <View key={tx.id} style={[styles.txRow, { backgroundColor: theme.backgroundElement }]}>
              <Icon
                name={TX_ICONS[tx.type] ?? 'card-outline'}
                size={22}
                color={tx.amount >= 0 ? Status.success : Status.error}
              />
              <View style={styles.txMeta}>
                <Text style={[styles.txDesc, { color: theme.text }]} numberOfLines={1}>{tx.description}</Text>
                <Text style={[styles.txDate, { color: theme.textSecondary }]}>
                  {new Date(tx.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={[styles.txAmount, { color: tx.amount >= 0 ? Status.success : Status.error }]}>
                {tx.amount >= 0 ? '+' : ''}₱{Math.abs(tx.amount).toLocaleString()}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.four, gap: Spacing.three, paddingBottom: BottomTabInset },
  balanceCard: { borderRadius: 20, padding: Spacing.four, gap: Spacing.two },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  balanceAmount: { color: '#fff', fontSize: 36, fontWeight: '800' },
  balanceSkeleton: { height: 40, borderRadius: 8, width: '60%' },
  withdrawBtn: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: Spacing.four, alignSelf: 'flex-start', marginTop: Spacing.one, flexDirection: 'row', alignItems: 'center', gap: 5 },
  withdrawBtnText: { fontSize: 14, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: Spacing.two },
  summaryCard: { flex: 1, borderRadius: 14, padding: Spacing.three, gap: 4 },
  summaryValue: { fontSize: 18, fontWeight: '700' },
  summaryLabel: { fontSize: 12 },
  notice: { borderRadius: 12, padding: Spacing.three, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  noticeText: { fontSize: 13, lineHeight: 18, flex: 1 },
  txHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  seeAllRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAll: { fontSize: 14, fontWeight: '600' },
  txRow: { borderRadius: 14, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  txMeta: { flex: 1, gap: 2 },
  txDesc: { fontSize: 14, fontWeight: '500' },
  txDate: { fontSize: 12 },
  txAmount: { fontSize: 15, fontWeight: '700' },
  emptyTx: { textAlign: 'center', paddingVertical: Spacing.four, fontSize: 14 },
});
