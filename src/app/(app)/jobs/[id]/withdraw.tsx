import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { withdrawFromJob } from '@/api/jobs';
import { Icon } from '@/components/icon';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const REASONS = [
  'Schedule conflict',
  'Scope changed significantly',
  'Unable to obtain materials',
  'Personal emergency',
  'Client unresponsive',
  'Other',
];

export default function WithdrawScreen() {
  const theme  = useTheme();
  const router = useRouter();
  const qc     = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [selected, setSelected] = useState('');
  const [custom,   setCustom]   = useState('');
  const [done,     setDone]     = useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      const reason = selected === 'Other' ? custom.trim() : selected;
      return withdrawFromJob(id, reason);
    },
    onSuccess: () => {
      setDone(true);
      qc.invalidateQueries({ queryKey: ['job', id] });
      qc.invalidateQueries({ queryKey: ['my-jobs'] });
    },
    onError: () => Alert.alert('Error', 'Could not withdraw from job. Please try again.'),
  });

  function confirmWithdraw() {
    const reason = selected === 'Other' ? custom.trim() : selected;
    if (!reason) {
      Alert.alert('Reason required', 'Please select or enter a reason for withdrawing.');
      return;
    }
    Alert.alert(
      'Confirm Withdrawal',
      'Withdrawing will return the job to open status. You may be penalised if you withdraw without cause. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Withdraw', style: 'destructive', onPress: () => mutation.mutate() },
      ],
    );
  }

  if (done) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <View style={[styles.iconCircle, { backgroundColor: Status.warningBg }]}>
            <Icon name="exit-outline" size={48} color={Status.warning} />
          </View>
          <Text style={[styles.doneTitle, { color: theme.text }]}>Withdrawn Successfully</Text>
          <Text style={[styles.doneHint, { color: theme.textSecondary }]}>
            You have withdrawn from this job. The job has been returned to open status.
          </Text>
          <Pressable
            style={[styles.btn, { backgroundColor: Primary[500] }]}
            onPress={() => router.replace('/(app)/jobs')}
          >
            <Text style={styles.btnText}>Back to My Jobs</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Withdraw from Job</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Warning notice */}
          <View style={[styles.notice, { backgroundColor: Status.warningBg }]}>
            <Icon name="warning-outline" size={18} color={Status.warning} />
            <Text style={[styles.noticeText, { color: Status.warning }]}>
              Withdrawing from a job may affect your rating and account standing. Only withdraw if absolutely necessary.
            </Text>
          </View>

          {/* Reason selection */}
          <Text style={[styles.label, { color: theme.textSecondary }]}>Reason for withdrawal</Text>
          <View style={styles.reasonList}>
            {REASONS.map((r) => (
              <Pressable
                key={r}
                style={[
                  styles.reasonBtn,
                  { backgroundColor: selected === r ? Primary[50] : theme.backgroundElement, borderColor: selected === r ? Primary[500] : 'transparent', borderWidth: 1.5 },
                ]}
                onPress={() => setSelected(r)}
              >
                <View style={[styles.radio, { borderColor: selected === r ? Primary[500] : theme.textSecondary }]}>
                  {selected === r && <View style={[styles.radioDot, { backgroundColor: Primary[500] }]} />}
                </View>
                <Text style={[styles.reasonText, { color: theme.text }]}>{r}</Text>
              </Pressable>
            ))}
          </View>

          {/* Custom reason */}
          {selected === 'Other' && (
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              value={custom}
              onChangeText={setCustom}
              placeholder="Please describe your reason…"
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={3}
              autoFocus
            />
          )}

          <Pressable
            style={[styles.withdrawBtn, { backgroundColor: Status.error, opacity: selected ? 1 : 0.4 }]}
            onPress={confirmWithdraw}
            disabled={!selected || mutation.isPending}
          >
            <Icon name="exit-outline" size={20} color="#fff" />
            <Text style={styles.withdrawBtnText}>
              {mutation.isPending ? 'Withdrawing…' : 'Withdraw from Job'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:       { width: 32, alignItems: 'flex-start' },
  headerTitle:   { flex: 1, fontSize: 17, fontWeight: '700' },
  scroll:        { padding: Spacing.four, gap: Spacing.three, paddingBottom: BottomTabInset + 24 },
  notice:        { borderRadius: 14, padding: Spacing.three, flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  noticeText:    { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  label:         { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  reasonList:    { gap: Spacing.two },
  reasonBtn:     { borderRadius: 12, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  radio:         { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot:      { width: 10, height: 10, borderRadius: 5 },
  reasonText:    { fontSize: 14, fontWeight: '500', flex: 1 },
  input:         { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, textAlignVertical: 'top', minHeight: 90 },
  withdrawBtn:   { borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  withdrawBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five, gap: Spacing.three },
  iconCircle:    { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  doneTitle:     { fontSize: 24, fontWeight: '800' },
  doneHint:      { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  btn:           { borderRadius: 14, paddingVertical: 14, paddingHorizontal: Spacing.five, marginTop: Spacing.two },
  btnText:       { color: '#fff', fontSize: 15, fontWeight: '700' },
});
