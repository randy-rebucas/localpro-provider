import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getMe, getProviderProfile, logout } from '@/api/auth';
import { getProviderTier, updateMe, uploadAvatar } from '@/api/provider-profile';
import { Icon } from '@/components/icon';
import { CardSkeleton } from '@/components/loading-skeleton';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/auth-store';

/* ─── Row component ─────────────────────────────────────────────────── */
function ProfileRow({ iconName, iconBg, label, value, onPress, right }: {
  iconName: string;
  iconBg: string;
  label: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [styles.row, { backgroundColor: theme.backgroundElement, opacity: pressed && onPress ? 0.7 : 1 }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Icon name={iconName as any} size={18} color="#fff" />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
        {value ? <Text style={[styles.rowValue, { color: theme.textSecondary }]} numberOfLines={1}>{value}</Text> : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron-forward" size={16} color={theme.textSecondary} /> : null)}
    </Pressable>
  );
}

/* ─── Section label ─────────────────────────────────────────────────── */
function SectionLabel({ text }: { text: string }) {
  const theme = useTheme();
  return <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{text}</Text>;
}

/* ─── Group wrapper ─────────────────────────────────────────────────── */
function Group({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

/* ─── Screen ────────────────────────────────────────────────────────── */
export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { user, clearUser, setUser } = useAuthStore();
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [editingName,   setEditingName]   = useState(false);
  const [nameInput,     setNameInput]     = useState('');

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['provider-profile'],
    queryFn:  getProviderProfile,
    staleTime: 1000 * 60 * 5,
  });

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn:  getMe,
    staleTime: 1000 * 60 * 5,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => { clearUser(); qc.clear(); },
  });

  const tier       = profile ? getProviderTier(profile.completedJobCount ?? 0, profile.avgRating ?? 0, profile.completionRate ?? 0) : null;
  const completion = profile?.completionPercent ?? 0;
  const kycStatus  = me?.kycStatus ?? user?.kycStatus ?? 'none';
  const avatarUrl  = me?.avatar ?? profile?.userId?.avatar ?? user?.avatar;

  async function handleAvatarChange() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.length) return;
    setAvatarLoading(true);
    try {
      const asset = result.assets[0];
      // Single-step: POST /api/auth/me/avatar — server handles Cloudinary + saves URL
      const url = await uploadAvatar(asset.uri, asset.mimeType ?? 'image/jpeg');
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['provider-profile'] });
      if (user) setUser({ ...user, avatar: url });
    } catch {
      Alert.alert('Error', 'Could not upload avatar. Please try again.');
    } finally {
      setAvatarLoading(false);
    }
  }

  const nameMutation = useMutation({
    mutationFn: (name: string) => updateMe({ name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      if (user) setUser({ ...user, name: nameInput.trim() });
      setEditingName(false);
    },
    onError: () => Alert.alert('Error', 'Could not update name.'),
  });

  function startEditName() {
    setNameInput(user?.name ?? '');
    setEditingName(true);
  }

  function saveName() {
    const trimmed = nameInput.trim();
    if (trimmed.length < 2) {
      Alert.alert('Invalid name', 'Name must be at least 2 characters.');
      return;
    }
    nameMutation.mutate(trimmed);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <View style={[styles.hero, { backgroundColor: theme.backgroundElement }]}>
          {/* Avatar */}
          <Pressable style={styles.avatarWrap} onPress={handleAvatarChange} disabled={avatarLoading}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: Primary[500] }]}>
                <Text style={styles.avatarInitial}>{user?.name?.charAt(0).toUpperCase() ?? 'P'}</Text>
              </View>
            )}
            <View style={[styles.avatarEditBadge, { backgroundColor: Primary[500], borderColor: theme.backgroundElement }]}>
              {avatarLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Icon name="camera" size={12} color="#fff" />}
            </View>
          </Pressable>

          {/* Name — tappable to edit inline */}
          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                style={[styles.nameInput, { backgroundColor: theme.background, color: theme.text }]}
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                maxLength={100}
                returnKeyType="done"
                onSubmitEditing={saveName}
              />
              <Pressable
                style={[styles.nameEditBtn, { backgroundColor: Primary[500] }]}
                onPress={saveName}
                disabled={nameMutation.isPending}
              >
                {nameMutation.isPending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Icon name="checkmark" size={16} color="#fff" />
                }
              </Pressable>
              <Pressable
                style={[styles.nameEditBtn, { backgroundColor: theme.background }]}
                onPress={() => setEditingName(false)}
              >
                <Icon name="close" size={16} color={theme.textSecondary} />
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.nameRow} onPress={startEditName}>
              <Text style={[styles.heroName, { color: theme.text }]}>{user?.name}</Text>
              <Icon name="create-outline" size={16} color={theme.textSecondary} />
            </Pressable>
          )}
          <Text style={[styles.heroEmail, { color: theme.textSecondary }]}>{user?.email}</Text>

          {/* Tier pill */}
          {tier && (
            <View style={[styles.tierPill, { backgroundColor: tier.color + '20', borderColor: tier.color }]}>
              <Icon name="ribbon" size={12} color={tier.color} />
              <Text style={[styles.tierPillText, { color: tier.color }]}>{tier.label} Provider</Text>
            </View>
          )}

          {/* Completion bar */}
          <View style={styles.completionBlock}>
            <View style={styles.completionTopRow}>
              <Text style={[styles.completionLabel, { color: theme.textSecondary }]}>Profile completion</Text>
              <Text style={[styles.completionPct, { color: completion >= 80 ? Status.success : Status.warning }]}>
                {completion}%
              </Text>
            </View>
            <View style={[styles.track, { backgroundColor: Primary[100] }]}>
              <View style={[styles.trackFill, {
                width: `${completion}%`,
                backgroundColor: completion >= 80 ? Status.success : Primary[500],
              }]} />
            </View>
            {completion < 100 && (
              <Text style={[styles.completionHint, { color: theme.textSecondary }]}>
                Add more details to attract better jobs
              </Text>
            )}
          </View>
        </View>

        {/* ── KYC banner ───────────────────────────────────────── */}
        {kycStatus === 'none' && (
          <Pressable
            style={[styles.banner, { backgroundColor: Status.warningBg, borderColor: Status.warning }]}
            onPress={() => router.push('/(app)/profile/kyc')}
          >
            <View style={[styles.bannerIcon, { backgroundColor: Status.warning + '22' }]}>
              <Icon name="shield-outline" size={18} color={Status.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: Status.warning }]}>Verify your identity</Text>
              <Text style={[styles.bannerSub, { color: Status.warning }]}>Get a verified badge and more job visibility</Text>
            </View>
            <Icon name="chevron-forward" size={15} color={Status.warning} />
          </Pressable>
        )}
        {kycStatus === 'pending' && (
          <View style={[styles.banner, { backgroundColor: Status.infoBg, borderColor: Status.info }]}>
            <View style={[styles.bannerIcon, { backgroundColor: Status.info + '22' }]}>
              <Icon name="time-outline" size={18} color={Status.info} />
            </View>
            <Text style={[styles.bannerTitle, { color: Status.info, flex: 1 }]}>Documents under review</Text>
          </View>
        )}
        {kycStatus === 'rejected' && (
          <Pressable
            style={[styles.banner, { backgroundColor: Status.errorBg, borderColor: Status.error }]}
            onPress={() => router.push('/(app)/profile/kyc')}
          >
            <View style={[styles.bannerIcon, { backgroundColor: Status.error + '22' }]}>
              <Icon name="close-circle-outline" size={18} color={Status.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: Status.error }]}>Verification rejected</Text>
              <Text style={[styles.bannerSub, { color: Status.error }]}>Tap to resubmit your documents</Text>
            </View>
            <Icon name="chevron-forward" size={15} color={Status.error} />
          </Pressable>
        )}

        {profileLoading ? (
          <View style={{ gap: Spacing.two }}>
            {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
          </View>
        ) : (
          <>
            {/* ── Stats grid ───────────────────────────────────── */}
            <SectionLabel text="STATS" />
            <View style={[styles.statsGrid, { backgroundColor: theme.backgroundElement }]}>
              {[
                { label: 'Rating',     value: profile?.avgRating ? profile.avgRating.toFixed(1) : '—', unit: '★', color: '#f59e0b' },
                { label: 'Jobs Done',  value: String(profile?.completedJobCount ?? 0),  unit: '',  color: Primary[500] },
                { label: 'Completion', value: profile?.completionRate != null ? String(profile.completionRate) : '—', unit: '%', color: Status.success },
                { label: 'Resp. Time', value: (profile as any)?.avgResponseTimeHours != null ? String((profile as any).avgResponseTimeHours) : '—', unit: 'h', color: Status.info },
              ].map((stat) => (
                <View key={stat.label} style={styles.statCell}>
                  <Text style={[styles.statValue, { color: stat.color }]}>
                    {stat.value}<Text style={styles.statUnit}>{stat.unit}</Text>
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* ── Profile ──────────────────────────────────────── */}
            <SectionLabel text="PROFILE" />
            <Group>
              <ProfileRow iconName="create-outline"   iconBg="#6366f1" label="Bio & Skills"    value={profile?.bio?.slice(0, 55) || 'Not set'} onPress={() => router.push('/(app)/profile/skills')} />
              <ProfileRow iconName="location-outline" iconBg="#10b981" label="Service Areas"   value={profile?.serviceAreas?.map((a) => a.label).join(', ') || 'Not set'} onPress={() => router.push('/(app)/profile/service-areas')} />
              <ProfileRow iconName="images-outline"   iconBg="#8b5cf6" label="Portfolio"       value={profile?.portfolioItems?.length ? `${profile.portfolioItems.length} items` : 'Add work photos'} onPress={() => router.push('/(app)/profile/portfolio')} />
              <ProfileRow iconName="home-outline"     iconBg="#0891b2" label="Saved Addresses" value={me?.addresses?.length ? `${me.addresses.length} saved` : 'Add address'} onPress={() => router.push('/(app)/profile/addresses')} />
              <ProfileRow iconName="call-outline"     iconBg="#3b82f6" label="Phone Number"    value={me?.phone || 'Not set'} onPress={() => router.push('/(app)/profile/addresses')} />
            </Group>

            {/* ── Credentials ──────────────────────────────────── */}
            <SectionLabel text="CREDENTIALS" />
            <Group>
              <ProfileRow
                iconName="school-outline"
                iconBg="#f59e0b"
                label="Certifications"
                value={profile?.certifications?.length ? `${profile.certifications.length} added` : 'None (PESO-managed)'}
                onPress={() => router.push('/(app)/profile/certifications')}
              />
              <ProfileRow
                iconName="shield-checkmark-outline"
                iconBg={kycStatus === 'approved' ? Status.success : '#9ca3af'}
                label="Identity Verification"
                value={kycStatus === 'approved' ? 'Verified ✓' : kycStatus === 'pending' ? 'Under review' : 'Not verified'}
                onPress={kycStatus !== 'approved' ? () => router.push('/(app)/profile/kyc') : undefined}
                right={kycStatus === 'approved' ? (
                  <View style={[styles.verifiedBadge, { backgroundColor: Status.successBg }]}>
                    <Icon name="checkmark-circle" size={16} color={Status.success} />
                  </View>
                ) : undefined}
              />
            </Group>

            {/* ── Growth ───────────────────────────────────────── */}
            <SectionLabel text="GROWTH" />
            <Group>
              <ProfileRow iconName="rocket-outline"   iconBg="#ef4444" label="Provider Boost"    value="Promote your profile"      onPress={() => router.push('/(app)/profile/boost')} />
              <ProfileRow iconName="book-outline"     iconBg="#8b5cf6" label="Training & Courses" value="Earn badges, unlock tiers" onPress={() => router.push('/(app)/profile/training' as any)} />
              <ProfileRow iconName="gift-outline"     iconBg="#f59e0b" label="Loyalty & Rewards"  value="Points & tier benefits"    onPress={() => router.push('/(app)/loyalty')} />
            </Group>

            {/* ── Account ──────────────────────────────────────── */}
            <SectionLabel text="ACCOUNT" />
            <Group>
              <ProfileRow iconName="settings-outline" iconBg="#6b7280" label="Settings" onPress={() => router.push('/(app)/profile/settings')} />
            </Group>
          </>
        )}

        {/* ── Log out ──────────────────────────────────────────── */}
        <Pressable
          style={[styles.logoutBtn, { backgroundColor: Status.errorBg, borderColor: Status.error }]}
          onPress={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending
            ? <ActivityIndicator size="small" color={Status.error} />
            : <Icon name="log-out-outline" size={18} color={Status.error} />
          }
          <Text style={[styles.logoutText, { color: Status.error }]}>
            {logoutMutation.isPending ? 'Logging out…' : 'Log Out'}
          </Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Styles ────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe:              { flex: 1 },
  scroll:            { padding: Spacing.four, gap: Spacing.two, paddingBottom: BottomTabInset },

  /* Hero */
  hero:              { borderRadius: 20, padding: Spacing.four, alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.one },
  avatarWrap:        { position: 'relative', marginBottom: Spacing.one },
  avatar:            { width: 90, height: 90, borderRadius: 45 },
  avatarInitial:     { color: '#fff', fontSize: 36, fontWeight: '800' },
  avatarEditBadge:   { position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  nameRow:           { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroName:          { fontSize: 22, fontWeight: '800' },
  nameEditRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', paddingHorizontal: Spacing.two },
  nameInput:         { flex: 1, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  nameEditBtn:       { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  heroEmail:         { fontSize: 14, marginTop: -4 },
  tierPill:          { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1.5 },
  tierPillText:      { fontSize: 12, fontWeight: '700' },
  completionBlock:   { width: '100%', gap: 6, marginTop: Spacing.one },
  completionTopRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  completionLabel:   { fontSize: 13 },
  completionPct:     { fontSize: 13, fontWeight: '800' },
  track:             { height: 7, borderRadius: 4, overflow: 'hidden' },
  trackFill:         { height: 7, borderRadius: 4 },
  completionHint:    { fontSize: 11, marginTop: -2 },

  /* KYC banner */
  banner:            { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: 14, padding: Spacing.three, borderWidth: 1.5 },
  bannerIcon:        { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  bannerTitle:       { fontSize: 14, fontWeight: '700' },
  bannerSub:         { fontSize: 12, marginTop: 2 },

  /* Section label */
  sectionLabel:      { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 4, marginTop: Spacing.two },

  /* Group */
  group:             { borderRadius: 16, overflow: 'hidden', gap: StyleSheet.hairlineWidth },

  /* Row */
  row:               { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 4, gap: Spacing.two },
  rowIcon:           { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowContent:        { flex: 1, gap: 2 },
  rowLabel:          { fontSize: 14, fontWeight: '500' },
  rowValue:          { fontSize: 12 },
  verifiedBadge:     { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  /* Stats grid */
  statsGrid:         { borderRadius: 16, flexDirection: 'row', flexWrap: 'wrap' },
  statCell:          { width: '50%', alignItems: 'center', paddingVertical: Spacing.three, gap: 3, borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.06)' },
  statValue:         { fontSize: 26, fontWeight: '800' },
  statUnit:          { fontSize: 14, fontWeight: '600' },
  statLabel:         { fontSize: 12 },

  /* Logout */
  logoutBtn:         { borderRadius: 14, borderWidth: 1.5, paddingVertical: Spacing.three, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: Spacing.two, marginTop: Spacing.two },
  logoutText:        { fontSize: 15, fontWeight: '700' },
});
