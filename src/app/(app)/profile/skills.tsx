import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as z from 'zod';

import { getProviderProfile } from '@/api/auth';
import {
  DEFAULT_SCHEDULE,
  generateBio,
  getProviderTier,
  suggestSkills,
  updateProviderProfile,
  type WeeklySchedule,
} from '@/api/provider-profile';
import { Icon } from '@/components/icon';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/* ─── Schema ──────────────────────────────────────────────────── */
const skillSchema = z.object({
  skill:           z.string().min(1, 'Required'),
  yearsExperience: z.string(),
  hourlyRate:      z.string(),
});

const schema = z.object({
  bio:                z.string().max(1000, 'Max 1000 chars'),
  hourlyRate:         z.string(),
  yearsExperience:    z.string(),
  maxConcurrentJobs:  z.string(),
  availabilityStatus: z.enum(['available', 'busy', 'unavailable']),
  skills:             z.array(skillSchema).max(20),
});

type FormData = z.infer<typeof schema>;

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS: Record<(typeof DAYS)[number], string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};

const AVAIL_META: Record<string, { label: string; color: string; bg: string }> = {
  available:   { label: 'Available',   color: Status.success, bg: Status.successBg },
  busy:        { label: 'Busy',        color: Status.warning, bg: Status.warningBg },
  unavailable: { label: 'Unavailable', color: Status.error,   bg: Status.errorBg },
};

/* ─── Component ───────────────────────────────────────────────── */
export default function SkillsScreen() {
  const theme  = useTheme();
  const router = useRouter();
  const qc     = useQueryClient();

  const [saved,       setSaved]       = useState(false);
  const [schedule,    setSchedule]    = useState<WeeklySchedule>(DEFAULT_SCHEDULE);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const bioDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['provider-profile'],
    queryFn:  getProviderProfile,
    staleTime: 1000 * 60 * 5,
  });

  const tier = profile
    ? getProviderTier(profile.completedJobCount ?? 0, profile.avgRating ?? 0, profile.completionRate ?? 0)
    : null;

  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      bio: '', hourlyRate: '', yearsExperience: '', maxConcurrentJobs: '3',
      availabilityStatus: 'available',
      skills: [{ skill: '', yearsExperience: '0', hourlyRate: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'skills' });
  const bioValue    = watch('bio');
  const availStatus = watch('availabilityStatus');

  useEffect(() => {
    if (profile) {
      reset({
        bio:               profile.bio ?? '',
        hourlyRate:        profile.hourlyRate != null ? String(profile.hourlyRate) : '',
        yearsExperience:   profile.yearsExperience != null ? String(profile.yearsExperience) : '',
        maxConcurrentJobs: String((profile as any).maxConcurrentJobs ?? 3),
        availabilityStatus: (profile.availabilityStatus as any) ?? 'available',
        skills: profile.skills?.length
          ? profile.skills.map((s) => ({
              skill:           s.skill,
              yearsExperience: String(s.yearsExperience ?? 0),
              hourlyRate:      String((s as any).hourlyRate ?? ''),
            }))
          : [{ skill: '', yearsExperience: '0', hourlyRate: '' }],
      });
      if ((profile as any).schedule) setSchedule((profile as any).schedule);
    }
  }, [profile, reset]);

  /* AI: debounced skill suggestions on bio change */
  useEffect(() => {
    if (!tier?.hasAIAccess || !bioValue || bioValue.length < 50) return;
    if (bioDebounceRef.current) clearTimeout(bioDebounceRef.current);
    bioDebounceRef.current = setTimeout(async () => {
      try {
        const currentSkills = fields.map((f) => (f as any).skill).filter(Boolean);
        if (currentSkills.length >= 10) return;
        const result = await suggestSkills(bioValue, currentSkills);
        setSuggestions(result.filter((s) => !currentSkills.includes(s)));
      } catch { /* ignore */ }
    }, 1500);
    return () => { if (bioDebounceRef.current) clearTimeout(bioDebounceRef.current); };
  }, [bioValue, tier?.hasAIAccess]);

  const generateBioMutation = useMutation({
    mutationFn: generateBio,
    onSuccess:  (bio) => setValue('bio', bio),
    onError:    (err: any) => Alert.alert('AI Bio', err?.message ?? 'Feature unavailable right now.'),
  });

  const saveMutation = useMutation({
    mutationFn: (values: FormData) =>
      updateProviderProfile({
        bio:                values.bio?.trim() || undefined,
        hourlyRate:         values.hourlyRate ? Number(values.hourlyRate) : undefined,
        yearsExperience:    values.yearsExperience ? Number(values.yearsExperience) : undefined,
        maxConcurrentJobs:  values.maxConcurrentJobs ? Number(values.maxConcurrentJobs) : undefined,
        availabilityStatus: values.availabilityStatus,
        schedule,
        skills: values.skills
          .filter((s) => s.skill.trim())
          .map((s) => ({
            skill:           s.skill.trim(),
            yearsExperience: Number(s.yearsExperience) || 0,
            hourlyRate:      s.hourlyRate || '0',
          })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provider-profile'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: () => Alert.alert('Error', 'Could not save changes. Please try again.'),
  });

  function addSuggestedSkill(name: string) {
    const rate = watch('hourlyRate');
    const yrs  = watch('yearsExperience');
    append({ skill: name, yearsExperience: yrs || '0', hourlyRate: rate || '' });
    setSuggestions((prev) => prev.filter((s) => s !== name));
  }

  const inp = [styles.input, { backgroundColor: theme.background, color: theme.text }];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* ── Header ─────────────────────────────────────────── */}
        <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Profile & Skills</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isLoading ? (
            <ActivityIndicator color={Primary[500]} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* ── Bio card ───────────────────────────────────── */}
              <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconWrap, { backgroundColor: Primary[50] }]}>
                    <Icon name="document-text-outline" size={18} color={Primary[500]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Bio</Text>
                    <Text style={[styles.cardSub, { color: theme.textSecondary }]}>Describe your expertise to attract clients</Text>
                  </View>
                  <Pressable
                    style={[styles.aiBtn, { backgroundColor: tier?.hasAIAccess ? Primary[500] : theme.background }]}
                    onPress={() => tier?.hasAIAccess
                      ? generateBioMutation.mutate()
                      : Alert.alert('Gold Tier Required', tier?.nextMsg ?? '')}
                    disabled={generateBioMutation.isPending}
                  >
                    {generateBioMutation.isPending
                      ? <ActivityIndicator size="small" color={tier?.hasAIAccess ? '#fff' : theme.textSecondary} />
                      : <Icon name={tier?.hasAIAccess ? 'sparkles' : 'lock-closed-outline'} size={14} color={tier?.hasAIAccess ? '#fff' : theme.textSecondary} />
                    }
                    <Text style={[styles.aiBtnText, { color: tier?.hasAIAccess ? '#fff' : theme.textSecondary }]}>
                      AI Bio
                    </Text>
                  </Pressable>
                </View>

                <Controller control={control} name="bio" render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
                    style={[...inp, styles.textarea]}
                    value={value} onChangeText={onChange} onBlur={onBlur}
                    multiline numberOfLines={5}
                    placeholder="Describe your services and experience…"
                    placeholderTextColor={theme.textSecondary}
                    maxLength={1000}
                  />
                )} />
                <View style={styles.bioFooter}>
                  {errors.bio
                    ? <Text style={styles.errText}>{errors.bio.message}</Text>
                    : <View />
                  }
                  <Text style={[styles.charCount, { color: theme.textSecondary }]}>{(bioValue ?? '').length}/1000</Text>
                </View>
              </View>

              {/* ── Numbers card ───────────────────────────────── */}
              <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconWrap, { backgroundColor: '#f59e0b18' }]}>
                    <Icon name="stats-chart-outline" size={18} color="#f59e0b" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Rate & Experience</Text>
                    <Text style={[styles.cardSub, { color: theme.textSecondary }]}>Set your pricing and capacity</Text>
                  </View>
                </View>

                <View style={styles.row3}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Rate (₱/hr)</Text>
                    <Controller control={control} name="hourlyRate" render={({ field: { value, onChange, onBlur } }) => (
                      <TextInput style={inp} value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="numeric" placeholder="500" placeholderTextColor={theme.textSecondary} />
                    )} />
                  </View>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Yrs Exp.</Text>
                    <Controller control={control} name="yearsExperience" render={({ field: { value, onChange, onBlur } }) => (
                      <TextInput style={inp} value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="numeric" placeholder="5" placeholderTextColor={theme.textSecondary} />
                    )} />
                  </View>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Max Jobs</Text>
                    <Controller control={control} name="maxConcurrentJobs" render={({ field: { value, onChange, onBlur } }) => (
                      <TextInput style={inp} value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="numeric" placeholder="3" placeholderTextColor={theme.textSecondary} />
                    )} />
                  </View>
                </View>
              </View>

              {/* ── Availability card ──────────────────────────── */}
              <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconWrap, { backgroundColor: AVAIL_META[availStatus]?.bg ?? Status.successBg }]}>
                    <Icon name="radio-button-on-outline" size={18} color={AVAIL_META[availStatus]?.color ?? Status.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Availability</Text>
                    <Text style={[styles.cardSub, { color: theme.textSecondary }]}>Let clients know if you're open for work</Text>
                  </View>
                </View>

                <Controller control={control} name="availabilityStatus" render={({ field: { value, onChange } }) => (
                  <View style={styles.chipRow}>
                    {(['available', 'busy', 'unavailable'] as const).map((opt) => {
                      const meta    = AVAIL_META[opt];
                      const active  = value === opt;
                      return (
                        <Pressable
                          key={opt}
                          style={[styles.availChip, { backgroundColor: active ? meta.color : theme.background }]}
                          onPress={() => onChange(opt)}
                        >
                          <View style={[styles.availDot, { backgroundColor: active ? '#fff' : meta.color }]} />
                          <Text style={[styles.availChipText, { color: active ? '#fff' : theme.text }]}>{meta.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )} />
              </View>

              {/* ── Skills card ────────────────────────────────── */}
              <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconWrap, { backgroundColor: '#8b5cf618' }]}>
                    <Icon name="construct-outline" size={18} color="#8b5cf6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Skills</Text>
                    <Text style={[styles.cardSub, { color: theme.textSecondary }]}>{fields.length}/20 added</Text>
                  </View>
                  <Pressable
                    style={[styles.addSkillBtn, { backgroundColor: Primary[50] }]}
                    onPress={() => append({ skill: '', yearsExperience: '0', hourlyRate: '' })}
                    disabled={fields.length >= 20}
                  >
                    <Icon name="add" size={16} color={Primary[600]} />
                    <Text style={[styles.addSkillBtnText, { color: Primary[600] }]}>Add</Text>
                  </Pressable>
                </View>

                {/* AI suggestions */}
                {suggestions.length > 0 && (
                  <View style={[styles.suggestBox, { backgroundColor: Primary[50] }]}>
                    <View style={styles.suggestTitleRow}>
                      <Icon name="sparkles" size={13} color={Primary[600]} />
                      <Text style={[styles.suggestTitle, { color: Primary[700] }]}>AI Suggestions</Text>
                    </View>
                    <View style={styles.suggestChips}>
                      {suggestions.map((s) => (
                        <Pressable
                          key={s}
                          style={[styles.suggestChip, { backgroundColor: Primary[100] }]}
                          onPress={() => addSuggestedSkill(s)}
                        >
                          <Icon name="add" size={12} color={Primary[700]} />
                          <Text style={[styles.suggestChipText, { color: Primary[700] }]}>{s}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}

                {/* Column header */}
                <View style={[styles.skillColHeader, { backgroundColor: theme.background }]}>
                  <Text style={[styles.skillColText, { flex: 2, color: theme.textSecondary }]}>Skill</Text>
                  <Text style={[styles.skillColText, { flex: 1, color: theme.textSecondary }]}>Yrs</Text>
                  <Text style={[styles.skillColText, { flex: 1, color: theme.textSecondary }]}>₱/hr</Text>
                  <View style={{ width: 30 }} />
                </View>

                {/* Skill rows */}
                <View style={{ gap: Spacing.two }}>
                  {fields.map((field, idx) => (
                    <View key={field.id} style={styles.skillRow}>
                      <View style={{ flex: 2 }}>
                        <Controller control={control} name={`skills.${idx}.skill`} render={({ field: { value, onChange, onBlur } }) => (
                          <TextInput style={inp} value={value} onChangeText={onChange} onBlur={onBlur} placeholder="e.g. Plumbing" placeholderTextColor={theme.textSecondary} />
                        )} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Controller control={control} name={`skills.${idx}.yearsExperience`} render={({ field: { value, onChange, onBlur } }) => (
                          <TextInput style={[inp, { textAlign: 'center' }]} value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="numeric" placeholder="0" placeholderTextColor={theme.textSecondary} />
                        )} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Controller control={control} name={`skills.${idx}.hourlyRate`} render={({ field: { value, onChange, onBlur } }) => (
                          <TextInput style={[inp, { textAlign: 'center' }]} value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="numeric" placeholder="500" placeholderTextColor={theme.textSecondary} />
                        )} />
                      </View>
                      {fields.length > 1 ? (
                        <Pressable onPress={() => remove(idx)} hitSlop={8} style={[styles.removeSkillBtn, { backgroundColor: Status.errorBg }]}>
                          <Icon name="close" size={13} color={Status.error} />
                        </Pressable>
                      ) : (
                        <View style={{ width: 30 }} />
                      )}
                    </View>
                  ))}
                </View>
              </View>

              {/* ── Schedule card ──────────────────────────────── */}
              <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconWrap, { backgroundColor: '#0ea5e918' }]}>
                    <Icon name="calendar-outline" size={18} color="#0ea5e9" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Weekly Schedule</Text>
                    <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
                      {DAYS.filter((d) => schedule[d].enabled).length} days enabled
                    </Text>
                  </View>
                </View>

                <View style={[styles.scheduleList, { backgroundColor: theme.background }]}>
                  {DAYS.map((day, i) => {
                    const slot   = schedule[day];
                    const isLast = i === DAYS.length - 1;
                    return (
                      <View key={day}>
                        <View style={styles.scheduleRow}>
                          <Switch
                            value={slot.enabled}
                            onValueChange={(v) => setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], enabled: v } }))}
                            trackColor={{ false: theme.backgroundElement, true: Primary[400] }}
                            thumbColor={slot.enabled ? Primary[600] : '#f0f0f0'}
                          />
                          <Text style={[styles.dayLabel, { color: slot.enabled ? theme.text : theme.textSecondary, fontWeight: slot.enabled ? '700' : '400' }]}>
                            {DAY_LABELS[day]}
                          </Text>
                          {slot.enabled ? (
                            <View style={styles.timeRow}>
                              <TextInput
                                style={[styles.timeInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                                value={slot.from}
                                onChangeText={(v) => setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], from: v } }))}
                                placeholder="08:00"
                                placeholderTextColor={theme.textSecondary}
                                maxLength={5}
                              />
                              <Text style={[styles.timeSep, { color: theme.textSecondary }]}>–</Text>
                              <TextInput
                                style={[styles.timeInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                                value={slot.to}
                                onChangeText={(v) => setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], to: v } }))}
                                placeholder="17:00"
                                placeholderTextColor={theme.textSecondary}
                                maxLength={5}
                              />
                            </View>
                          ) : (
                            <View style={[styles.offPill, { backgroundColor: theme.backgroundElement }]}>
                              <Text style={[styles.offLabel, { color: theme.textSecondary }]}>Off</Text>
                            </View>
                          )}
                        </View>
                        {!isLast && <View style={[styles.rowDivider, { backgroundColor: theme.backgroundElement }]} />}
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* ── Save button ────────────────────────────────── */}
              <Pressable
                style={[styles.saveBtn, { backgroundColor: saved ? Status.success : Primary[500] }]}
                onPress={handleSubmit((v) => saveMutation.mutate(v))}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Icon name={saved ? 'checkmark-circle' : 'save-outline'} size={18} color="#fff" />
                }
                <Text style={styles.saveBtnText}>
                  {saveMutation.isPending ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ─── Styles ──────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe:             { flex: 1 },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:          { width: 32, alignItems: 'flex-start' },
  headerTitle:      { fontSize: 17, fontWeight: '700' },
  scroll:           { padding: Spacing.four, gap: Spacing.three, paddingBottom: BottomTabInset + 24 },

  /* Cards */
  card:             { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  cardHeader:       { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  cardIconWrap:     { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardTitle:        { fontSize: 15, fontWeight: '700' },
  cardSub:          { fontSize: 12, marginTop: 1 },

  /* Bio */
  input:            { borderRadius: 11, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
  textarea:         { minHeight: 110, textAlignVertical: 'top', paddingTop: 12 },
  bioFooter:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  charCount:        { fontSize: 11 },
  errText:          { color: '#dc2626', fontSize: 12 },

  /* AI button */
  aiBtn:            { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, flexShrink: 0 },
  aiBtnText:        { fontSize: 12, fontWeight: '700' },

  /* Numbers */
  row3:             { flexDirection: 'row', gap: Spacing.two },
  fieldLabel:       { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  /* Availability */
  chipRow:          { flexDirection: 'row', gap: Spacing.two },
  availChip:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 11, paddingVertical: 10 },
  availDot:         { width: 7, height: 7, borderRadius: 3.5 },
  availChipText:    { fontSize: 13, fontWeight: '600' },

  /* Skills */
  addSkillBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  addSkillBtnText:  { fontSize: 13, fontWeight: '700' },
  suggestBox:       { borderRadius: 12, padding: Spacing.two, gap: 8 },
  suggestTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  suggestTitle:     { fontSize: 12, fontWeight: '700' },
  suggestChips:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  suggestChip:      { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  suggestChipText:  { fontSize: 12, fontWeight: '600' },
  skillColHeader:   { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, gap: Spacing.two },
  skillColText:     { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  skillRow:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  removeSkillBtn:   { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  /* Schedule */
  scheduleList:     { borderRadius: 12, overflow: 'hidden' },
  scheduleRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: 13 },
  rowDivider:       { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.three },
  dayLabel:         { width: 36, fontSize: 13 },
  timeRow:          { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeInput:        { flex: 1, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 7, fontSize: 13, textAlign: 'center' },
  timeSep:          { fontSize: 13 },
  offPill:          { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  offLabel:         { fontSize: 12, fontWeight: '500' },

  /* Save */
  saveBtn:          { borderRadius: 14, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnText:      { color: '#fff', fontSize: 15, fontWeight: '700' },
});
