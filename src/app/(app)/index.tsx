import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getProviderProfile } from '@/api/auth';
import { Primary, Spacing, Status } from '@/constants/theme';
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>Good day 👋</Text>
            <Text style={[styles.name, { color: theme.text }]}>{user?.name ?? 'Provider'}</Text>
          </View>
          <Pressable
            style={[styles.avatarCircle, { backgroundColor: Primary[100] }]}
            onPress={() => router.push('/(app)/profile')}
          >
            <Text style={[styles.avatarInitial, { color: Primary[700] }]}>
              {user?.name?.charAt(0).toUpperCase() ?? 'P'}
            </Text>
          </Pressable>
        </View>

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
              <Text style={[styles.completionCta, { color: Primary[500] }]}>Edit →</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: Primary[100] }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: Primary[500], width: `${completionPct}%` },
                ]}
              />
            </View>
          </Pressable>
        )}

        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatCard label="Active Jobs" value="—" color={Primary[500]} />
          <StatCard label="Pending Quotes" value="—" color={Status.warning} />
          <StatCard label="Wallet" value={balance != null ? `₱${balance.toLocaleString()}` : '—'} color={Status.success} />
          <StatCard label="Avg Rating" value={avgRating > 0 ? avgRating.toFixed(1) : '—'} color="#f59e0b" />
        </View>

        {/* Quick actions */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
        <View style={styles.quickActions}>
          {[
            { label: 'Browse Jobs', emoji: '🔍', route: '/(app)/marketplace' as const },
            { label: 'My Quotes', emoji: '📝', route: '/(app)/quotes' as const },
            { label: 'Earnings', emoji: '💰', route: '/(app)/earnings' as const },
            { label: 'Messages', emoji: '💬', route: '/(app)/messages' as const },
          ].map((action) => (
            <Pressable
              key={action.label}
              style={[styles.quickCard, { backgroundColor: theme.backgroundElement }]}
              onPress={() => router.push(action.route)}
            >
              <Text style={styles.quickEmoji}>{action.emoji}</Text>
              <Text style={[styles.quickLabel, { color: theme.text }]}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Recent activity placeholder */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Activity</Text>
        <View style={[styles.emptyActivity, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No recent activity yet. Start by browsing the marketplace.
          </Text>
          <Pressable onPress={() => router.push('/(app)/marketplace')}>
            <Text style={[styles.emptyLink, { color: Primary[500] }]}>Browse open jobs →</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { gap: 2 },
  greeting: { fontSize: 14 },
  name: { fontSize: 22, fontWeight: '700' },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 18, fontWeight: '700' },
  completionCard: { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  completionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  completionTitle: { fontSize: 14, fontWeight: '600' },
  completionCta: { fontSize: 13, fontWeight: '600' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 13 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  quickCard: {
    flex: 1,
    minWidth: '44%',
    borderRadius: 16,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
  },
  quickEmoji: { fontSize: 28 },
  quickLabel: { fontSize: 13, fontWeight: '600' },
  emptyActivity: { borderRadius: 16, padding: Spacing.four, gap: Spacing.two, alignItems: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyLink: { fontSize: 14, fontWeight: '600' },
});
