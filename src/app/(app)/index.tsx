import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getProviderProfile } from '@/api/auth';
import { AppHeader } from '@/components/app-header';
import { Icon, type IconName } from '@/components/icon';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/auth-store';
import { useEarningsStore } from '@/stores/earnings-store';

/* ── Time-based greeting ──────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/* ── Stat card ────────────────────────────────────────────────── */
function StatCard({
  label, value, icon, color, onPress,
}: {
  label: string; value: string; icon: IconName; color: string; onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      style={[styles.statCard, { backgroundColor: theme.backgroundElement }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.statIconWrap, { backgroundColor: color + '18' }]}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

/* ── Quick action card ────────────────────────────────────────── */
interface QuickAction {
  label: string;
  icon:  IconName;
  route: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Browse Jobs',  icon: 'search-outline',       route: '/(app)/marketplace', color: Primary[500]   },
  { label: 'My Quotes',   icon: 'document-text-outline', route: '/(app)/quotes',      color: '#8b5cf6'      },
  { label: 'Earnings',    icon: 'wallet-outline',        route: '/(app)/earnings',    color: Status.success },
  { label: 'Messages',    icon: 'chatbubble-outline',    route: '/(app)/messages',    color: '#f59e0b'      },
];

/* ── Screen ───────────────────────────────────────────────────── */
export default function DashboardScreen() {
  const theme   = useTheme();
  const router  = useRouter();
  const user    = useAuthStore((s) => s.user);
  const balance = useEarningsStore((s) => s.balance);

  const { data: profile } = useQuery({
    queryKey: ['provider-profile'],
    queryFn:  getProviderProfile,
    staleTime: 1000 * 60 * 5,
  });

  const completionPct = profile?.completionPercent ?? 0;
  const avgRating     = profile?.avgRating ?? 0;

  /* Greeting block rendered inside AppHeader's left slot */
  const greetingLeft = (
    <View>
      <Text style={[styles.greeting, { color: theme.textSecondary }]}>{getGreeting()} 👋</Text>
      <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
        {user?.name ?? 'Provider'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <AppHeader title="Home" left={greetingLeft} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Profile completion banner ─────────────────── */}
        {completionPct < 100 && (
          <Pressable
            style={[styles.completionCard, { backgroundColor: Primary[50] }]}
            onPress={() => router.push('/(app)/profile')}
          >
            <View style={styles.completionTop}>
              <View style={[styles.completionIconWrap, { backgroundColor: Primary[100] }]}>
                <Icon name="person-circle-outline" size={18} color={Primary[600]} />
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={[styles.completionTitle, { color: Primary[700] }]}>
                  Complete your profile
                </Text>
                <Text style={[styles.completionSub, { color: Primary[500] }]}>
                  {completionPct}% done · add more details to attract jobs
                </Text>
              </View>
              <Icon name="chevron-forward" size={16} color={Primary[400]} />
            </View>
            <View style={[styles.progressTrack, { backgroundColor: Primary[100] }]}>
              <View
                style={[styles.progressFill, {
                  backgroundColor: completionPct >= 80 ? Status.success : Primary[500],
                  width: `${completionPct}%` as any,
                }]}
              />
            </View>
          </Pressable>
        )}

        {/* ── Stats grid ────────────────────────────────── */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Active Jobs"
            value="—"
            icon="briefcase-outline"
            color={Primary[500]}
            onPress={() => router.push('/(app)/jobs')}
          />
          <StatCard
            label="Pending Quotes"
            value="—"
            icon="document-text-outline"
            color={Status.warning}
            onPress={() => router.push('/(app)/quotes')}
          />
          <StatCard
            label="Wallet"
            value={balance != null ? `₱${balance.toLocaleString()}` : '—'}
            icon="wallet-outline"
            color={Status.success}
            onPress={() => router.push('/(app)/earnings')}
          />
          <StatCard
            label="Avg Rating"
            value={avgRating > 0 ? `${avgRating.toFixed(1)} ★` : '—'}
            icon="star-outline"
            color="#f59e0b"
          />
        </View>

        {/* ── Quick actions ─────────────────────────────── */}
        <View>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
          </View>
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map((action) => (
              <Pressable
                key={action.label}
                style={({ pressed }) => [
                  styles.quickCard,
                  { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.75 : 1 },
                ]}
                onPress={() => router.push(action.route as any)}
              >
                <View style={[styles.quickIconWrap, { backgroundColor: action.color + '18' }]}>
                  <Icon name={action.icon} size={22} color={action.color} />
                </View>
                <Text style={[styles.quickLabel, { color: theme.text }]}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Recent activity ───────────────────────────── */}
        <View>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Activity</Text>
            <Pressable onPress={() => router.push('/(app)/jobs')}>
              <Text style={[styles.sectionLink, { color: Primary[500] }]}>See all</Text>
            </Pressable>
          </View>
          <View style={[styles.emptyCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={[styles.emptyIconWrap, { backgroundColor: Primary[50] }]}>
              <Icon name="time-outline" size={28} color={Primary[400]} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No activity yet</Text>
            <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
              Start by browsing open jobs in the marketplace.
            </Text>
            <Pressable
              style={[styles.emptyBtn, { backgroundColor: Primary[500] }]}
              onPress={() => router.push('/(app)/marketplace')}
            >
              <Icon name="search-outline" size={15} color="#fff" />
              <Text style={styles.emptyBtnText}>Browse Jobs</Text>
            </Pressable>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:               { flex: 1 },
  scroll:             { padding: Spacing.four, gap: Spacing.three, paddingBottom: BottomTabInset + 16 },

  /* Greeting */
  greeting:           { fontSize: 13, fontWeight: '500' },
  name:               { fontSize: 21, fontWeight: '800', marginTop: 1 },

  /* Completion banner */
  completionCard:     { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  completionTop:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  completionIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  completionTitle:    { fontSize: 14, fontWeight: '700' },
  completionSub:      { fontSize: 12 },
  progressTrack:      { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:       { height: 6, borderRadius: 3 },

  /* Stats */
  statsGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  statCard:           { flex: 1, minWidth: '45%', borderRadius: 16, padding: Spacing.three, gap: Spacing.one },
  statIconWrap:       { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue:          { fontSize: 22, fontWeight: '800' },
  statLabel:          { fontSize: 12 },

  /* Section header */
  sectionHeaderRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.two },
  sectionTitle:       { fontSize: 16, fontWeight: '700' },
  sectionLink:        { fontSize: 13, fontWeight: '600' },

  /* Quick actions */
  quickGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  quickCard:          { flex: 1, minWidth: '44%', borderRadius: 16, padding: Spacing.three, alignItems: 'center', gap: 10 },
  quickIconWrap:      { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickLabel:         { fontSize: 13, fontWeight: '600', textAlign: 'center' },

  /* Empty activity */
  emptyCard:          { borderRadius: 16, padding: Spacing.four, alignItems: 'center', gap: Spacing.two },
  emptyIconWrap:      { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:         { fontSize: 16, fontWeight: '700' },
  emptyHint:          { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  emptyBtn:           { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 11, paddingHorizontal: 18, paddingVertical: 10, marginTop: 4 },
  emptyBtnText:       { color: '#fff', fontSize: 14, fontWeight: '700' },
});
