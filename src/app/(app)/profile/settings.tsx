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
import { Primary, Spacing, Status } from '@/constants/theme';
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

function SettingRow({
  label,
  subtitle,
  value,
  onToggle,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
        {subtitle && <Text style={[styles.rowSub, { color: theme.textSecondary }]}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#ccc', true: Primary[400] }}
        thumbColor={value ? Primary[600] : '#f0f0f0'}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const theme  = useTheme();
  const router = useRouter();
  const qc     = useQueryClient();
  const user   = useAuthStore((s) => s.user);

  const { data: prefs, isLoading } = useQuery({
    queryKey: ['user-settings'],
    queryFn:  getUserSettings,
  });

  const [emailNotif, setEmailNotif]   = useState<boolean | null>(null);
  const [pushNotif,  setPushNotif]    = useState<boolean | null>(null);

  // Use fetched values as the source of truth; local state overrides on toggle
  const emailOn = emailNotif ?? prefs?.emailNotifications ?? true;
  const pushOn  = pushNotif  ?? prefs?.pushNotifications  ?? true;

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<UserPreferences>) => putUserSettings(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-settings'] }),
    onError: () => Alert.alert('Error', 'Could not save preferences.'),
  });

  function toggleEmail(v: boolean) {
    setEmailNotif(v);
    saveMutation.mutate({ emailNotifications: v });
  }

  function togglePush(v: boolean) {
    setPushNotif(v);
    saveMutation.mutate({ pushNotifications: v });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Account info */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>ACCOUNT</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>{user?.name}</Text>
              <Text style={[styles.rowSub, { color: theme.textSecondary }]}>{user?.email}</Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: Primary[50] }]}>
              <Text style={[styles.roleText, { color: Primary[700] }]}>Provider</Text>
            </View>
          </View>
        </View>

        {/* Notification preferences (GET/PUT /api/user/settings) */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>NOTIFICATIONS</Text>
          {isLoading ? (
            <Text style={[styles.rowSub, { color: theme.textSecondary, padding: Spacing.three }]}>
              Loading preferences…
            </Text>
          ) : (
            <>
              <SettingRow
                label="Email Notifications"
                subtitle="Digest, payment updates, new jobs"
                value={emailOn}
                onToggle={toggleEmail}
              />
              <SettingRow
                label="Push Notifications"
                subtitle="Real-time alerts on your device"
                value={pushOn}
                onToggle={togglePush}
              />
            </>
          )}
        </View>

        {/* Password reset — directs to forgot-password since no change-pw endpoint is documented */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>SECURITY</Text>
          <Pressable
            style={styles.row}
            onPress={() =>
              Alert.alert(
                'Change Password',
                'We will send a password reset link to your registered email address.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Send Link',
                    onPress: () => router.push('/(auth)/forgot-password'),
                  },
                ],
              )
            }
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>Change Password</Text>
              <Text style={[styles.rowSub, { color: theme.textSecondary }]}>
                A reset link will be sent to {user?.email}
              </Text>
            </View>
            <Icon name="chevron-forward" size={18} color={theme.textSecondary} />
          </Pressable>
        </View>

        {/* Support link */}
        <Pressable
          style={[styles.supportRow, { backgroundColor: theme.backgroundElement }]}
          onPress={() => router.push('/(app)/support')}
        >
          <Icon name="headset-outline" size={20} color={Primary[500]} />
          <Text style={[styles.supportText, { color: theme.text }]}>Contact Support</Text>
          <Icon name="chevron-forward" size={18} color={theme.textSecondary} />
        </Pressable>

        {/* Danger zone */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: Status.error }]}>DANGER ZONE</Text>
          <Pressable
            style={[styles.row, { gap: Spacing.two }]}
            onPress={() =>
              Alert.alert(
                'Delete Account',
                'This will permanently delete your account and all data. This action cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () =>
                      Alert.alert('Contact Support', 'Please contact our support team to delete your account.'),
                  },
                ],
              )
            }
          >
            <Icon name="warning-outline" size={20} color={Status.error} />
            <Text style={[styles.rowLabel, { color: Status.error, flex: 1 }]}>Delete Account</Text>
            <Icon name="chevron-forward" size={18} color={Status.error} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:     { width: 32, alignItems: 'flex-start' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  scroll:      { padding: Spacing.four, gap: Spacing.three, paddingBottom: 40 },
  card:        { borderRadius: 16, overflow: 'hidden' },
  cardTitle:   { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.one },
  row:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 2, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.06)' },
  rowLabel:    { fontSize: 14, fontWeight: '500' },
  rowSub:      { fontSize: 12 },
  roleBadge:   { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  roleText:    { fontSize: 12, fontWeight: '700' },
  supportRow:  { borderRadius: 14, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  supportText: { flex: 1, fontSize: 15, fontWeight: '500' },
});
