import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getJob } from '@/api/jobs';
import { Icon } from '@/components/icon';
import { CardSkeleton } from '@/components/loading-skeleton';
import { StatusChip } from '@/components/status-chip';
import { Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function InfoRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

export default function JobDetailScreen() {
  const theme  = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc     = useQueryClient();

  const { data: job, isLoading, isError } = useQuery({
    queryKey: ['job', id],
    queryFn:  () => getJob(id),
    enabled:  !!id,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="chevron-back" size={22} color={theme.text} />
          </Pressable>
        </View>
        <View style={{ padding: Spacing.four, gap: Spacing.three }}>
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !job) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="chevron-back" size={22} color={theme.text} />
          </Pressable>
        </View>
        <View style={styles.center}>
          <Text style={[styles.errText, { color: theme.textSecondary }]}>Could not load job details.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const milestones = Array.isArray(job.milestones) ? job.milestones : [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.headerBar, { borderBottomColor: theme.backgroundElement }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>Job Details</Text>
        <StatusChip status={job.status} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Title & budget */}
        <Text style={[styles.title, { color: theme.text }]}>{job.title}</Text>
        <View style={styles.metaRow}>
          <Text style={[styles.budget, { color: Primary[500] }]}>₱{job.budget.toLocaleString()}</Text>
          <View style={styles.locationRow}>
            <Icon name="location-outline" size={13} color={theme.textSecondary} />
            <Text style={[styles.location, { color: theme.textSecondary }]}>{job.location}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <InfoRow label="Category"    value={job.category} />
          <InfoRow label="Status"      value={job.status} />
          <InfoRow label="Escrow"      value={job.escrowStatus ?? '—'} />
          {job.scheduleDate && <InfoRow label="Schedule"   value={new Date(job.scheduleDate).toLocaleDateString()} />}
          <InfoRow label="Posted"      value={new Date(job.createdAt).toLocaleDateString()} />
        </View>

        {/* Description */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DESCRIPTION</Text>
          <Text style={[styles.description, { color: theme.text }]}>{job.description}</Text>
        </View>

        {/* Special instructions */}
        {job.specialInstructions && (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SPECIAL INSTRUCTIONS</Text>
            <Text style={[styles.description, { color: theme.text }]}>{job.specialInstructions}</Text>
          </View>
        )}

        {/* Milestones */}
        {milestones.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>MILESTONES</Text>
            {milestones.map((m, idx) => (
              <View key={idx} style={styles.milestoneRow}>
                <View style={[styles.milestoneDot, { backgroundColor: m.status === 'completed' ? Status.success : Primary[300] }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.milestoneTitle, { color: theme.text }]}>{m.title}</Text>
                  {m.status && <Text style={[styles.milestoneStatus, { color: theme.textSecondary }]}>{m.status}</Text>}
                </View>
                <Text style={[styles.milestoneAmt, { color: Primary[500] }]}>₱{m.amount.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: theme.backgroundElement }]}
            onPress={() => router.push(`/(app)/jobs/${id}/chat`)}
          >
            <Icon name="chatbubble-outline" size={20} color={Primary[500]} />
            <Text style={[styles.actionText, { color: Primary[500] }]}>Chat with Client</Text>
          </Pressable>

          {(job.status === 'active' || job.status === 'funded') && (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: Primary[500] }]}
              onPress={() => router.push(`/(app)/jobs/${id}/upload-completion`)}
            >
              <Icon name="camera-outline" size={20} color="#fff" />
              <Text style={[styles.actionText, { color: '#fff' }]}>Upload Completion Photo</Text>
            </Pressable>
          )}

          {(job.status === 'active' || job.status === 'funded') && (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: Status.errorBg, borderColor: Status.error, borderWidth: 1 }]}
              onPress={() => router.push(`/(app)/jobs/${id}/withdraw`)}
            >
              <Icon name="exit-outline" size={20} color={Status.error} />
              <Text style={[styles.actionText, { color: Status.error }]}>Withdraw from Job</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1 },
  headerBar:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:        { width: 32, alignItems: 'flex-start' },
  headerTitle:    { flex: 1, fontSize: 16, fontWeight: '700' },
  scroll:         { padding: Spacing.four, gap: Spacing.three, paddingBottom: 40 },
  title:          { fontSize: 22, fontWeight: '800', lineHeight: 28 },
  metaRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  budget:         { fontSize: 22, fontWeight: '800' },
  locationRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location:       { fontSize: 13 },
  card:           { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  sectionTitle:   { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 },
  description:    { fontSize: 14, lineHeight: 22 },
  infoRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.06)' },
  infoLabel:      { fontSize: 13 },
  infoValue:      { fontSize: 13, fontWeight: '600' },
  milestoneRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.06)' },
  milestoneDot:   { width: 10, height: 10, borderRadius: 5 },
  milestoneTitle: { fontSize: 14, fontWeight: '500' },
  milestoneStatus:{ fontSize: 12 },
  milestoneAmt:   { fontSize: 14, fontWeight: '700' },
  actions:        { gap: Spacing.two },
  actionBtn:      { borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionText:     { fontSize: 15, fontWeight: '700' },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errText:        { fontSize: 15 },
});
