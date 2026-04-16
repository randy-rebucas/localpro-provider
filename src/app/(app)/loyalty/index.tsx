import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert, FlatList, Pressable, RefreshControl, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getLoyalty, getReferral, type LoyaltyLedgerEntry } from '@/api/loyalty';
import { Icon } from '@/components/icon';
import { CardSkeleton } from '@/components/loading-skeleton';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TIERS = [
  { key: 'bronze',   label: 'Bronze',   pts: 0,      color: '#cd7f32', bg: '#fdf2e4', benefit: 'Basic visibility',                 icon: 'medal-outline'  },
  { key: 'silver',   label: 'Silver',   pts: 500,    color: '#9e9e9e', bg: '#f4f4f5', benefit: 'Priority job matching',            icon: 'medal-outline'  },
  { key: 'gold',     label: 'Gold',     pts: 2000,   color: '#f59e0b', bg: '#fffbeb', benefit: '5% commission discount',           icon: 'trophy-outline' },
  { key: 'platinum', label: 'Platinum', pts: 10000,  color: Primary[500], bg: Primary[50], benefit: 'Dedicated manager + 10% off', icon: 'trophy'         },
] as const;

function normalizeTier(raw: string): string {
  return raw?.toLowerCase() ?? 'bronze';
}

function getTierProgress(points: number, tier: string) {
  const idx  = TIERS.findIndex((t) => t.key === tier);
  const curr = TIERS[idx >= 0 ? idx : 0];
  const next = TIERS[idx + 1];
  if (!next || !curr) return { pct: 100, nextLabel: null, ptsNeeded: 0 };
  const range = next.pts - curr.pts;
  if (range <= 0) return { pct: 100, nextLabel: null, ptsNeeded: 0 };
  const done = points - curr.pts;
  return {
    pct:       Math.min(100, Math.max(0, Math.round((done / range) * 100))),
    nextLabel: next.label,
    ptsNeeded: Math.max(0, next.pts - points),
  };
}

export default function LoyaltyScreen() {
  const theme  = useTheme();
  const router = useRouter();

  const {
    data: loyalty,
    isLoading: loyaltyLoading,
    isError: loyaltyError,
    refetch: refetchLoyalty,
    isRefetching,
  } = useQuery({
    queryKey: ['loyalty'],
    queryFn:  getLoyalty,
    staleTime: 1000 * 60 * 2,
  });

  const {
    data: referral,
    isLoading: referralLoading,
    refetch: refetchReferral,
  } = useQuery({
    queryKey: ['referral'],
    queryFn:  getReferral,
    staleTime: 1000 * 60 * 5,
  });

  async function handleRefresh() {
    await Promise.all([refetchLoyalty(), refetchReferral()]);
  }

  const isLoading   = loyaltyLoading || referralLoading;
  const tier        = normalizeTier(loyalty?.account?.tier ?? 'bronze');
  const tierMeta    = TIERS.find((t) => t.key === tier) ?? TIERS[0];
  const points      = loyalty?.account?.points ?? 0;
  const { pct, nextLabel, ptsNeeded } = getTierProgress(points, tier);

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
      {/* ── Header ───────────────────────────────────────────── */}
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
      ) : loyaltyError ? (
        <View style={styles.errorWrap}>
          <Icon name="alert-circle-outline" size={52} color="#ef4444" />
          <Text style={[styles.errorTitle, { color: theme.text }]}>Couldn't load loyalty data</Text>
          <Pressable onPress={() => refetchLoyalty()} style={[styles.retryBtn, { backgroundColor: Primary[500] }]}>
            <Icon name="refresh-outline" size={15} color="#fff" />
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={loyalty?.ledger ?? []}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={Primary[500]} />}
          ListHeaderComponent={
            <>
              {/* ── Hero points card ─────────────────────────── */}
              <View style={[styles.heroCard, { backgroundColor: tierMeta.color, marginBottom: Spacing.three  }]}>
                {/* Decorative circles */}
                <View style={styles.heroBgCircle1} />
                <View style={styles.heroBgCircle2} />

                <View style={styles.heroInner}>
                  {/* Tier badge */}
                  <View style={[styles.tierPill, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
                    <Icon name={tierMeta.icon as any} size={13} color="#fff" />
                    <Text style={styles.tierPillText}>{tierMeta.label} Member</Text>
                  </View>

                  {/* Points */}
                  <Text style={styles.heroPoints}>{points.toLocaleString()}</Text>
                  <Text style={styles.heroPointsLabel}>Loyalty Points</Text>

                  {/* Progress to next tier */}
                  <View style={styles.progressWrap}>
                    <View style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: '#fff' }]} />
                    </View>
                    {nextLabel ? (
                      <Text style={styles.progressHint}>{ptsNeeded.toLocaleString()} pts to {nextLabel}</Text>
                    ) : (
                      <Text style={styles.progressHint}>You've reached the top tier!</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* ── Referral card ────────────────────────────── */}
              {referral && (
                <View style={[styles.card, { backgroundColor: theme.backgroundElement, marginBottom: Spacing.three }]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardIconWrap, { backgroundColor: Primary[50] }]}>
                      <Icon name="people" size={18} color={Primary[500]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: theme.text }]}>Referral Program</Text>
                      <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
                        {referral.referredCount} provider{referral.referredCount !== 1 ? 's' : ''} referred
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.codeRow, { backgroundColor: theme.background, borderColor: Primary[100] }]}>
                    <Text style={[styles.codeLabel, { color: theme.textSecondary }]}>Your code</Text>
                    <Text style={[styles.codeValue, { color: Primary[600] }]}>{referral.referralCode}</Text>
                  </View>

                  <Pressable style={[styles.shareBtn, { backgroundColor: Primary[500] }]} onPress={shareReferral}>
                    <Icon name="share-social-outline" size={18} color="#fff" />
                    <Text style={styles.shareBtnText}>Share Referral Link</Text>
                  </Pressable>
                </View>
              )}

              {/* ── Tier benefits ────────────────────────────── */}
              <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconWrap, { backgroundColor: '#fffbeb' }]}>
                    <Icon name="trophy" size={18} color="#f59e0b" />
                  </View>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Tier Benefits</Text>
                </View>

                <View style={styles.tiersGrid}>
                  {TIERS.map((row, idx) => {
                    const isActive  = tier === row.key;
                    const isPassed  = TIERS.findIndex((t) => t.key === tier) > idx;
                    return (
                      <View
                        key={row.key}
                        style={[
                          styles.tierItem,
                          { borderColor: isActive ? row.color : 'transparent', backgroundColor: isActive ? row.bg : theme.background },
                          isActive && { borderWidth: 1.5 },
                        ]}
                      >
                        <View style={[styles.tierItemIcon, { backgroundColor: row.bg }]}>
                          <Icon name={row.icon as any} size={18} color={row.color} />
                        </View>
                        <Text style={[styles.tierItemLabel, { color: isActive || isPassed ? row.color : theme.textSecondary, fontWeight: isActive ? '800' : '600' }]}>
                          {row.label}
                        </Text>
                        <Text style={[styles.tierItemPts, { color: theme.textSecondary }]}>
                          {row.pts.toLocaleString()}+ pts
                        </Text>
                        <Text style={[styles.tierItemBenefit, { color: theme.textSecondary }]} numberOfLines={2}>
                          {row.benefit}
                        </Text>
                        {isActive && (
                          <View style={[styles.activeTierDot, { backgroundColor: row.color }]}>
                            <Icon name="checkmark" size={10} color="#fff" />
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* ── History header ───────────────────────────── */}
              {(loyalty?.ledger?.length ?? 0) > 0 && (
                <View style={styles.historyHeader}>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Points History</Text>
                  <Text style={[styles.historyCount, { color: theme.textSecondary }]}>
                    {loyalty!.ledger.length} transactions
                  </Text>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={[styles.emptyIconWrap, { backgroundColor: Primary[50] }]}>
                <Icon name="star-outline" size={32} color={Primary[400]} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No points yet</Text>
              <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
                Complete jobs and refer providers to start earning loyalty points.
              </Text>
            </View>
          }
          renderItem={({ item }: { item: LoyaltyLedgerEntry }) => {
            const isPositive = item.points > 0;
            return (
              <View style={[styles.ledgerRow, { backgroundColor: theme.backgroundElement }]}>
                <View style={[styles.ledgerIcon, { backgroundColor: isPositive ? Status.successBg : Status.errorBg }]}>
                  <Icon
                    name={isPositive ? 'trending-up-outline' : 'trending-down-outline'}
                    size={16}
                    color={isPositive ? Status.success : Status.error}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ledgerReason, { color: theme.text }]}>{item.reason}</Text>
                  <Text style={[styles.ledgerDate, { color: theme.textSecondary }]}>
                    {(() => { const d = new Date(item.createdAt); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }); })()}
                  </Text>
                </View>
                <View style={[styles.ledgerPtsBadge, { backgroundColor: isPositive ? Status.successBg : Status.errorBg }]}>
                  <Text style={[styles.ledgerPts, { color: isPositive ? Status.success : Status.error }]}>
                    {isPositive ? '+' : ''}{item.points}
                  </Text>
                  <Text style={[styles.ledgerPtsUnit, { color: isPositive ? Status.success : Status.error }]}>pts</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1 },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:         { width: 32, alignItems: 'flex-start' },
  headerTitle:     { fontSize: 17, fontWeight: '700' },
  skeletons:       { padding: Spacing.four, gap: Spacing.three },
  list:            { padding: Spacing.four, gap: Spacing.three, paddingBottom: BottomTabInset + 24 },
  errorWrap:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.five },
  errorTitle:      { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  retryBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two + 2, marginTop: 4 },
  retryBtnText:    { color: '#fff', fontSize: 14, fontWeight: '700' },

  /* Hero card */
  heroCard:        { borderRadius: 24, padding: Spacing.four, paddingVertical: Spacing.five, overflow: 'hidden', minHeight: 200 },
  heroBgCircle1:   { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.08)', top: -60, right: -40 },
  heroBgCircle2:   { position: 'absolute', width: 140, height: 140, borderRadius: 70,  backgroundColor: 'rgba(255,255,255,0.06)', bottom: -30, left: -20 },
  heroInner:       { alignItems: 'center', gap: Spacing.two },
  tierPill:        { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  tierPillText:    { color: '#fff', fontSize: 12, fontWeight: '700' },
  heroPoints:      { color: '#fff', fontSize: 52, fontWeight: '900', lineHeight: 58 },
  heroPointsLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: -4 },
  progressWrap:    { width: '100%', gap: 6, marginTop: Spacing.one },
  progressTrack:   { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:    { height: 6, borderRadius: 3 },
  progressHint:    { color: 'rgba(255,255,255,0.7)', fontSize: 11, textAlign: 'center' },

  /* Shared card */
  card:            { borderRadius: 18, padding: Spacing.four, gap: Spacing.three },
  cardHeader:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  cardIconWrap:    { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  cardTitle:       { fontSize: 15, fontWeight: '700' },
  cardSub:         { fontSize: 12, marginTop: 1 },

  /* Referral */
  codeRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderWidth: 1.5, borderStyle: 'dashed' },
  codeLabel:       { fontSize: 12, fontWeight: '600' },
  codeValue:       { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  shareBtn:        { borderRadius: 12, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  shareBtnText:    { color: '#fff', fontSize: 14, fontWeight: '700' },

  /* Tier grid */
  tiersGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tierItem:        { flex: 1, minWidth: '44%', borderRadius: 14, padding: Spacing.three, gap: 5, position: 'relative' },
  tierItemIcon:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  tierItemLabel:   { fontSize: 13 },
  tierItemPts:     { fontSize: 11 },
  tierItemBenefit: { fontSize: 11, lineHeight: 16 },
  activeTierDot:   { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  /* History */
  historyHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel:    { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  historyCount:    { fontSize: 11 },

  /* Ledger */
  ledgerRow:       { borderRadius: 14, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  ledgerIcon:      { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  ledgerReason:    { fontSize: 14, fontWeight: '500' },
  ledgerDate:      { fontSize: 12, marginTop: 1 },
  ledgerPtsBadge:  { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center' },
  ledgerPts:       { fontSize: 15, fontWeight: '800' },
  ledgerPtsUnit:   { fontSize: 10, fontWeight: '600', marginTop: -2 },

  /* Empty */
  emptyCard:       { borderRadius: 18, padding: Spacing.five, alignItems: 'center', gap: Spacing.two },
  emptyIconWrap:   { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.one },
  emptyTitle:      { fontSize: 18, fontWeight: '700' },
  emptyHint:       { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
