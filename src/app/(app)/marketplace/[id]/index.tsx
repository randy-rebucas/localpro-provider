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
import { getQuotedJobIds } from '@/api/quotes';
import { Icon } from '@/components/icon';
import { StatusChip } from '@/components/status-chip';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TAG_META: Record<string, { color: string; bg: string; icon: string }> = {
  PESO:      { color: Status.info,    bg: Status.infoBg,    icon: 'shield-checkmark-outline' },
  LGU:       { color: Status.success, bg: Status.successBg, icon: 'business-outline' },
  Emergency: { color: Status.error,   bg: Status.errorBg,   icon: 'flash-outline' },
};

function TagChip({ tag }: { tag: string }) {
  const c = TAG_META[tag] ?? { color: Status.warning, bg: Status.warningBg, icon: 'pricetag-outline' };
  return (
    <View style={[styles.tagChip, { backgroundColor: c.bg }]}>
      <Icon name={c.icon as any} size={11} color={c.color} />
      <Text style={[styles.tagText, { color: c.color }]}>{tag}</Text>
    </View>
  );
}

export default function JobDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => getJob(id!),
    enabled: !!id,
  });

  const { data: quotedIds } = useQuery({
    queryKey: ['quoted-job-ids'],
    queryFn: getQuotedJobIds,
    staleTime: 1000 * 60,
  });

  const alreadyQuoted = Array.isArray(quotedIds) && !!id && quotedIds.includes(id);

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
            {job.jobTags.map((tag) => <TagChip key={tag} tag={tag} />)}
          </View>
        )}

        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <DetailRow icon="apps-outline" label="Category" value={job.category} />
          <View style={styles.detailRow}>
            <View style={styles.detailLabelRow}>
              <Icon name="location-outline" size={14} color={theme.textSecondary} />
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Location</Text>
            </View>
            <Text style={[styles.detailValue, { color: theme.text }]} numberOfLines={1}>{job.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailLabelRow}>
              <Icon name="information-circle-outline" size={14} color={theme.textSecondary} />
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Status</Text>
            </View>
            <StatusChip status={job.status} />
          </View>
          <DetailRow icon="shield-outline" label="Escrow" value={job.escrowStatus.replace(/_/g, ' ')} />
          {job.scheduleDate && (
            <DetailRow icon="calendar-outline" label="Scheduled" value={new Date(job.scheduleDate).toLocaleDateString()} />
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
        {alreadyQuoted ? (
          <View style={[styles.btn, styles.btnQuoted]}>
            <Icon name="checkmark-circle" size={18} color={Status.success} />
            <Text style={[styles.btnText, { color: Status.success }]}>Quote Submitted</Text>
          </View>
        ) : (
          <Pressable
            style={[styles.btn, { backgroundColor: Primary[500] }]}
            onPress={() => router.push(`/(app)/marketplace/${id}/quote`)}
          >
            <Icon name="document-text-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>Submit Quote</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLabelRow}>
        {icon && <Icon name={icon as any} size={14} color={theme.textSecondary} />}
        <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{label}</Text>
      </View>
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
  tagChip: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 },
  tagText: { fontSize: 11, fontWeight: '700' },
  card: { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  detailRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailLabel:    { fontSize: 14 },
  detailValue:    { fontSize: 14, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: Spacing.two },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  description: { fontSize: 15, lineHeight: 24 },
  milestoneRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  milestoneTitle: { fontSize: 14, flex: 1 },
  milestoneAmount: { fontSize: 14, fontWeight: '700' },
  actions:    { padding: Spacing.four, paddingBottom: BottomTabInset, borderTopWidth: 1 },
  btn:        { borderRadius: 14, paddingVertical: Spacing.three - 2, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  btnText:    { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnQuoted:  { borderWidth: 1.5, borderColor: Status.success + '60', backgroundColor: Status.successBg },
});
