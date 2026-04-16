import { useQuery } from '@tanstack/react-query';
import { useRouter, useSegments } from 'expo-router';
import { createContext, useContext, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getProviderProfile, logout } from '@/api/auth';
import { Icon, type IconName } from '@/components/icon';
import { Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/auth-store';

/* ─── Types ──────────────────────────────────────────────────────────── */

interface ProfileField {
  label: string;
  done: boolean;
  icon: IconName;
  route: string;
}

interface ProfileCompletionContextValue {
  completionPercent: number;
  fields: ProfileField[];
}

const ProfileCompletionContext = createContext<ProfileCompletionContextValue>({
  completionPercent: 0,
  fields: [],
});

/* ─── Gate screen ────────────────────────────────────────────────────── */

function ProfileCompletionGate({ percent, fields }: { percent: number; fields: ProfileField[] }) {
  const theme  = useTheme();
  const router = useRouter();
  const clearUser = useAuthStore((s) => s.clearUser);

  async function handleLogout() {
    try { await logout(); } finally {
      clearUser();
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: Primary[50] }]}>
            <Icon name="person-circle-outline" size={44} color={Primary[500]} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Complete Your Profile</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            Your profile must be 100% complete before you can start receiving jobs.
          </Text>
        </View>

        {/* Progress bar */}
        <View style={[styles.progressCard, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: theme.text }]}>Profile completion</Text>
            <Text style={[styles.progressPct, { color: Primary[500] }]}>{percent}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: Primary[100] }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: percent >= 80 ? Status.success : Primary[500],
                  width: `${percent}%` as any,
                },
              ]}
            />
          </View>
        </View>

        {/* Checklist */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Required steps</Text>
          {fields.map((field) => (
            <Pressable
              key={field.label}
              style={({ pressed }) => [
                styles.fieldRow,
                { opacity: pressed && !field.done ? 0.7 : 1 },
              ]}
              onPress={() => !field.done && router.push(field.route as any)}
              disabled={field.done}
            >
              <View style={[styles.fieldIconWrap, { backgroundColor: field.done ? Status.successBg : Primary[50] }]}>
                <Icon
                  name={field.done ? 'checkmark-circle' : field.icon}
                  size={18}
                  color={field.done ? Status.success : Primary[500]}
                />
              </View>
              <Text style={[styles.fieldLabel, { color: field.done ? theme.textSecondary : theme.text }]}>
                {field.label}
              </Text>
              {!field.done && (
                <Icon name="chevron-forward" size={16} color={theme.textSecondary} />
              )}
            </Pressable>
          ))}
        </View>

        {/* Sign out */}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={[styles.logoutText, { color: theme.textSecondary }]}>Sign Out</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Provider ───────────────────────────────────────────────────────── */

function buildFields(profile: any): ProfileField[] {
  return [
    {
      label: 'Profile photo',
      done:  !!profile?.userId?.avatar,
      icon:  'camera-outline',
      route: '/(app)/profile',
    },
    {
      label: 'Bio',
      done:  !!profile?.bio?.trim(),
      icon:  'create-outline',
      route: '/(app)/profile',
    },
    {
      label: 'Hourly rate',
      done:  profile?.hourlyRate != null,
      icon:  'cash-outline',
      route: '/(app)/profile',
    },
    {
      label: 'Years of experience',
      done:  (profile?.yearsExperience ?? 0) > 0,
      icon:  'time-outline',
      route: '/(app)/profile',
    },
    {
      label: 'Skills',
      done:  (profile?.skills?.length ?? 0) > 0,
      icon:  'construct-outline',
      route: '/(app)/profile/skills',
    },
    {
      label: 'Service areas',
      done:  (profile?.serviceAreas?.length ?? 0) > 0,
      icon:  'location-outline',
      route: '/(app)/profile/service-areas',
    },
  ];
}

export function ProfileCompletionProvider({ children }: { children: ReactNode }) {
  const segments = useSegments();
  const { data: profile, isLoading } = useQuery({
    queryKey:  ['provider-profile'],
    queryFn:   getProviderProfile,
    staleTime: 1000 * 60 * 5,
  });

  const percent  = profile?.completionPercent ?? 0;
  const fields   = buildFields(profile);

  // Hide the overlay while the user is inside a profile sub-screen so they
  // can actually fill in the required fields without the gate covering them.
  const inProfile  = segments.includes('profile' as never);
  const showGate   = !inProfile && (isLoading || percent < 100);

  return (
    <ProfileCompletionContext.Provider value={{ completionPercent: percent, fields }}>
      {/* Always mount children so (app) routes stay in the navigator tree */}
      {children}

      {/* Overlay only when outside profile screens and profile is incomplete */}
      {showGate && (
        <View style={StyleSheet.absoluteFill}>
          {isLoading ? <GateLoader /> : <ProfileCompletionGate percent={percent} fields={fields} />}
        </View>
      )}
    </ProfileCompletionContext.Provider>
  );
}

/** Consume inside any screen within the (app) group */
export function useProfileCompletion() {
  return useContext(ProfileCompletionContext);
}

/* ─── Styles ─────────────────────────────────────────────────────────── */

function GateLoader() {
  const theme = useTheme();
  return (
    <View style={[styles.loader, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={Primary[500]} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: {
    padding:    Spacing.four,
    gap:        Spacing.three,
    paddingBottom: Spacing.five,
  },

  header: { alignItems: 'center', gap: Spacing.two },
  iconWrap: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  body:  { fontSize: 15, textAlign: 'center', lineHeight: 22 },

  progressCard: { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel:  { fontSize: 14, fontWeight: '600' },
  progressPct:    { fontSize: 16, fontWeight: '800' },
  progressTrack:  { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill:   { height: 8, borderRadius: 4 },

  card:      { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: Spacing.one },

  fieldRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.two,
    paddingVertical: 6,
  },
  fieldIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  fieldLabel: { flex: 1, fontSize: 14, fontWeight: '500' },

  logoutBtn:  { alignSelf: 'center', paddingVertical: Spacing.two },
  logoutText: { fontSize: 14 },
});
