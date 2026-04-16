import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getProviderProfile } from '@/api/auth';
import { getWallet } from '@/api/earnings';
import { getMyJobs, getMyJobsCount, type Job } from '@/api/jobs';
import { getQuotedJobIds } from '@/api/quotes';
import { AppHeader } from '@/components/app-header';
import { Icon, type IconName } from '@/components/icon';
import { StatusChip } from '@/components/status-chip';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/auth-store';

/* ── Time-based greeting ──────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/* ── Stat card ────────────────────────────────────────────────── */
function StatCard({
  label, value, icon, color, onPress, loading,
}: {
  label: string; value: string; icon: IconName; color: string;
  onPress?: () => void; loading?: boolean;
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
      <Text style={[styles.statValue, { color }]}>
        {loading ? '…' : value}
      </Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

/* ── Recent job row ───────────────────────────────────────────── */
function RecentJobRow({ job, onPress }: { job: Job; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.jobRow,
        { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.75 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={styles.jobRowMain}>
        <Text style={[styles.jobRowTitle, { color: theme.text }]} numberOfLines={1}>
          {job.title}
        </Text>
        <View style={styles.jobRowMeta}>
          <Icon name="location-outline" size={12} color={theme.textSecondary} />
          <Text style={[styles.jobRowSub, { color: theme.textSecondary }]} numberOfLines={1}>
            {job.location}
          </Text>
        </View>
      </View>
      <View style={styles.jobRowRight}>
        <Text style={[styles.jobRowBudget, { color: Primary[500] }]}>
          ₱{job.budget.toLocaleString()}
        </Text>
        <StatusChip status={job.status} />
      </View>
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
  const theme  = useTheme();
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);

  const { data: profile } = useQuery({
    queryKey:  ['provider-profile'],
    queryFn:   getProviderProfile,
    staleTime: 1000 * 60 * 5,
  });

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey:  ['wallet'],
    queryFn:   getWallet,
    staleTime: 1000 * 60,
  });

  const { data: activeJobsCount, isLoading: activeLoading } = useQuery({
    queryKey:  ['my-jobs-count', 'active'],
    queryFn:   () => getMyJobsCount('active'),
    staleTime: 1000 * 60,
  });

  const { data: quotedIds, isLoading: quotesLoading } = useQuery({
    queryKey:  ['quoted-job-ids'],
    queryFn:   getQuotedJobIds,
    staleTime: 1000 * 60,
  });

  const {
    data: recentJobs,
    isLoading: recentLoading,
    refetch: refetchRecent,
    isRefetching,
  } = useQuery({
    queryKey:  ['my-jobs-recent'],
    queryFn:   () => getMyJobs({ limit: 5 }),
    staleTime: 1000 * 60,
  });

  const avgRating = profile?.avgRating ?? 0;

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

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetchRecent}
            tintColor={Primary[500]}
          />
        }
      >

        {/* ── Stats grid ──────────────────────────────────── */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Active Jobs"
            value={activeJobsCount != null ? String(activeJobsCount) : '—'}
            icon="briefcase-outline"
            color={Primary[500]}
            loading={activeLoading}
            onPress={() => router.push('/(app)/jobs')}
          />
          <StatCard
            label="Quoted Jobs"
            value={quotedIds != null ? String(quotedIds.length) : '—'}
            icon="document-text-outline"
            color="#8b5cf6"
            loading={quotesLoading}
            onPress={() => router.push('/(app)/quotes')}
          />
          <StatCard
            label="Wallet"
            value={wallet != null ? `₱${wallet.balance.toLocaleString()}` : '—'}
            icon="wallet-outline"
            color={Status.success}
            loading={walletLoading}
            onPress={() => router.push('/(app)/earnings')}
          />
          <StatCard
            label="Avg Rating"
            value={avgRating > 0 ? avgRating.toFixed(1) : '—'}
            icon="star-outline"
            color="#f59e0b"
          />
        </View>

        {/* ── Quick actions ────────────────────────────────── */}
        <View>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
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

        {/* ── Recent activity ──────────────────────────────── */}
        <View>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Jobs</Text>
            <Pressable onPress={() => router.push('/(app)/jobs')}>
              <Text style={[styles.sectionLink, { color: Primary[500] }]}>See all</Text>
            </Pressable>
          </View>

          {recentLoading ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>Loading…</Text>
            </View>
          ) : recentJobs && recentJobs.length > 0 ? (
            <View style={styles.jobList}>
              {recentJobs.map((job) => (
                <RecentJobRow
                  key={job._id}
                  job={job}
                  onPress={() => router.push(`/(app)/jobs/${job._id}` as any)}
                />
              ))}
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={[styles.emptyIconWrap, { backgroundColor: Primary[50] }]}>
                <Icon name="briefcase-outline" size={28} color={Primary[400]} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No jobs yet</Text>
              <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
                Browse open jobs in the marketplace and submit your first quote.
              </Text>
              <Pressable
                style={[styles.emptyBtn, { backgroundColor: Primary[500] }]}
                onPress={() => router.push('/(app)/marketplace')}
              >
                <Icon name="search-outline" size={15} color="#fff" />
                <Text style={styles.emptyBtnText}>Browse Jobs</Text>
              </Pressable>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1 },
  scroll:           { padding: Spacing.four, gap: Spacing.three, paddingBottom: BottomTabInset + 16 },

  /* Greeting */
  greeting:         { fontSize: 13, fontWeight: '500' },
  name:             { fontSize: 21, fontWeight: '800', marginTop: 1 },

  /* Stats */
  statsGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  statCard:         { flex: 1, minWidth: '45%', borderRadius: 16, padding: Spacing.three, gap: Spacing.one },
  statIconWrap:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue:        { fontSize: 22, fontWeight: '800' },
  statLabel:        { fontSize: 12 },

  /* Section header */
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.two },
  sectionTitle:     { fontSize: 16, fontWeight: '700', marginBottom: Spacing.two },
  sectionLink:      { fontSize: 13, fontWeight: '600' },

  /* Quick actions */
  quickGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  quickCard:        { flex: 1, minWidth: '44%', borderRadius: 16, padding: Spacing.three, alignItems: 'center', gap: 10 },
  quickIconWrap:    { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickLabel:       { fontSize: 13, fontWeight: '600', textAlign: 'center' },

  /* Recent job rows */
  jobList:          { gap: Spacing.two },
  jobRow:           { borderRadius: 14, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  jobRowMain:       { flex: 1, gap: 4 },
  jobRowTitle:      { fontSize: 14, fontWeight: '600' },
  jobRowMeta:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  jobRowSub:        { fontSize: 12, flex: 1 },
  jobRowRight:      { alignItems: 'flex-end', gap: 4 },
  jobRowBudget:     { fontSize: 14, fontWeight: '700' },

  /* Empty state */
  emptyCard:        { borderRadius: 16, padding: Spacing.four, alignItems: 'center', gap: Spacing.two },
  emptyIconWrap:    { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:       { fontSize: 16, fontWeight: '700' },
  emptyHint:        { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  emptyBtn:         { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 11, paddingHorizontal: 18, paddingVertical: 10, marginTop: 4 },
  emptyBtnText:     { color: '#fff', fontSize: 14, fontWeight: '700' },
});
