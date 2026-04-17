import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api/client';
import { AppLogo } from '@/components/app-logo';
import { Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function VerifyEmailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ token: string | string[] }>();
  // Expo Router may pass query params as string[] when deep-linked; normalise to string
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }
    api.post('/api/auth/verify-email', { token })
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setMessage(err?.response?.data?.error ?? 'Verification failed. The link may have expired.');
      });
  }, [token]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.container}>
        <AppLogo size={72} />
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={Primary[500]} />
            <Text style={[styles.text, { color: theme.textSecondary }]}>Verifying your email…</Text>
          </>
        )}
        {status === 'success' && (
          <>
            <View style={[styles.iconWrap, { backgroundColor: Status.successBg }]}>
              <Text style={styles.icon}>✓</Text>
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Email verified!</Text>
            <Text style={[styles.text, { color: theme.textSecondary }]}>
              Your email has been verified. You can now sign in.
            </Text>
            <Pressable
              style={[styles.button, { backgroundColor: Primary[500] }]}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={styles.buttonText}>Go to Login</Text>
            </Pressable>
          </>
        )}
        {status === 'error' && (
          <>
            <View style={[styles.iconWrap, { backgroundColor: Status.errorBg }]}>
              <Text style={styles.icon}>✕</Text>
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Verification failed</Text>
            <Text style={[styles.text, { color: theme.textSecondary }]}>{message}</Text>
            <Pressable
              style={[styles.button, { backgroundColor: Primary[500] }]}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={styles.buttonText}>Back to Login</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  iconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 32, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  text: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  button: { borderRadius: 12, paddingHorizontal: Spacing.five, paddingVertical: Spacing.two + 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
