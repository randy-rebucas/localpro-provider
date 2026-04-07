import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getJob } from '@/api/jobs';
import { Icon } from '@/components/icon';
import { StatusChip } from '@/components/status-chip';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function JobDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => getJob(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <ActivityIndicator style={{ flex: 1 }} color={Primary[500]} />
      </SafeAreaView>
    );
  }

  if (!job) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* Nav */}
      <View style={styles.nav}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="chevron-back" size={20} color={Primary[500]} />
          <Text style={[styles.back, { color: Primary[500] }]}>Back</Text>
        </Pressable>
        {job.isPriority && (
          <View style={[styles.priorityBadge, { backgroundColor: '#FEF3C7' }]}>
            <Icon name="star" size={12} color="#D97706" />
            <Text style={styles.priorityText}>Priority</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.text }]}>{job.title}</Text>
        <View style={styles.metaRow}>
          <Text style={[styles.budget, { color: Primary[500] }]}>₱{job.budget.toLocaleString()}</Text>
          <StatusChip status={job.status} />
        </View>

        {job.jobTags.length > 0 && (
          <View style={styles.tagRow}>
            {job.jobTags.map((tag) => (
              <View key={tag} style={[styles.tagChip, { backgroundColor: Status.infoBg }]}>
                <Text style={[styles.tagText, { color: Status.info }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <DetailRow label="Category" value={job.category} />
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Location</Text>
            <View style={styles.detailValueRow}>
              <Icon name="location-outline" size={13} color={theme.textSecondary} />
              <Text style={[styles.detailValue, { color: theme.text }]}>{job.location}</Text>
            </View>
          </View>
          <DetailRow label="Status" value={job.status} />
          <DetailRow label="Escrow" value={job.escrowStatus.replace(/_/g, ' ')} />
          {job.scheduleDate && (
            <DetailRow label="Scheduled" value={new Date(job.scheduleDate).toLocaleDateString()} />
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Description</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>{job.description}</Text>

        {job.specialInstructions && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Special Instructions</Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              {job.specialInstructions}
            </Text>
          </>
        )}

        {job.milestones.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Milestones</Text>
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              {job.milestones.map((m, i) => (
                <View key={i} style={styles.milestoneRow}>
                  <Text style={[styles.milestoneTitle, { color: theme.text }]}>{m.title}</Text>
                  <Text style={[styles.milestoneAmount, { color: Primary[500] }]}>
                    ₱{m.amount.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.actions, { borderTopColor: theme.backgroundElement, backgroundColor: theme.background }]}>
        <Pressable
          style={[styles.btn, { backgroundColor: Primary[500] }]}
          onPress={() => router.push(`/(app)/marketplace/${id}/quote`)}
        >
          <Text style={styles.btnText}>Submit Quote</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.four,
    paddingBottom: Spacing.two,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  back: { fontSize: 15, fontWeight: '600' },
  priorityBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 3 },
  priorityText: { fontSize: 11, fontWeight: '700', color: '#D97706' },
  scroll: { paddingHorizontal: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.three },
  title: { fontSize: 22, fontWeight: '700', lineHeight: 30 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  budget: { fontSize: 20, fontWeight: '700' },
  tagRow: { flexDirection: 'row', gap: Spacing.one, flexWrap: 'wrap' },
  tagChip: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 11, fontWeight: '700' },
  card: { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 14, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: Spacing.two },
  detailValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'flex-end' },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  description: { fontSize: 15, lineHeight: 24 },
  milestoneRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  milestoneTitle: { fontSize: 14, flex: 1 },
  milestoneAmount: { fontSize: 14, fontWeight: '700' },
  actions: { padding: Spacing.four, paddingBottom: BottomTabInset, borderTopWidth: 1 },
  btn: { borderRadius: 14, paddingVertical: Spacing.three - 2, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
