import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getProviderProfile, logout } from '@/api/auth';
import { Icon } from '@/components/icon';
import { CardSkeleton } from '@/components/loading-skeleton';
import { Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/auth-store';

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.section, { backgroundColor: theme.backgroundElement }]}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
      {children}
    </View>
  );
}

function ProfileRow({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress}>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: theme.text }]} numberOfLines={2}>{value || '—'}</Text>
      </View>
      {onPress && <Icon name="chevron-forward" size={18} color={theme.textSecondary} />}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { user, clearUser } = useAuthStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['provider-profile'],
    queryFn: getProviderProfile,
    staleTime: 1000 * 60 * 5,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => { clearUser(); qc.clear(); },
  });

  const completion = profile?.completionPercent ?? 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.avatarCircle, { backgroundColor: Primary[100] }]}>
            <Text style={[styles.avatarInitial, { color: Primary[700] }]}>
              {user?.name?.charAt(0).toUpperCase() ?? 'P'}
            </Text>
          </View>
          <Text style={[styles.name, { color: theme.text }]}>{user?.name}</Text>
          <Text style={[styles.email, { color: theme.textSecondary }]}>{user?.email}</Text>

          <View style={[styles.completionWrap, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.completionTop}>
              <Text style={[styles.completionLabel, { color: theme.textSecondary }]}>Profile completion</Text>
              <Text style={[styles.completionPct, { color: completion >= 80 ? Status.success : Status.warning }]}>
                {completion}%
              </Text>
            </View>
            <View style={[styles.track, { backgroundColor: Primary[100] }]}>
              <View style={[styles.fill, { backgroundColor: Primary[500], width: `${completion}%` }]} />
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={{ gap: Spacing.two }}>
            {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
          </View>
        ) : (
          <>
            <ProfileSection title="PROFILE">
              <ProfileRow label="Bio" value={profile?.bio || 'Not set'} onPress={() => router.push('/(app)/profile/skills')} />
              <ProfileRow label="Skills" value={profile?.skills?.map((s) => s.skill).join(', ') || 'Not set'} onPress={() => router.push('/(app)/profile/skills')} />
              <ProfileRow label="Years Experience" value={profile?.yearsExperience ? `${profile.yearsExperience} years` : 'Not set'} onPress={() => router.push('/(app)/profile/skills')} />
              <ProfileRow label="Hourly Rate" value={profile?.hourlyRate ? `₱${profile.hourlyRate}/hr` : 'Not set'} onPress={() => router.push('/(app)/profile/skills')} />
            </ProfileSection>

            <ProfileSection title="SERVICE AREAS">
              <ProfileRow label="Locations" value={profile?.serviceAreas?.map((a) => a.label).join(', ') || 'Not set'} onPress={() => router.push('/(app)/profile/service-areas')} />
            </ProfileSection>

            <ProfileSection title="CREDENTIALS">
              <ProfileRow label="Certifications" value={profile?.certifications?.length ? `${profile.certifications.length} added` : 'None added'} onPress={() => router.push('/(app)/profile/certifications')} />
              <ProfileRow label="Portfolio" value={profile?.portfolioItems?.length ? `${profile.portfolioItems.length} items` : 'None added'} onPress={() => router.push('/(app)/profile/portfolio')} />
            </ProfileSection>

            <ProfileSection title="STATS">
              <ProfileRow label="Average Rating" value={profile?.avgRating ? `${profile.avgRating.toFixed(1)} ★` : 'No ratings yet'} />
              <ProfileRow label="Completed Jobs" value={String(profile?.completedJobCount ?? 0)} />
              <ProfileRow label="Availability" value={profile?.availabilityStatus ?? 'available'} />
            </ProfileSection>

            <ProfileSection title="ACCOUNT">
              <ProfileRow label="Settings" value="" onPress={() => router.push('/(app)/profile/settings')} />
              <ProfileRow label="Loyalty & Rewards" value="" onPress={() => router.push('/(app)/loyalty')} />
            </ProfileSection>
          </>
        )}

        <Pressable
          style={[styles.logoutBtn, { borderColor: Status.error }]}
          onPress={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          <Icon name="log-out-outline" size={18} color={Status.error} />
          <Text style={[styles.logoutText, { color: Status.error }]}>
            {logoutMutation.isPending ? 'Logging out…' : 'Log Out'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.four, gap: Spacing.three, paddingBottom: 40 },
  header: { alignItems: 'center', gap: Spacing.two },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 32, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '700' },
  email: { fontSize: 14 },
  completionWrap: { width: '100%', borderRadius: 14, padding: Spacing.three, gap: Spacing.one },
  completionTop: { flexDirection: 'row', justifyContent: 'space-between' },
  completionLabel: { fontSize: 13 },
  completionPct: { fontSize: 13, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  section: { borderRadius: 16, overflow: 'hidden' },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.06)' },
  rowContent: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 12 },
  rowValue: { fontSize: 14, fontWeight: '500' },
  logoutBtn: { borderRadius: 14, borderWidth: 1.5, paddingVertical: Spacing.three, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: Spacing.two },
  logoutText: { fontSize: 15, fontWeight: '700' },
});
