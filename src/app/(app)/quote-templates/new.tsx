import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
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
import * as z from 'zod';

import { createQuoteTemplate } from '@/api/quote-templates';
import { Icon } from '@/components/icon';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const schema = z.object({
  name:          z.string().min(1, 'Template name is required'),
  laborCost:     z.string().min(1, 'Required'),
  materialsCost: z.string().min(1, 'Required'),
  timeline:      z.string().min(1, 'Timeline is required'),
  notes:         z.string().optional(),
  milestones:    z.array(z.object({ title: z.string().min(1), amount: z.string() })),
});

type FormData = z.infer<typeof schema>;

export default function NewTemplateScreen() {
  const theme  = useTheme();
  const router = useRouter();
  const qc     = useQueryClient();

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', laborCost: '', materialsCost: '', timeline: '', notes: '', milestones: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'milestones' });

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      createQuoteTemplate({
        name:          values.name.trim(),
        laborCost:     Number(values.laborCost),
        materialsCost: Number(values.materialsCost),
        timeline:      values.timeline.trim(),
        notes:         values.notes?.trim() ?? '',
        milestones:    values.milestones.map((m) => ({ title: m.title.trim(), amount: Number(m.amount) || 0 })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quote-templates'] });
      router.back();
    },
    onError: () => Alert.alert('Error', 'Could not create template. Please try again.'),
  });

  const inputStyle = [styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>New Template</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Template Name *</Text>
          <Controller control={control} name="name" render={({ field: { value, onChange, onBlur } }) => (
            <TextInput style={inputStyle} value={value} onChangeText={onChange} onBlur={onBlur} placeholder="e.g. Standard Electrical Repair" placeholderTextColor={theme.textSecondary} />
          )} />
          {errors.name && <Text style={styles.err}>{errors.name.message}</Text>}

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Labor Cost (₱) *</Text>
              <Controller control={control} name="laborCost" render={({ field: { value, onChange, onBlur } }) => (
                <TextInput style={inputStyle} value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="numeric" placeholder="0" placeholderTextColor={theme.textSecondary} />
              )} />
              {errors.laborCost && <Text style={styles.err}>{errors.laborCost.message}</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Materials (₱) *</Text>
              <Controller control={control} name="materialsCost" render={({ field: { value, onChange, onBlur } }) => (
                <TextInput style={inputStyle} value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="numeric" placeholder="0" placeholderTextColor={theme.textSecondary} />
              )} />
              {errors.materialsCost && <Text style={styles.err}>{errors.materialsCost.message}</Text>}
            </View>
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>Timeline *</Text>
          <Controller control={control} name="timeline" render={({ field: { value, onChange, onBlur } }) => (
            <TextInput style={inputStyle} value={value} onChangeText={onChange} onBlur={onBlur} placeholder="e.g. 2-3 days" placeholderTextColor={theme.textSecondary} />
          )} />
          {errors.timeline && <Text style={styles.err}>{errors.timeline.message}</Text>}

          <Text style={[styles.label, { color: theme.textSecondary }]}>Notes</Text>
          <Controller control={control} name="notes" render={({ field: { value, onChange, onBlur } }) => (
            <TextInput style={[inputStyle, styles.textarea]} value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Additional notes or terms…" placeholderTextColor={theme.textSecondary} multiline numberOfLines={3} />
          )} />

          {/* Milestones */}
          <View style={styles.milestonesHeader}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Milestones</Text>
            <Pressable onPress={() => append({ title: '', amount: '0' })} hitSlop={8}>
              <Icon name="add-circle-outline" size={22} color={Primary[500]} />
            </Pressable>
          </View>
          {fields.map((field, idx) => (
            <View key={field.id} style={styles.milestoneRow}>
              <View style={{ flex: 2 }}>
                <Controller control={control} name={`milestones.${idx}.title`} render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput style={inputStyle} value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Milestone title" placeholderTextColor={theme.textSecondary} />
                )} />
              </View>
              <View style={{ flex: 1 }}>
                <Controller control={control} name={`milestones.${idx}.amount`} render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput style={inputStyle} value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="numeric" placeholder="₱" placeholderTextColor={theme.textSecondary} />
                )} />
              </View>
              <Pressable onPress={() => remove(idx)} hitSlop={8}>
                <Icon name="close-circle" size={22} color={Status.error} />
              </Pressable>
            </View>
          ))}

          <Pressable
            style={[styles.saveBtn, { backgroundColor: Primary[500] }]}
            onPress={handleSubmit((v) => mutation.mutate(v))}
            disabled={mutation.isPending}
          >
            <Icon name="save-outline" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>{mutation.isPending ? 'Saving…' : 'Save Template'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1 },
  header:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:          { width: 32, alignItems: 'flex-start' },
  headerTitle:      { flex: 1, fontSize: 17, fontWeight: '700' },
  scroll:           { padding: Spacing.four, gap: Spacing.two, paddingBottom: BottomTabInset + 24 },
  label:            { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  input:            { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textarea:         { minHeight: 80, textAlignVertical: 'top' },
  row2:             { flexDirection: 'row', gap: Spacing.two },
  err:              { color: '#dc2626', fontSize: 12 },
  milestonesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.two },
  milestoneRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  saveBtn:          { borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: Spacing.three },
  saveBtnText:      { color: '#fff', fontSize: 15, fontWeight: '700' },
});
