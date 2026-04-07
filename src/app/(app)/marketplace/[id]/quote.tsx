import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Icon } from '@/components/icon';
import {
  ActivityIndicator,
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

import { getJob } from '@/api/jobs';
import { submitQuote } from '@/api/quotes';
import { Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const schema = z.object({
  proposedAmount: z.string().min(1, 'Required').refine((v) => Number(v) > 0, 'Must be > 0'),
  laborCost:      z.string().optional(),
  materialsCost:  z.string().optional(),
  timeline:       z.string().min(1, 'Required'),
  notes:          z.string().optional(),
  message:        z.string().optional(),
  milestones: z.array(z.object({
    title:  z.string().min(1, 'Required'),
    amount: z.string().min(1, 'Required').refine((v) => Number(v) > 0, 'Must be > 0'),
  })).optional(),
});

type FormData = z.infer<typeof schema>;

function Field({
  label, error, children,
}: {
  label: string; error?: string; children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      {children}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

export default function SubmitQuoteScreen() {
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: job } = useQuery({
    queryKey: ['job', id],
    queryFn: () => getJob(id!),
    enabled: !!id,
  });

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { milestones: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'milestones' });

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      submitQuote({
        jobId: id!,
        proposedAmount: Number(values.proposedAmount),
        laborCost:      values.laborCost ? Number(values.laborCost) : undefined,
        materialsCost:  values.materialsCost ? Number(values.materialsCost) : undefined,
        timeline:       values.timeline,
        notes:          values.notes,
        message:        values.message,
        milestones:     values.milestones?.map((m) => ({ title: m.title, amount: Number(m.amount) })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quoted-job-ids'] });
      router.back();
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
        <Text style={[styles.navTitle, { color: theme.text }]}>Submit Quote</Text>
        <View style={{ width: 60 }} />
      </View>

      {job && (
        <View style={[styles.jobBanner, { backgroundColor: Primary[50] }]}>
          <Text style={[styles.jobBannerTitle, { color: Primary[700] }]} numberOfLines={2}>
            {job.title}
          </Text>
          <Text style={[styles.jobBannerBudget, { color: Primary[500] }]}>
            Budget ₱{job.budget.toLocaleString()}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Controller
            control={control}
            name="proposedAmount"
            render={({ field: { onChange, value } }) => (
              <Field label="Your Quote Amount (₱) *" error={errors.proposedAmount?.message}>
                <TextInput
                  style={inputStyle}
                  placeholder="e.g. 2500"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  value={value}
                  onChangeText={onChange}
                />
              </Field>
            )}
          />

          <View style={styles.row2}>
            <Controller
              control={control}
              name="laborCost"
              render={({ field: { onChange, value } }) => (
                <Field label="Labor Cost (₱)" error={errors.laborCost?.message}>
                  <TextInput
                    style={[inputStyle, styles.halfInput]}
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                  />
                </Field>
              )}
            />
            <Controller
              control={control}
              name="materialsCost"
              render={({ field: { onChange, value } }) => (
                <Field label="Materials Cost (₱)" error={errors.materialsCost?.message}>
                  <TextInput
                    style={[inputStyle, styles.halfInput]}
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                  />
                </Field>
              )}
            />
          </View>

          <Controller
            control={control}
            name="timeline"
            render={({ field: { onChange, value } }) => (
              <Field label="Estimated Timeline *" error={errors.timeline?.message}>
                <TextInput
                  style={inputStyle}
                  placeholder="e.g. 2-3 days"
                  placeholderTextColor={theme.textSecondary}
                  value={value}
                  onChangeText={onChange}
                />
              </Field>
            )}
          />

          <Controller
            control={control}
            name="message"
            render={({ field: { onChange, value } }) => (
              <Field label="Message to Client" error={errors.message?.message}>
                <TextInput
                  style={[inputStyle, styles.textarea]}
                  placeholder="Introduce yourself and explain your approach…"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                  value={value}
                  onChangeText={onChange}
                />
              </Field>
            )}
          />

          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <Field label="Internal Notes" error={errors.notes?.message}>
                <TextInput
                  style={[inputStyle, styles.textarea]}
                  placeholder="Notes visible only to you…"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={2}
                  value={value}
                  onChangeText={onChange}
                />
              </Field>
            )}
          />

          {/* Milestones */}
          <View style={styles.milestonesHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Milestones</Text>
            <Pressable
              style={[styles.addBtn, { backgroundColor: Primary[50] }]}
              onPress={() => append({ title: '', amount: '' })}
            >
              <Text style={[styles.addBtnText, { color: Primary[600] }]}>+ Add</Text>
            </Pressable>
          </View>

          {fields.map((f, i) => (
            <View key={f.id} style={[styles.milestoneRow, { backgroundColor: theme.backgroundElement }]}>
              <Controller
                control={control}
                name={`milestones.${i}.title`}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.msInput, { color: theme.text }]}
                    placeholder="Milestone title"
                    placeholderTextColor={theme.textSecondary}
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
              <Controller
                control={control}
                name={`milestones.${i}.amount`}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.msAmount, { color: theme.text }]}
                    placeholder="₱0"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
              <Pressable onPress={() => remove(i)}>
                <Icon name="close-circle" size={20} color={Status.error} />
              </Pressable>
            </View>
          ))}

          {mutation.isError && (
            <Text style={styles.submitError}>
              Failed to submit quote. Please try again.
            </Text>
          )}

          <Pressable
            style={[styles.submitBtn, { backgroundColor: Primary[500] }, mutation.isPending && styles.btnDisabled]}
            onPress={handleSubmit((v) => mutation.mutate(v))}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Quote</Text>
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
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 60 },
  back: { fontSize: 15, fontWeight: '600' },
  navTitle: { fontSize: 16, fontWeight: '700' },
  jobBanner: { marginHorizontal: Spacing.four, marginBottom: Spacing.two, borderRadius: 12, padding: Spacing.three, gap: 4 },
  jobBannerTitle: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  jobBannerBudget: { fontSize: 13, fontWeight: '700' },
  scroll: { padding: Spacing.four, gap: Spacing.three, paddingBottom: 40 },
  field: { gap: Spacing.one },
  label: { fontSize: 13, fontWeight: '600' },
  input: { borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 2, fontSize: 15 },
  halfInput: { flex: 1 },
  textarea: { minHeight: 80, textAlignVertical: 'top', paddingTop: Spacing.two },
  row2: { flexDirection: 'row', gap: Spacing.two },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  milestonesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  addBtnText: { fontSize: 13, fontWeight: '700' },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  msInput: { flex: 1, fontSize: 14 },
  msAmount: { width: 80, fontSize: 14, textAlign: 'right' },
  submitError: { color: Status.error, fontSize: 13, textAlign: 'center' },
  submitBtn: { borderRadius: 14, paddingVertical: Spacing.three, alignItems: 'center', marginTop: Spacing.two },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  error: { color: Status.error, fontSize: 12 },
});
