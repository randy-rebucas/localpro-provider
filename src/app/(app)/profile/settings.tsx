/**
 * Settings screen
 * Docs: mobile-auth-me-api.md §7, §8, §2
 *
 * GET /api/auth/me/preferences — load granular notification preferences
 * PUT /api/auth/me/preferences — toggle a single channel+category preference
 * PUT /api/auth/me             — change password (currentPassword + newPassword)
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getMe, getProviderProfile } from '@/api/auth';
import { api } from '@/api/client';
import { updateMe } from '@/api/provider-profile';
import { Icon } from '@/components/icon';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/auth-store';

/* ── Preferences types ────────────────────────────────────────── */
type Channel  = 'email' | 'push' | 'in_app';
type Category = 'job_updates' | 'messages' | 'payments' | 'reviews' | 'marketing' | 'system';

interface Preference {
  channel:  Channel;
  category: Category;
  enabled:  boolean;
}

interface PreferencesResponse {
  preferences: Preference[];
}

/* Channel → categories shown for that channel (per API docs) */
const CHANNEL_CATEGORIES: Record<Channel, Category[]> = {
  email:  ['job_updates', 'messages', 'payments', 'reviews', 'marketing', 'system'],
  push:   ['job_updates', 'messages'],
  in_app: ['job_updates'],
};

const CHANNEL_META: Record<Channel, { icon: string; label: string; color: string }> = {
  email:  { icon: 'mail-outline',          label: 'Email',   color: '#3b82f6' },
  push:   { icon: 'notifications-outline', label: 'Push',    color: '#8b5cf6' },
  in_app: { icon: 'chatbubble-outline',    label: 'In-app',  color: '#10b981' },
};

const CATEGORY_META: Record<Category, { label: string; icon: string }> = {
  job_updates: { label: 'Job Updates',  icon: 'briefcase-outline' },
  messages:    { label: 'Messages',     icon: 'chatbubble-ellipses-outline' },
  payments:    { label: 'Payments',     icon: 'card-outline' },
  reviews:     { label: 'Reviews',      icon: 'star-outline' },
  marketing:   { label: 'Marketing',    icon: 'megaphone-outline' },
  system:      { label: 'System',       icon: 'alert-circle-outline' },
};

async function getPreferences(): Promise<Preference[]> {
  const { data } = await api.get<PreferencesResponse>('/api/auth/me/preferences');
  return data.preferences ?? [];
}

async function putPreference(p: { channel: Channel; category: Category; enabled: boolean }): Promise<void> {
  await api.put('/api/auth/me/preferences', p);
}

/* ── Sub-components ───────────────────────────────────────────── */
function SectionLabel({ text, danger }: { text: string; danger?: boolean }) {
  const theme = useTheme();
  return (
    <Text style={[styles.sectionLabel, { color: danger ? Status.error : theme.textSecondary }]}>
      {text}
    </Text>
  );
}

function NavRow({ icon, iconBg, label, subtitle, onPress, danger }: {
  icon: string; iconBg: string; label: string; subtitle?: string;
  onPress: () => void; danger?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [styles.row, { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 }]}
      onPress={onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Icon name={icon as any} size={18} color="#fff" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowLabel, { color: danger ? Status.error : theme.text }]}>{label}</Text>
        {subtitle && <Text style={[styles.rowSub, { color: theme.textSecondary }]}>{subtitle}</Text>}
      </View>
      <Icon name="chevron-forward" size={16} color={danger ? Status.error : theme.textSecondary} />
    </Pressable>
  );
}

/* ── Screen ───────────────────────────────────────────────────── */
export default function SettingsScreen() {
  const theme  = useTheme();
  const router = useRouter();
  const qc     = useQueryClient();
  const { user, clearUser } = useAuthStore();

  /* ── User / profile data (for avatar) ─────────────────────── */
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn:  getMe,
    staleTime: 1000 * 60 * 5,
  });
  const { data: profile } = useQuery({
    queryKey: ['provider-profile'],
    queryFn:  getProviderProfile,
    staleTime: 1000 * 60 * 5,
  });
  const avatarUrl = me?.avatar ?? profile?.userId?.avatar ?? user?.avatar;

  /* ── Notification preferences ─────────────────────────────── */
  const { data: prefsData, isLoading: prefsLoading } = useQuery({
    queryKey: ['me-preferences'],
    queryFn:  getPreferences,
    staleTime: 1000 * 60 * 5,
  });
  const prefs: Preference[] = Array.isArray(prefsData) ? prefsData : [];

  // Optimistic local overrides: key = "channel:category"
  const [localOverrides, setLocalOverrides] = useState<Record<string, boolean>>({});

  const prefMutation = useMutation({
    mutationFn: putPreference,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me-preferences'] }),
    onError: (_, vars) => {
      // Revert optimistic update on error
      setLocalOverrides((prev) => {
        const next = { ...prev };
        delete next[`${vars.channel}:${vars.category}`];
        return next;
      });
      Alert.alert('Error', 'Could not save preference.');
    },
  });

  function getPrefValue(channel: Channel, category: Category): boolean {
    const key = `${channel}:${category}`;
    if (key in localOverrides) return localOverrides[key];
    return prefs.find((p) => p.channel === channel && p.category === category)?.enabled ?? true;
  }

  function togglePref(channel: Channel, category: Category, value: boolean) {
    const key = `${channel}:${category}`;
    setLocalOverrides((prev) => ({ ...prev, [key]: value }));
    prefMutation.mutate({ channel, category, enabled: value });
  }

  /* ── Password change ──────────────────────────────────────── */
  const [pwExpanded,   setPwExpanded]   = useState(false);
  const [currentPw,    setCurrentPw]    = useState('');
  const [newPw,        setNewPw]        = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw,     setShowNewPw]     = useState(false);

  const pwMutation = useMutation({
    mutationFn: () => updateMe({ currentPassword: currentPw, newPassword: newPw }),
    onSuccess: () => {
      Alert.alert(
        'Password Changed',
        'Your password has been updated. You will be logged out from all other devices.',
        [{ text: 'OK', onPress: () => { clearUser(); qc.clear(); } }],
      );
    },
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.error ?? 'Could not change password.'),
  });

  function handleChangePassword() {
    if (currentPw.length < 1) { Alert.alert('Required', 'Enter your current password.'); return; }
    if (newPw.length < 8)     { Alert.alert('Too short', 'New password must be at least 8 characters.'); return; }
    if (currentPw === newPw)  { Alert.alert('Same password', 'New password must differ from current.'); return; }
    pwMutation.mutate();
  }

  const initial = user?.name?.charAt(0).toUpperCase() ?? 'P';
  const CHANNELS: Channel[]  = ['email', 'push', 'in_app'];
  const ALL_CATEGORIES: Category[] = ['job_updates', 'messages', 'payments', 'reviews', 'marketing', 'system'];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Account card ───────────────────────────────── */}
        <View style={[styles.accountCard, { backgroundColor: theme.backgroundElement }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.accountAvatar} />
          ) : (
            <View style={[styles.accountAvatar, { backgroundColor: Primary[500] }, styles.accountAvatarFallback]}>
              <Text style={styles.accountInitial}>{initial}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.accountName, { color: theme.text }]}>{user?.name}</Text>
            <Text style={[styles.accountEmail, { color: theme.textSecondary }]}>{user?.email}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: Primary[50] }]}>
            <Icon name="briefcase-outline" size={12} color={Primary[700]} />
            <Text style={[styles.roleText, { color: Primary[700] }]}>Provider</Text>
          </View>
        </View>

        {/* ── Notification preferences ───────────────────── */}
        <SectionLabel text="NOTIFICATIONS" />
        <View style={[styles.prefsCard, { backgroundColor: theme.backgroundElement }]}>
          {prefsLoading ? (
            <View style={{ padding: Spacing.three, alignItems: 'center' }}>
              <ActivityIndicator color={Primary[500]} />
            </View>
          ) : (
            <>
              {/* Channel header row */}
              <View style={[styles.prefsHeaderRow, { borderBottomColor: theme.background }]}>
                <View style={{ flex: 1 }} />
                {CHANNELS.map((ch) => {
                  const meta = CHANNEL_META[ch];
                  return (
                    <View key={ch} style={styles.prefsChannelHeader}>
                      <View style={[styles.prefsChannelIcon, { backgroundColor: meta.color + '18' }]}>
                        <Icon name={meta.icon as any} size={14} color={meta.color} />
                      </View>
                      <Text style={[styles.prefsChannelLabel, { color: theme.textSecondary }]}>{meta.label}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Category rows */}
              {ALL_CATEGORIES.map((cat, i) => {
                const catMeta = CATEGORY_META[cat];
                const isLast  = i === ALL_CATEGORIES.length - 1;
                return (
                  <View
                    key={cat}
                    style={[
                      styles.prefsCatRow,
                      !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.background },
                    ]}
                  >
                    <View style={styles.prefsCatLabel}>
                      <Icon name={catMeta.icon as any} size={14} color={theme.textSecondary} />
                      <Text style={[styles.prefsCatText, { color: theme.text }]}>{catMeta.label}</Text>
                    </View>
                    {CHANNELS.map((ch) => {
                      const supported = CHANNEL_CATEGORIES[ch].includes(cat);
                      const value     = supported ? getPrefValue(ch, cat) : false;
                      return (
                        <View key={ch} style={styles.prefsCell}>
                          {supported ? (
                            <Switch
                              value={value}
                              onValueChange={(v) => togglePref(ch, cat, v)}
                              trackColor={{ false: '#d1d5db', true: CHANNEL_META[ch].color + '80' }}
                              thumbColor={value ? CHANNEL_META[ch].color : '#f9fafb'}
                              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                            />
                          ) : (
                            <View style={styles.prefsNA}>
                              <Text style={[styles.prefsNAText, { color: theme.textSecondary }]}>—</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </>
          )}
        </View>

        {/* ── Security / Password change ─────────────────── */}
        <SectionLabel text="SECURITY" />
        <View style={[styles.pwCard, { backgroundColor: theme.backgroundElement }]}>
          <Pressable
            style={styles.pwCardHeader}
            onPress={() => { setPwExpanded((v) => !v); setCurrentPw(''); setNewPw(''); }}
          >
            <View style={[styles.rowIcon, { backgroundColor: '#f59e0b' }]}>
              <Icon name="key-outline" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>Change Password</Text>
              <Text style={[styles.rowSub, { color: theme.textSecondary }]}>Update your account password</Text>
            </View>
            <Icon name={pwExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
          </Pressable>

          {pwExpanded && (
            <View style={[styles.pwForm, { borderTopColor: theme.background }]}>
              {/* Current password */}
              <View style={styles.pwFieldWrap}>
                <Text style={[styles.pwFieldLabel, { color: theme.textSecondary }]}>Current Password</Text>
                <View style={[styles.pwInputRow, { backgroundColor: theme.background }]}>
                  <TextInput
                    style={[styles.pwInput, { color: theme.text }]}
                    value={currentPw}
                    onChangeText={setCurrentPw}
                    secureTextEntry={!showCurrentPw}
                    placeholder="Enter current password"
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="none"
                  />
                  <Pressable onPress={() => setShowCurrentPw((v) => !v)} hitSlop={8}>
                    <Icon name={showCurrentPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textSecondary} />
                  </Pressable>
                </View>
              </View>

              {/* New password */}
              <View style={styles.pwFieldWrap}>
                <Text style={[styles.pwFieldLabel, { color: theme.textSecondary }]}>New Password</Text>
                <View style={[styles.pwInputRow, { backgroundColor: theme.background }]}>
                  <TextInput
                    style={[styles.pwInput, { color: theme.text }]}
                    value={newPw}
                    onChangeText={setNewPw}
                    secureTextEntry={!showNewPw}
                    placeholder="Min. 8 characters"
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="none"
                  />
                  <Pressable onPress={() => setShowNewPw((v) => !v)} hitSlop={8}>
                    <Icon name={showNewPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textSecondary} />
                  </Pressable>
                </View>
                {newPw.length > 0 && newPw.length < 8 && (
                  <Text style={[styles.pwHint, { color: Status.error }]}>Must be at least 8 characters</Text>
                )}
              </View>

              <Pressable
                style={[styles.pwSaveBtn, { backgroundColor: Primary[500], opacity: pwMutation.isPending ? 0.7 : 1 }]}
                onPress={handleChangePassword}
                disabled={pwMutation.isPending}
              >
                {pwMutation.isPending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Icon name="checkmark-circle-outline" size={17} color="#fff" />
                }
                <Text style={styles.pwSaveBtnText}>
                  {pwMutation.isPending ? 'Saving…' : 'Update Password'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ── Help ───────────────────────────────────────── */}
        <SectionLabel text="HELP" />
        <View style={styles.group}>
          <NavRow icon="headset-outline"       iconBg="#10b981" label="Contact Support" subtitle="Get help from our team"  onPress={() => router.push('/(app)/support')} />
          <NavRow icon="document-text-outline" iconBg="#6366f1" label="Terms & Privacy"  subtitle="Read our policies"      onPress={() => Alert.alert('Coming soon', 'Terms & Privacy policy will open in browser.')} />
        </View>

        {/* ── Danger zone ────────────────────────────────── */}
        <SectionLabel text="DANGER ZONE" danger />
        <View style={styles.group}>
          <NavRow
            icon="trash-outline"
            iconBg={Status.error}
            label="Delete Account"
            subtitle="Permanently remove all your data"
            danger
            onPress={() =>
              Alert.alert(
                'Delete Account',
                'This will permanently delete your account and all data. This action cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Contact Support', 'Please contact our support team to delete your account.') },
                ],
              )
            }
          />
        </View>

        <Text style={[styles.versionText, { color: theme.textSecondary }]}>LocalPro Provider · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Styles ───────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe:               { flex: 1 },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:            { width: 32, alignItems: 'flex-start' },
  headerTitle:        { fontSize: 17, fontWeight: '700' },
  scroll:             { padding: Spacing.four, gap: Spacing.two, paddingBottom: BottomTabInset + 24 },

  /* Account card */
  accountCard:        { borderRadius: 18, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two },
  accountAvatar:          { width: 48, height: 48, borderRadius: 24 },
  accountAvatarFallback:  { alignItems: 'center', justifyContent: 'center' },
  accountInitial:         { color: '#fff', fontSize: 20, fontWeight: '800' },
  accountName:        { fontSize: 15, fontWeight: '700' },
  accountEmail:       { fontSize: 13, marginTop: 1 },
  roleBadge:          { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  roleText:           { fontSize: 11, fontWeight: '700' },

  /* Section label */
  sectionLabel:       { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 4, marginTop: Spacing.two },

  /* Grouped rows */
  group:              { borderRadius: 16, overflow: 'hidden', gap: StyleSheet.hairlineWidth },

  /* Individual row */
  row:                { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 4, gap: Spacing.two },
  rowIcon:            { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel:           { fontSize: 14, fontWeight: '500' },
  rowSub:             { fontSize: 12 },

  /* Preferences grid */
  prefsCard:          { borderRadius: 16, overflow: 'hidden' },
  prefsHeaderRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  prefsChannelHeader: { width: 64, alignItems: 'center', gap: 4 },
  prefsChannelIcon:   { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  prefsChannelLabel:  { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  prefsCatRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: 10 },
  prefsCatLabel:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  prefsCatText:       { fontSize: 13, fontWeight: '500' },
  prefsCell:          { width: 64, alignItems: 'center', justifyContent: 'center' },
  prefsNA:            { width: 28, alignItems: 'center' },
  prefsNAText:        { fontSize: 16 },

  /* Password card */
  pwCard:             { borderRadius: 16, overflow: 'hidden' },
  pwCardHeader:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 4, gap: Spacing.two },
  pwForm:             { padding: Spacing.three, gap: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
  pwFieldWrap:        { gap: 6 },
  pwFieldLabel:       { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  pwInputRow:         { flexDirection: 'row', alignItems: 'center', borderRadius: 11, paddingHorizontal: 14, paddingVertical: 11, gap: 8 },
  pwInput:            { flex: 1, fontSize: 15 },
  pwHint:             { fontSize: 11, marginTop: -2 },
  pwSaveBtn:          { borderRadius: 11, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  pwSaveBtnText:      { color: '#fff', fontSize: 14, fontWeight: '700' },

  /* Footer */
  versionText:        { fontSize: 12, textAlign: 'center', marginTop: Spacing.three },
});
