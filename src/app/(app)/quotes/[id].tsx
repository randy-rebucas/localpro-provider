import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getQuote, retractQuote } from '@/api/quotes';
import { Icon } from '@/components/icon';
import { StatusChip } from '@/components/status-chip';
import { Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function Row({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

export default function QuoteDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: quote, isLoading } = useQuery({
    queryKey: ['quote', id],
    queryFn: () => getQuote(id!),
    enabled: !!id,
  });

  const retract = useMutation({
    mutationFn: () => retractQuote(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quoted-job-ids'] });
      router.back();
    },
  });

  function confirmRetract() {
    Alert.alert(
      'Retract Quote',
      'Are you sure you want to retract this quote? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retract', style: 'destructive', onPress: () => retract.mutate() },
      ],
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <ActivityIndicator style={{ flex: 1 }} color={Primary[500]} />
      </SafeAreaView>
    );
  }

  if (!quote) return null;

  const canRetract = ['pending', 'submitted'].includes(quote.status);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.nav}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="chevron-back" size={20} color={Primary[500]} />
          <Text style={[styles.back, { color: Primary[500] }]}>Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: theme.text }]}>Quote Detail</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.jobTitle, { color: theme.text }]}>{quote.jobTitle}</Text>
        <View style={styles.statusRow}>
          <StatusChip status={quote.status} />
          <Text style={[styles.date, { color: theme.textSecondary }]}>
            {new Date(quote.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <Row label="Quoted Amount" value={`₱${quote.proposedAmount.toLocaleString()}`} />
          {quote.laborCost > 0 && <Row label="Labor Cost" value={`₱${quote.laborCost.toLocaleString()}`} />}
          {quote.materialsCost > 0 && <Row label="Materials Cost" value={`₱${quote.materialsCost.toLocaleString()}`} />}
          <Row label="Timeline" value={quote.timeline} />
        </View>

        {quote.notes && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Notes</Text>
            <Text style={[styles.notes, { color: theme.textSecondary }]}>{quote.notes}</Text>
          </>
        )}

        {quote.milestones.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Milestones</Text>
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              {quote.milestones.map((m, i) => (
                <View key={i} style={styles.msRow}>
                  <Text style={[styles.msTitle, { color: theme.text }]}>{m.title}</Text>
                  <Text style={[styles.msAmount, { color: Primary[500] }]}>₱{m.amount.toLocaleString()}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {retract.isError && (
          <Text style={{ color: Status.error, fontSize: 13, textAlign: 'center' }}>
            Failed to retract quote. Please try again.
          </Text>
        )}

        {canRetract && (
          <Pressable
            style={[styles.retractBtn, retract.isPending && styles.btnDisabled]}
            onPress={confirmRetract}
            disabled={retract.isPending}
          >
            {retract.isPending ? (
              <ActivityIndicator color={Status.error} />
            ) : (
              <Text style={[styles.retractText, { color: Status.error }]}>Retract Quote</Text>
            )}
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.four, paddingVertical: Spacing.two + 2 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 60 },
  back: { fontSize: 15, fontWeight: '600' },
  navTitle: { fontSize: 16, fontWeight: '700' },
  scroll: { padding: Spacing.four, gap: Spacing.three, paddingBottom: 40 },
  jobTitle: { fontSize: 20, fontWeight: '700', lineHeight: 28 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  date: { fontSize: 13 },
  card: { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  notes: { fontSize: 14, lineHeight: 22 },
  msRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  msTitle: { fontSize: 14, flex: 1 },
  msAmount: { fontSize: 14, fontWeight: '700' },
  retractBtn: { borderRadius: 14, borderWidth: 1.5, borderColor: Status.error, paddingVertical: Spacing.three, alignItems: 'center' },
  retractText: { fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});
