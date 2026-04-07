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

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: theme.backgroundElement }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const QUICK_ACTIONS: { label: string; icon: IconName; route: string }[] = [
  { label: 'Browse Jobs',  icon: 'search-outline',        route: '/(app)/marketplace' },
  { label: 'My Quotes',   icon: 'document-text-outline',  route: '/(app)/quotes' },
  { label: 'Earnings',    icon: 'wallet-outline',         route: '/(app)/earnings' },
  { label: 'Messages',    icon: 'chatbubble-outline',     route: '/(app)/messages' },
];

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const balance = useEarningsStore((s) => s.balance);

  const { data: profile } = useQuery({
    queryKey: ['provider-profile'],
    queryFn: getProviderProfile,
    staleTime: 1000 * 60 * 5,
  });

  const completionPct = profile?.completionPercent ?? 0;
  const avgRating = profile?.avgRating ?? 0;

  const greetingLeft = (
    <View>
      <Text style={[styles.greeting, { color: theme.textSecondary }]}>Good day</Text>
      <Text style={[styles.name, { color: theme.text }]}>{user?.name ?? 'Provider'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <AppHeader title="Home" left={greetingLeft} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile completion banner */}
        {completionPct < 100 && (
          <Pressable
            style={[styles.completionCard, { backgroundColor: Primary[50] }]}
            onPress={() => router.push('/(app)/profile')}
          >
            <View style={styles.completionTop}>
              <Text style={[styles.completionTitle, { color: Primary[700] }]}>
                Complete your profile ({completionPct}%)
              </Text>
              <Icon name="chevron-forward" size={18} color={Primary[500]} />
            </View>
            <View style={[styles.progressTrack, { backgroundColor: Primary[100] }]}>
              <View style={[styles.progressFill, { backgroundColor: Primary[500], width: `${completionPct}%` }]} />
            </View>
          </Pressable>
        )}

        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatCard label="Active Jobs"    value="—"   color={Primary[500]} />
          <StatCard label="Pending Quotes" value="—"   color={Status.warning} />
          <StatCard
            label="Wallet"
            value={balance != null ? `₱${balance.toLocaleString()}` : '—'}
            color={Status.success}
          />
          <StatCard
            label="Avg Rating"
            value={avgRating > 0 ? avgRating.toFixed(1) : '—'}
            color="#f59e0b"
          />
        </View>

        {/* Quick actions */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
        <View style={styles.quickActions}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.label}
              style={[styles.quickCard, { backgroundColor: theme.backgroundElement }]}
              onPress={() => router.push(action.route as any)}
            >
              <Icon name={action.icon} size={28} color={Primary[500]} />
              <Text style={[styles.quickLabel, { color: theme.text }]}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Recent activity placeholder */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Activity</Text>
        <View style={[styles.emptyActivity, { backgroundColor: theme.backgroundElement }]}>
          <Icon name="time-outline" size={32} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No recent activity yet. Start by browsing the marketplace.
          </Text>
          <Pressable
            style={styles.emptyLinkRow}
            onPress={() => router.push('/(app)/marketplace')}
          >
            <Text style={[styles.emptyLink, { color: Primary[500] }]}>Browse open jobs</Text>
            <Icon name="arrow-forward" size={14} color={Primary[500]} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.four, gap: Spacing.four, paddingBottom: BottomTabInset },
  greeting: { fontSize: 14 },
  name: { fontSize: 22, fontWeight: '700' },
  completionCard: { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  completionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  completionTitle: { fontSize: 14, fontWeight: '600' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  statCard: { flex: 1, minWidth: '45%', borderRadius: 16, padding: Spacing.three, gap: Spacing.one },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 13 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  quickCard: { flex: 1, minWidth: '44%', borderRadius: 16, padding: Spacing.three, alignItems: 'center', gap: Spacing.one },
  quickLabel: { fontSize: 13, fontWeight: '600' },
  emptyActivity: { borderRadius: 16, padding: Spacing.four, gap: Spacing.two, alignItems: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  emptyLink: { fontSize: 14, fontWeight: '600' },
});
