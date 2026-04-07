import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
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

import { getProviderProfile } from '@/api/auth';
import { updateProviderProfile } from '@/api/provider-profile';
import { Icon } from '@/components/icon';
import { Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const schema = z.object({
  bio:             z.string().max(500, 'Max 500 characters').optional(),
  hourlyRate:      z.string().optional(),
  yearsExperience: z.string().optional(),
  availabilityStatus: z.enum(['available', 'busy', 'unavailable']),
  skills: z.array(
    z.object({ skill: z.string().min(1, 'Required'), yearsExperience: z.string() }),
  ),
});

type FormData = z.infer<typeof schema>;

const AVAILABILITY = ['available', 'busy', 'unavailable'] as const;

export default function SkillsScreen() {
  const theme  = useTheme();
  const router = useRouter();
  const qc     = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['provider-profile'],
    queryFn:  getProviderProfile,
    staleTime: 1000 * 60 * 5,
  });

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      bio: '',
      hourlyRate: '',
      yearsExperience: '',
      availabilityStatus: 'available',
      skills: [{ skill: '', yearsExperience: '0' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'skills' });

  useEffect(() => {
    if (profile) {
      reset({
        bio:             profile.bio ?? '',
        hourlyRate:      profile.hourlyRate != null ? String(profile.hourlyRate) : '',
        yearsExperience: profile.yearsExperience != null ? String(profile.yearsExperience) : '',
        availabilityStatus: (profile.availabilityStatus as any) ?? 'available',
        skills: profile.skills?.length
          ? profile.skills.map((s) => ({ skill: s.skill, yearsExperience: String(s.yearsExperience ?? 0) }))
          : [{ skill: '', yearsExperience: '0' }],
      });
    }
  }, [profile, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      updateProviderProfile({
        bio:             values.bio?.trim() || undefined,
        hourlyRate:      values.hourlyRate ? Number(values.hourlyRate) : undefined,
        yearsExperience: values.yearsExperience ? Number(values.yearsExperience) : undefined,
        availabilityStatus: values.availabilityStatus,
        skills:          values.skills
          .filter((s) => s.skill.trim())
          .map((s) => ({ skill: s.skill.trim(), yearsExperience: Number(s.yearsExperience) || 0 })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provider-profile'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: () => Alert.alert('Error', 'Could not save changes. Please try again.'),
  });

  const inputStyle = [styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundElement }];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Profile & Skills</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <Text style={[styles.hint, { color: theme.textSecondary }]}>Loading…</Text>
          ) : (
            <>
              {/* Bio */}
              <Text style={[styles.label, { color: theme.textSecondary }]}>Bio</Text>
              <Controller
                control={control}
                name="bio"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
                    style={[inputStyle, styles.textarea]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    multiline
                    numberOfLines={4}
                    placeholder="Describe your services and experience…"
                    placeholderTextColor={theme.textSecondary}
                  />
                )}
              />
              {errors.bio && <Text style={styles.errText}>{errors.bio.message}</Text>}

              {/* Hourly Rate & Experience */}
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Hourly Rate (₱)</Text>
                  <Controller
                    control={control}
                    name="hourlyRate"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <TextInput
                        style={inputStyle}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="numeric"
                        placeholder="e.g. 500"
                        placeholderTextColor={theme.textSecondary}
                      />
                    )}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Years Exp.</Text>
                  <Controller
                    control={control}
                    name="yearsExperience"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <TextInput
                        style={inputStyle}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="numeric"
                        placeholder="e.g. 5"
                        placeholderTextColor={theme.textSecondary}
                      />
                    )}
                  />
                </View>
              </View>

              {/* Availability */}
              <Text style={[styles.label, { color: theme.textSecondary }]}>Availability</Text>
              <Controller
                control={control}
                name="availabilityStatus"
                render={({ field: { value, onChange } }) => (
                  <View style={styles.chipRow}>
                    {AVAILABILITY.map((opt) => (
                      <Pressable
                        key={opt}
                        style={[
                          styles.chip,
                          { backgroundColor: value === opt ? Primary[500] : theme.backgroundElement },
                        ]}
                        onPress={() => onChange(opt)}
                      >
                        <Text style={{ color: value === opt ? '#fff' : theme.text, fontSize: 13, fontWeight: '600' }}>
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              />

              {/* Skills */}
              <View style={styles.skillsHeader}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Skills</Text>
                <Pressable onPress={() => append({ skill: '', yearsExperience: '0' })}>
                  <Icon name="add-circle-outline" size={22} color={Primary[500]} />
                </Pressable>
              </View>
              {fields.map((field, idx) => (
                <View key={field.id} style={styles.skillRow}>
                  <View style={{ flex: 2 }}>
                    <Controller
                      control={control}
                      name={`skills.${idx}.skill`}
                      render={({ field: { value, onChange, onBlur } }) => (
                        <TextInput
                          style={inputStyle}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="Skill name"
                          placeholderTextColor={theme.textSecondary}
                        />
                      )}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Controller
                      control={control}
                      name={`skills.${idx}.yearsExperience`}
                      render={({ field: { value, onChange, onBlur } }) => (
                        <TextInput
                          style={inputStyle}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          keyboardType="numeric"
                          placeholder="Yrs"
                          placeholderTextColor={theme.textSecondary}
                        />
                      )}
                    />
                  </View>
                  {fields.length > 1 && (
                    <Pressable onPress={() => remove(idx)} hitSlop={8}>
                      <Icon name="close-circle" size={22} color={Status.error} />
                    </Pressable>
                  )}
                </View>
              ))}

              {/* Save */}
              <Pressable
                style={[styles.saveBtn, { backgroundColor: saved ? Status.success : Primary[500] }]}
                onPress={handleSubmit((v) => mutation.mutate(v))}
                disabled={mutation.isPending}
              >
                {saved
                  ? <Icon name="checkmark" size={18} color="#fff" />
                  : <Icon name="save-outline" size={18} color="#fff" />
                }
                <Text style={styles.saveBtnText}>
                  {mutation.isPending ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:     { width: 32, alignItems: 'flex-start' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  scroll:      { padding: Spacing.four, gap: Spacing.two, paddingBottom: 40 },
  label:       { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  input:       { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1 },
  textarea:    { minHeight: 100, textAlignVertical: 'top', paddingTop: 12 },
  row2:        { flexDirection: 'row', gap: Spacing.two },
  chipRow:     { flexDirection: 'row', gap: Spacing.two },
  chip:        { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  skillsHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.two },
  skillRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  errText:     { color: '#dc2626', fontSize: 12, marginTop: -4 },
  hint:        { textAlign: 'center', marginTop: 40 },
  saveBtn:     { borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: Spacing.three },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
