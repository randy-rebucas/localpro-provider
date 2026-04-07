/**
 * Provider Boost
 * Docs: mobile-provider-profile-api.md §11
 *
 * GET    /api/provider/boost        — active boosts, history, balance, prices
 * POST   /api/provider/boost        — purchase boost
 * DELETE /api/provider/boost/[id]   — cancel boost
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  cancelBoost,
  getBoostData,
  purchaseBoost,
  type BoostItem,
  type BoostType,
} from '@/api/provider-profile';
import { Icon } from '@/components/icon';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const BOOST_META: Record<BoostType, { icon: string; label: string; desc: string; color: string }> = {
  featured_provider: {
    icon: 'star',
    label: 'Featured Provider',
    desc: 'Stand out in the Featured section on the browse page',
    color: '#f59e0b',
  },
  top_search: {
    icon: 'search',
    label: 'Top Search',
    desc: 'Appear at the top of relevant search results',
    color: Primary[500],
  },
  homepage_highlight: {
    icon: 'home',
    label: 'Homepage Highlight',
    desc: 'Get featured in the homepage widget for all users',
    color: '#8b5cf6',
  },
};

function daysLeft(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

export default function BoostScreen() {
  const theme  = useTheme();
  const router = useRouter();
  const qc     = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['boost'],
    queryFn:  getBoostData,
    staleTime: 1000 * 60 * 2,
  });

  const purchaseMutation = useMutation({
    mutationFn: ({ type, payWith }: { type: BoostType; payWith: 'wallet' | 'paymongo' }) =>
      purchaseBoost(type, payWith),
    onSuccess: (res) => {
      if (res.checkoutUrl) {
        Linking.openURL(res.checkoutUrl);
      } else {
        Alert.alert('Boost Activated!', 'Your boost is now live for 7 days.');
      }
      qc.invalidateQueries({ queryKey: ['boost'] });
    },
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.error ?? 'Could not activate boost.'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelBoost(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boost'] }),
    onError: () => Alert.alert('Error', 'Could not cancel boost.'),
  });

  function handlePurchase(type: BoostType, price: number) {
    const balance = data?.balance ?? 0;
    const meta    = BOOST_META[type];
    if (balance >= price) {
      Alert.alert(
        `Activate ${meta.label}`,
        `₱${price} will be deducted from your wallet (balance: ₱${balance.toLocaleString()}). This boost lasts 7 days.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Pay with Wallet', onPress: () => purchaseMutation.mutate({ type, payWith: 'wallet' }) },
          { text: 'Pay with Card', onPress: () => purchaseMutation.mutate({ type, payWith: 'paymongo' }) },
        ],
      );
    } else {
      Alert.alert(
        'Insufficient Wallet Balance',
        `Your wallet (₱${balance.toLocaleString()}) is below ₱${price}. Pay with card instead?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Pay with Card', onPress: () => purchaseMutation.mutate({ type, payWith: 'paymongo' }) },
        ],
      );
    }
  }

  const activeTypes = new Set(data?.activeBoosts.map((b) => b.type) ?? []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Provider Boost</Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={Primary[500]} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Wallet balance card ──────────────────────────── */}
          <View style={[styles.balanceCard, { backgroundColor: Primary[600] }]}>
            <View style={styles.balanceBubble1} />
            <View style={styles.balanceBubble2} />
            <View style={styles.balanceInner}>
              <View style={styles.balanceLabelRow}>
                <Icon name="wallet-outline" size={15} color="rgba(255,255,255,0.75)" />
                <Text style={styles.balanceLabel}>Wallet Balance</Text>
              </View>
              <Text style={styles.balanceAmt}>₱{(data?.balance ?? 0).toLocaleString()}</Text>
              <Text style={styles.balanceHint}>Available to spend on boosts</Text>
            </View>
          </View>

          {/* ── Info banner ──────────────────────────────────── */}
          <View style={[styles.infoBanner, { backgroundColor: Primary[50] }]}>
            <Icon name="flash" size={16} color={Primary[500]} />
            <Text style={[styles.infoText, { color: Primary[700] }]}>
              Boosts run for <Text style={{ fontWeight: '700' }}>7 days</Text> and increase your visibility to clients.
            </Text>
          </View>

          {/* ── Active boosts ─────────────────────────────────── */}
          {(data?.activeBoosts.length ?? 0) > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>ACTIVE BOOSTS</Text>
              <View style={[styles.group, { backgroundColor: theme.backgroundElement }]}>
                {data!.activeBoosts.map((boost: BoostItem, i) => {
                  const meta = BOOST_META[boost.type];
                  const days = daysLeft(boost.expiresAt);
                  const isLast = i === data!.activeBoosts.length - 1;
                  return (
                    <View key={boost._id}>
                      <View style={styles.activeRow}>
                        <View style={[styles.iconWrap, { backgroundColor: Status.success + '20' }]}>
                          <Icon name={meta.icon as any} size={20} color={Status.success} />
                        </View>
                        <View style={{ flex: 1, gap: 3 }}>
                          <View style={styles.rowTop}>
                            <Text style={[styles.boostLabel, { color: theme.text }]}>{meta.label}</Text>
                            <View style={[styles.daysPill, { backgroundColor: Status.success + '20' }]}>
                              <Text style={[styles.daysText, { color: Status.success }]}>{days}d left</Text>
                            </View>
                          </View>
                          <Text style={[styles.boostDesc, { color: theme.textSecondary }]}>{meta.desc}</Text>
                          {/* progress bar */}
                          <View style={[styles.track, { backgroundColor: theme.background }]}>
                            <View style={[styles.fill, { backgroundColor: Status.success, width: `${Math.min(100, (days / 7) * 100)}%` as any }]} />
                          </View>
                        </View>
                        <Pressable
                          style={[styles.cancelBtn, { borderColor: Status.error + '60' }]}
                          onPress={() =>
                            Alert.alert('Cancel Boost', 'No refund will be issued. Cancel this boost?', [
                              { text: 'No', style: 'cancel' },
                              { text: 'Cancel Boost', style: 'destructive', onPress: () => cancelMutation.mutate(boost._id) },
                            ])
                          }
                        >
                          <Text style={[styles.cancelBtnText, { color: Status.error }]}>Cancel</Text>
                        </Pressable>
                      </View>
                      {!isLast && <View style={[styles.divider, { backgroundColor: theme.background }]} />}
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* ── Available boosts ──────────────────────────────── */}
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>AVAILABLE BOOSTS</Text>
          <View style={styles.boostGrid}>
            {(Object.keys(BOOST_META) as BoostType[]).map((type) => {
              const meta     = BOOST_META[type];
              const price    = data?.prices?.[type] ?? 0;
              const isActive = activeTypes.has(type);
              const isPending = purchaseMutation.isPending && purchaseMutation.variables?.type === type;
              return (
                <View key={type} style={[styles.boostCard, { backgroundColor: theme.backgroundElement }]}>
                  <View style={[styles.boostCardAccent, { backgroundColor: meta.color }]} />
                  <View style={styles.boostCardBody}>
                    <View style={[styles.iconWrap, { backgroundColor: meta.color + '18' }]}>
                      <Icon name={meta.icon as any} size={22} color={meta.color} />
                    </View>
                    <Text style={[styles.boostLabel, { color: theme.text, marginTop: 10 }]}>{meta.label}</Text>
                    <Text style={[styles.boostDesc, { color: theme.textSecondary, marginTop: 3 }]}>{meta.desc}</Text>

                    <View style={styles.boostCardFooter}>
                      <Text style={[styles.boostPrice, { color: meta.color }]}>₱{price.toLocaleString()}</Text>
                      <Pressable
                        style={[
                          styles.activateBtn,
                          { backgroundColor: isActive ? Status.successBg : meta.color },
                        ]}
                        onPress={() => !isActive && handlePurchase(type, price)}
                        disabled={isActive || purchaseMutation.isPending}
                      >
                        {isPending ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={[styles.activateBtnText, { color: isActive ? Status.success : '#fff' }]}>
                            {isActive ? '✓ Active' : 'Activate'}
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* ── History ──────────────────────────────────────── */}
          {(data?.history.length ?? 0) > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>HISTORY</Text>
              <View style={[styles.group, { backgroundColor: theme.backgroundElement }]}>
                {data!.history.map((boost: BoostItem, i) => {
                  const meta   = BOOST_META[boost.type];
                  const isLast = i === data!.history.length - 1;
                  return (
                    <View key={boost._id}>
                      <View style={styles.historyRow}>
                        <View style={[styles.historyIcon, { backgroundColor: theme.background }]}>
                          <Icon name={meta.icon as any} size={15} color={theme.textSecondary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.historyLabel, { color: theme.text }]}>{meta.label}</Text>
                          <Text style={[styles.historyDate, { color: theme.textSecondary }]}>
                            Expired {new Date(boost.expiresAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </Text>
                        </View>
                        <View style={[styles.expiredPill, { backgroundColor: theme.background }]}>
                          <Text style={[styles.expiredText, { color: theme.textSecondary }]}>Expired</Text>
                        </View>
                      </View>
                      {!isLast && <View style={[styles.divider, { backgroundColor: theme.background }]} />}
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1 },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:          { width: 32, alignItems: 'flex-start' },
  headerTitle:      { fontSize: 17, fontWeight: '700' },
  scroll:           { padding: Spacing.four, gap: Spacing.three, paddingBottom: BottomTabInset + 24 },

  /* Wallet card */
  balanceCard:      { borderRadius: 20, padding: Spacing.four, overflow: 'hidden', minHeight: 120 },
  balanceBubble1:   { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.07)', top: -50, right: -30 },
  balanceBubble2:   { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.07)', bottom: -30, left: 20 },
  balanceInner:     { gap: 4 },
  balanceLabelRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  balanceLabel:     { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '500' },
  balanceAmt:       { color: '#fff', fontSize: 36, fontWeight: '800', letterSpacing: -0.5 },
  balanceHint:      { color: 'rgba(255,255,255,0.55)', fontSize: 12 },

  /* Info banner */
  infoBanner:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: 12, padding: Spacing.three },
  infoText:         { flex: 1, fontSize: 13, lineHeight: 19 },

  /* Section label */
  sectionLabel:     { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 4, marginBottom: 4 },

  /* Grouped card */
  group:            { borderRadius: 16, overflow: 'hidden' },
  divider:          { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.three },

  /* Active boost row */
  activeRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, padding: Spacing.three },
  rowTop:           { flexDirection: 'row', alignItems: 'center', gap: 8 },
  daysPill:         { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  daysText:         { fontSize: 11, fontWeight: '700' },
  track:            { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  fill:             { height: 4, borderRadius: 2 },

  /* Shared icon */
  iconWrap:         { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },

  /* Boost card grid */
  boostGrid:        { gap: Spacing.two },
  boostCard:        { borderRadius: 16, overflow: 'hidden' },
  boostCardAccent:  { height: 4 },
  boostCardBody:    { padding: Spacing.three, paddingBottom: Spacing.three },
  boostCardFooter:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.two },
  boostLabel:       { fontSize: 15, fontWeight: '700' },
  boostDesc:        { fontSize: 13, lineHeight: 19 },
  boostPrice:       { fontSize: 18, fontWeight: '800' },
  activateBtn:      { borderRadius: 10, paddingHorizontal: 18, paddingVertical: 9 },
  activateBtnText:  { fontSize: 13, fontWeight: '700' },

  /* Cancel */
  cancelBtn:        { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start', marginTop: 2 },
  cancelBtnText:    { fontSize: 12, fontWeight: '600' },

  /* History */
  historyRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three },
  historyIcon:      { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  historyLabel:     { fontSize: 14, fontWeight: '600' },
  historyDate:      { fontSize: 12, marginTop: 2 },
  expiredPill:      { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  expiredText:      { fontSize: 11, fontWeight: '600' },
});
