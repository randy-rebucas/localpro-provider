/**
 * Settings screen
 * Uses documented endpoints:
 *   GET /api/user/settings  — load notification preferences
 *   PUT /api/user/settings  — save notification preferences
 *
 * Password change: directs users to the forgot-password flow (no change-password
 * endpoint is documented in the API reference).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api/client';
import { Icon } from '@/components/icon';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/auth-store';

interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  profileVisibility: 'public' | 'private';
}

interface SettingsResponse {
  preferences: UserPreferences;
}

async function getUserSettings(): Promise<UserPreferences> {
  const { data } = await api.get<SettingsResponse>('/api/user/settings');
  return data.preferences ?? { emailNotifications: true, pushNotifications: true, profileVisibility: 'public' };
}

async function putUserSettings(preferences: Partial<UserPreferences>): Promise<void> {
  await api.put('/api/user/settings', preferences);
}

/* ─── Sub-components ────────────────────────────────────────────────── */

function SectionLabel({ text, danger }: { text: string; danger?: boolean }) {
  const theme = useTheme();
  return (
    <Text style={[styles.sectionLabel, { color: danger ? Status.error : theme.textSecondary }]}>
      {text}
    </Text>
  );
}

function SettingToggleRow({
  icon, iconBg, label, subtitle, value, onToggle,
}: {
  icon: string; iconBg: string; label: string; subtitle?: string;
  value: boolean; onToggle: (v: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Icon name={icon as any} size={18} color="#fff" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
        {subtitle && <Text style={[styles.rowSub, { color: theme.textSecondary }]}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#d1d5db', true: Primary[400] }}
        thumbColor={value ? Primary[600] : '#f9fafb'}
      />
    </View>
  );
}

function NavRow({
  icon, iconBg, label, subtitle, onPress, danger,
}: {
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

/* ─── Screen ─────────────────────────────────────────────────────────── */

export default function SettingsScreen() {
  const theme  = useTheme();
  const router = useRouter();
  const qc     = useQueryClient();
  const user   = useAuthStore((s) => s.user);

  const { data: prefs, isLoading } = useQuery({
    queryKey: ['user-settings'],
    queryFn:  getUserSettings,
  });

  const [emailNotif, setEmailNotif] = useState<boolean | null>(null);
  const [pushNotif,  setPushNotif]  = useState<boolean | null>(null);

  const emailOn = emailNotif ?? prefs?.emailNotifications ?? true;
  const pushOn  = pushNotif  ?? prefs?.pushNotifications  ?? true;

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<UserPreferences>) => putUserSettings(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-settings'] }),
    onError: () => Alert.alert('Error', 'Could not save preferences.'),
  });

  function toggleEmail(v: boolean) { setEmailNotif(v); saveMutation.mutate({ emailNotifications: v }); }
  function togglePush(v: boolean)  { setPushNotif(v);  saveMutation.mutate({ pushNotifications: v }); }

  const initial = user?.name?.charAt(0).toUpperCase() ?? 'P';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* ── Header ───────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Account card ─────────────────────────────────── */}
        <View style={[styles.accountCard, { backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.accountAvatar, { backgroundColor: Primary[500] }]}>
            <Text style={styles.accountInitial}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.accountName, { color: theme.text }]}>{user?.name}</Text>
            <Text style={[styles.accountEmail, { color: theme.textSecondary }]}>{user?.email}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: Primary[50] }]}>
            <Icon name="briefcase-outline" size={12} color={Primary[700]} />
            <Text style={[styles.roleText, { color: Primary[700] }]}>Provider</Text>
          </View>
        </View>

        {/* ── Notifications ────────────────────────────────── */}
        <SectionLabel text="NOTIFICATIONS" />
        <View style={styles.group}>
          {isLoading ? (
            <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.rowSub, { color: theme.textSecondary }]}>Loading…</Text>
            </View>
          ) : (
            <>
              <SettingToggleRow
                icon="mail-outline"
                iconBg="#3b82f6"
                label="Email Notifications"
                subtitle="Digest, payment updates, new jobs"
                value={emailOn}
                onToggle={toggleEmail}
              />
              <SettingToggleRow
                icon="notifications-outline"
                iconBg="#8b5cf6"
                label="Push Notifications"
                subtitle="Real-time alerts on your device"
                value={pushOn}
                onToggle={togglePush}
              />
            </>
          )}
        </View>

        {/* ── Security ─────────────────────────────────────── */}
        <SectionLabel text="SECURITY" />
        <View style={styles.group}>
          <NavRow
            icon="key-outline"
            iconBg="#f59e0b"
            label="Change Password"
            subtitle={`Reset link sent to ${user?.email}`}
            onPress={() =>
              Alert.alert(
                'Change Password',
                'We will send a password reset link to your registered email address.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Send Link', onPress: () => router.push('/(auth)/forgot-password') },
                ],
              )
            }
          />
        </View>

        {/* ── Support ──────────────────────────────────────── */}
        <SectionLabel text="HELP" />
        <View style={styles.group}>
          <NavRow
            icon="headset-outline"
            iconBg="#10b981"
            label="Contact Support"
            subtitle="Get help from our team"
            onPress={() => router.push('/(app)/support')}
          />
          <NavRow
            icon="document-text-outline"
            iconBg="#6366f1"
            label="Terms & Privacy"
            subtitle="Read our policies"
            onPress={() => Alert.alert('Coming soon', 'Terms & Privacy policy will open in browser.')}
          />
        </View>

        {/* ── Danger zone ──────────────────────────────────── */}
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
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => Alert.alert('Contact Support', 'Please contact our support team to delete your account.'),
                  },
                ],
              )
            }
          />
        </View>

        {/* App version */}
        <Text style={[styles.versionText, { color: theme.textSecondary }]}>LocalPro Provider · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe:            { flex: 1 },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:         { width: 32, alignItems: 'flex-start' },
  headerTitle:     { fontSize: 17, fontWeight: '700' },
  scroll:          { padding: Spacing.four, gap: Spacing.two, paddingBottom: BottomTabInset },

  /* Account card */
  accountCard:     { borderRadius: 18, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two },
  accountAvatar:   { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  accountInitial:  { color: '#fff', fontSize: 20, fontWeight: '800' },
  accountName:     { fontSize: 15, fontWeight: '700' },
  accountEmail:    { fontSize: 13, marginTop: 1 },
  roleBadge:       { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  roleText:        { fontSize: 11, fontWeight: '700' },

  /* Section label */
  sectionLabel:    { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 4, marginTop: Spacing.two },

  /* Grouped rows */
  group:           { borderRadius: 16, overflow: 'hidden', gap: StyleSheet.hairlineWidth },

  /* Individual row */
  row:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 4, gap: Spacing.two },
  rowIcon:         { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel:        { fontSize: 14, fontWeight: '500' },
  rowSub:          { fontSize: 12 },

  /* Footer */
  versionText:     { fontSize: 12, textAlign: 'center', marginTop: Spacing.three },
});
