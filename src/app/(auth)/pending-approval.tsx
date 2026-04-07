import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { logout } from '@/api/auth';
import { Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/auth-store';

export default function PendingApprovalScreen() {
  const theme = useTheme();
  const router = useRouter();
  const clearUser = useAuthStore((s) => s.clearUser);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clearUser();
      router.replace('/(auth)/login');
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.container}>
        <View style={[styles.iconWrap, { backgroundColor: Status.warningBg }]}>
          <Text style={styles.icon}>⏳</Text>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>Account Pending Approval</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Your provider account is under review. Our team will verify your details within 1–2 business days.
          You'll receive an email once approved.
        </Text>

        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>While you wait:</Text>
          {[
            'Complete your provider profile',
            'Upload certifications (PESO, TES, etc.)',
            'Add your portfolio photos',
            'Set your service areas',
          ].map((item) => (
            <View key={item} style={styles.bulletRow}>
              <View style={[styles.dot, { backgroundColor: Primary[500] }]} />
              <Text style={[styles.bulletText, { color: theme.textSecondary }]}>{item}</Text>
            </View>
          ))}
        </View>

        <Pressable
          style={[styles.button, { backgroundColor: Primary[500] }]}
          onPress={() => router.push('/(app)/profile')}
        >
          <Text style={styles.buttonText}>Complete My Profile</Text>
        </Pressable>

        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={[styles.logoutText, { color: theme.textSecondary }]}>Sign Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    padding: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  icon: { fontSize: 40 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  card: {
    borderRadius: 16,
    padding: Spacing.three,
    width: '100%',
    gap: Spacing.two,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: Spacing.one },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 6, height: 6, borderRadius: 3 },
  bulletText: { fontSize: 14 },
  button: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: Spacing.three - 2,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  logoutBtn: { paddingVertical: Spacing.two },
  logoutText: { fontSize: 14 },
});
