import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert, FlatList, Pressable, RefreshControl, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getLoyalty, getReferral, type LoyaltyLedgerEntry } from '@/api/loyalty';
import { Icon } from '@/components/icon';
import { CardSkeleton } from '@/components/loading-skeleton';
import { Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// API returns tier in lowercase ("silver", "gold") — normalise to title case for lookup
const TIER_COLORS: Record<string, { color: string; bg: string }> = {
  bronze:   { color: '#92400e', bg: '#fef3c7' },
  silver:   { color: '#475569', bg: '#f1f5f9' },
  gold:     { color: '#b45309', bg: '#fffbeb' },
  platinum: { color: Primary[700], bg: Primary[50] },
};

function normalizeTier(raw: string): string {
  return raw?.toLowerCase() ?? 'bronze';
}

export default function LoyaltyScreen() {
  const theme  = useTheme();
  const router = useRouter();

  const { data: loyalty, isLoading: loyaltyLoading, refetch, isRefetching } = useQuery({
    queryKey: ['loyalty'],
    queryFn:  getLoyalty,
  });

  const { data: referral, isLoading: referralLoading } = useQuery({
    queryKey: ['referral'],
    queryFn:  getReferral,
  });

  const isLoading = loyaltyLoading || referralLoading;
  const tier = normalizeTier(loyalty?.account?.tier ?? 'bronze');
  const tierStyle = TIER_COLORS[tier] ?? TIER_COLORS.bronze;
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);

  async function shareReferral() {
    if (!referral?.referralLink) return;
    try {
      await Share.share({ message: `Join LocalPro as a provider using my referral link: ${referral.referralLink}` });
    } catch {
      Alert.alert('Error', 'Could not share referral link.');
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Loyalty & Rewards</Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={loyalty?.ledger ?? []}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Primary[500]} />}
          ListHeaderComponent={
            <>
              {/* Points card */}
              <View style={[styles.pointsCard, { backgroundColor: Primary[500] }]}>
                <View style={[styles.tierBadge, { backgroundColor: tierStyle.bg }]}>
                  <Icon name="trophy-outline" size={14} color={tierStyle.color} />
                  <Text style={[styles.tierText, { color: tierStyle.color }]}>{tierLabel}</Text>
                </View>
                <Text style={styles.pointsNum}>{(loyalty?.account?.points ?? 0).toLocaleString()}</Text>
                <Text style={styles.pointsLabel}>Loyalty Points</Text>
                <Text style={styles.pointsHint}>Earn points by completing jobs and referring providers</Text>
              </View>

              {/* Referral card */}
              {referral && (
                <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                  <View style={styles.cardHeader}>
                    <Icon name="people-outline" size={20} color={Primary[500]} />
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Referral Program</Text>
                  </View>
                  <View style={styles.referralRow}>
                    <View style={[styles.codeBox, { backgroundColor: theme.background }]}>
                      <Text style={[styles.codeText, { color: Primary[600] }]}>{referral.referralCode}</Text>
                    </View>
                    <Pressable
                      style={[styles.copyBtn, { backgroundColor: Primary[500] }]}
                      onPress={shareReferral}
                    >
                      <Icon name="share-outline" size={16} color="#fff" />
                      <Text style={styles.copyBtnText}>Share</Text>
                    </Pressable>
                  </View>
                  <Text style={[styles.referralCount, { color: theme.textSecondary }]}>
                    {referral.referredCount} provider{referral.referredCount !== 1 ? 's' : ''} referred so far
                  </Text>
                </View>
              )}

              {/* Tier info */}
              <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Tier Benefits</Text>
                {[
                  { key: 'bronze',   label: 'Bronze',   pts: '0',       benefit: 'Basic visibility & commission rate' },
                  { key: 'silver',   label: 'Silver',   pts: '500',     benefit: 'Priority job matching' },
                  { key: 'gold',     label: 'Gold',     pts: '2,000',   benefit: '5% commission discount' },
                  { key: 'platinum', label: 'Platinum', pts: '10,000',  benefit: 'Dedicated account manager + 10% discount' },
                ].map((row) => (
                  <View key={row.key} style={[styles.tierRow, tier === row.key && { backgroundColor: tierStyle.bg, borderRadius: 8, marginHorizontal: -4 }]}>
                    <Icon name="trophy-outline" size={16} color={TIER_COLORS[row.key]?.color ?? '#888'} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tierRowName, { color: theme.text }]}>{row.label} ({row.pts}+ pts)</Text>
                      <Text style={[styles.tierRowBenefit, { color: theme.textSecondary }]}>{row.benefit}</Text>
                    </View>
                    {tier === row.key && <Icon name="checkmark-circle" size={18} color={Status.success} />}
                  </View>
                ))}
              </View>

              {/* Ledger header */}
              {(loyalty?.ledger?.length ?? 0) > 0 && (
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Points History</Text>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="star-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No points earned yet</Text>
              <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
                Complete jobs and refer friends to earn loyalty points.
              </Text>
            </View>
          }
          renderItem={({ item }: { item: LoyaltyLedgerEntry }) => (
            <View style={[styles.ledgerRow, { backgroundColor: theme.backgroundElement }]}>
              <View style={[styles.ledgerDot, { backgroundColor: item.points > 0 ? Status.successBg : Status.errorBg }]}>
                <Icon
                  name={item.points > 0 ? 'add' : 'remove'}
                  size={14}
                  color={item.points > 0 ? Status.success : Status.error}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ledgerReason, { color: theme.text }]}>{item.reason}</Text>
                <Text style={[styles.ledgerDate, { color: theme.textSecondary }]}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={[styles.ledgerPts, { color: item.points > 0 ? Status.success : Status.error }]}>
                {item.points > 0 ? '+' : ''}{item.points} pts
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:       { width: 32, alignItems: 'flex-start' },
  headerTitle:   { flex: 1, fontSize: 17, fontWeight: '700' },
  skeletons:     { padding: Spacing.four, gap: Spacing.three },
  list:          { padding: Spacing.four, gap: Spacing.three, paddingBottom: 40 },
  pointsCard:    { borderRadius: 20, padding: Spacing.four, gap: Spacing.one, alignItems: 'center' },
  tierBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: Spacing.one },
  tierText:      { fontSize: 12, fontWeight: '700' },
  pointsNum:     { color: '#fff', fontSize: 48, fontWeight: '900' },
  pointsLabel:   { color: 'rgba(255,255,255,0.8)', fontSize: 15 },
  pointsHint:    { color: 'rgba(255,255,255,0.65)', fontSize: 12, textAlign: 'center', marginTop: 4 },
  card:          { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  cardHeader:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  cardTitle:     { fontSize: 15, fontWeight: '700' },
  referralRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  codeBox:       { flex: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  codeText:      { fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  copyBtn:       { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  copyBtnText:   { color: '#fff', fontSize: 13, fontWeight: '700' },
  referralCount: { fontSize: 13 },
  tierRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one, paddingHorizontal: 4 },
  tierRowName:   { fontSize: 13, fontWeight: '600' },
  tierRowBenefit:{ fontSize: 12 },
  sectionLabel:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  ledgerRow:     { borderRadius: 12, padding: Spacing.two + 2, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  ledgerDot:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ledgerReason:  { fontSize: 14, fontWeight: '500' },
  ledgerDate:    { fontSize: 12 },
  ledgerPts:     { fontSize: 14, fontWeight: '700' },
  empty:         { alignItems: 'center', paddingTop: 40, gap: Spacing.two },
  emptyTitle:    { fontSize: 18, fontWeight: '700' },
  emptyHint:     { fontSize: 14, textAlign: 'center' },
});
