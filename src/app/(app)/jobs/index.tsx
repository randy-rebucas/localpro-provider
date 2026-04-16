import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getMyJobs, type Job } from '@/api/jobs';
import { AppHeader } from '@/components/app-header';
import { Icon } from '@/components/icon';
import { CardSkeleton } from '@/components/loading-skeleton';
import { StatusChip } from '@/components/status-chip';
import { BottomTabInset, Primary, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TABS = [
  { key: 'active',    label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'disputed',  label: 'Disputed' },
  { key: 'withdrawn', label: 'Withdrawn' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function JobRow({ job, onPress }: { job: Job; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable style={[styles.row, { backgroundColor: theme.backgroundElement }]} onPress={onPress}>
      <View style={styles.rowMain}>
        <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={2}>{job.title}</Text>
        <View style={styles.locationRow}>
          <Icon name="location-outline" size={12} color={theme.textSecondary} />
          <Text style={[styles.rowClient, { color: theme.textSecondary }]} numberOfLines={1}>
            {job.location}
          </Text>
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowBudget, { color: Primary[500] }]}>₱{job.budget.toLocaleString()}</Text>
        <StatusChip status={job.status} />
      </View>
    </Pressable>
  );
}

export default function JobsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('active');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-jobs', activeTab],
    queryFn: () => getMyJobs({ status: activeTab }),
    staleTime: 1000 * 30,
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <AppHeader title="My Jobs" />

      <View style={styles.tabStrip}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tabBtn, activeTab === tab.key && { borderBottomColor: Primary[500], borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabLabel, { color: activeTab === tab.key ? Primary[500] : theme.textSecondary }]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Primary[500]} />}
          renderItem={({ item }) => (
            <JobRow job={item} onPress={() => router.push(`/(app)/jobs/${item._id}`)} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="briefcase-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No {activeTab} jobs</Text>
              {activeTab === 'active' && (
                <Pressable style={styles.emptyLinkRow} onPress={() => router.push('/(app)/marketplace')}>
                  <Text style={[styles.emptyLink, { color: Primary[500] }]}>Browse marketplace</Text>
                  <Icon name="arrow-forward" size={14} color={Primary[500]} />
                </Pressable>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  tabStrip: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.1)', paddingHorizontal: Spacing.four },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.two },
  tabLabel: { fontSize: 13, fontWeight: '600' },
  skeletons: { padding: Spacing.four, gap: Spacing.three },
  list: { padding: Spacing.four, gap: Spacing.two, paddingBottom: BottomTabInset },
  row: { borderRadius: 14, padding: Spacing.three, flexDirection: 'row', gap: Spacing.two },
  rowMain: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rowClient: { fontSize: 13 },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  rowBudget: { fontSize: 15, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.two },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  emptyLink: { fontSize: 14, fontWeight: '600' },
});
