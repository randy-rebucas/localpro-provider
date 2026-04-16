import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Icon } from '@/components/icon';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
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
import { z } from 'zod';

import { getWallet, requestWithdrawal } from '@/api/earnings';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const schema = z.object({
  amount:        z.string().min(1, 'Required').refine((v) => Number(v) >= 100, 'Minimum ₱100'),
  bankName:      z.string().min(2, 'Required'),
  accountNumber: z.string().min(4, 'Required'),
  accountName:   z.string().min(2, 'Required'),
});

type FormData = z.infer<typeof schema>;

export default function WithdrawScreen() {
  const theme = useTheme();
  const router = useRouter();
  const qc    = useQueryClient();

  const { data: wallet } = useQuery({ queryKey: ['wallet'], queryFn: getWallet });

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (v: FormData) =>
      requestWithdrawal({
        amount:        Number(v.amount),
        bankName:      v.bankName,
        accountNumber: v.accountNumber,
        accountName:   v.accountName,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['transactions-all'] });
      Alert.alert('Success', 'Withdrawal request submitted!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        'Failed to submit withdrawal request. Please try again.';
      Alert.alert('Error', msg);
    },
  });

  const inputStyle = [styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.nav}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="chevron-back" size={20} color={Primary[500]} />
          <Text style={[styles.back, { color: Primary[500] }]}>Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: theme.text }]}>Withdraw</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Balance display */}
          <View style={[styles.balanceCard, { backgroundColor: Primary[500] }]}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>₱{(wallet?.balance ?? 0).toLocaleString()}</Text>
          </View>

          <View style={styles.noticeRow}>
            <Icon name="information-circle-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.notice, { color: theme.textSecondary }]}>
              Withdrawals are processed within 1-3 business days. Minimum withdrawal is ₱100.
            </Text>
          </View>

          <Controller
            control={control}
            name="amount"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.text }]}>Amount (₱) *</Text>
                <TextInput
                  style={inputStyle}
                  placeholder={`Max ₱${(wallet?.balance ?? 0).toLocaleString()}`}
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  value={value}
                  onChangeText={onChange}
                />
                {errors.amount && <Text style={styles.error}>{errors.amount.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="bankName"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.text }]}>Bank Name *</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="e.g. BDO, BPI, GCash"
                  placeholderTextColor={theme.textSecondary}
                  value={value}
                  onChangeText={onChange}
                />
                {errors.bankName && <Text style={styles.error}>{errors.bankName.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="accountNumber"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.text }]}>Account Number *</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="Your account/mobile number"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  value={value}
                  onChangeText={onChange}
                />
                {errors.accountNumber && <Text style={styles.error}>{errors.accountNumber.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="accountName"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.text }]}>Account Name *</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="Name on the account"
                  placeholderTextColor={theme.textSecondary}
                  value={value}
                  onChangeText={onChange}
                />
                {errors.accountName && <Text style={styles.error}>{errors.accountName.message}</Text>}
              </View>
            )}
          />

          <Pressable
            style={[styles.btn, { backgroundColor: Primary[500] }, mutation.isPending && styles.btnDisabled]}
            onPress={handleSubmit((v) => mutation.mutate(v))}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="arrow-up-circle-outline" size={18} color="#fff" />
                <Text style={styles.btnText}>Request Withdrawal</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.four, paddingVertical: Spacing.two + 2 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 60 },
  back: { fontSize: 15, fontWeight: '600' },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  navTitle: { fontSize: 16, fontWeight: '700' },
  scroll: { padding: Spacing.four, gap: Spacing.three, paddingBottom: BottomTabInset + 24 },
  balanceCard: { borderRadius: 20, padding: Spacing.four, gap: Spacing.one },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  balanceAmount: { color: '#fff', fontSize: 32, fontWeight: '800' },
  notice: { fontSize: 13, lineHeight: 18, flex: 1 },
  field: { gap: Spacing.one },
  label: { fontSize: 13, fontWeight: '600' },
  input: { borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 2, fontSize: 15 },
  error: { color: Status.error, fontSize: 12 },
  btn: { borderRadius: 14, paddingVertical: Spacing.three, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: Spacing.two },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
});
