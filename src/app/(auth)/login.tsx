import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
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
import { z } from 'zod';

import { login } from '@/api/auth';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Primary, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      const user = await login(data.email, data.password);
      setUser(user);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Invalid email or password';
      setError('root', { message: msg });
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={[styles.logoMark, { backgroundColor: Primary[500] }]} />
            <Text style={[styles.title, { color: theme.text }]}>Welcome back</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Sign in to your LocalPro provider account
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundElement,
                        color: theme.text,
                        borderColor: errors.email ? '#dc2626' : 'transparent',
                      },
                    ]}
                    placeholder="you@example.com"
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email.message}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Password</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundElement,
                        color: theme.text,
                        borderColor: errors.password ? '#dc2626' : 'transparent',
                      },
                    ]}
                    placeholder="••••••••"
                    placeholderTextColor={theme.textSecondary}
                    secureTextEntry
                    autoComplete="current-password"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.password && (
                <Text style={styles.errorText}>{errors.password.message}</Text>
              )}
            </View>

            <Pressable
              style={styles.forgotLink}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text style={[styles.linkText, { color: Primary[500] }]}>Forgot password?</Text>
            </Pressable>

            {errors.root && (
              <View style={styles.rootError}>
                <Text style={styles.errorText}>{errors.root.message}</Text>
              </View>
            )}

            <Pressable
              style={[styles.button, { backgroundColor: Primary[500] }, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </Pressable>

            <Pressable
              style={[styles.button, styles.buttonOutline, { borderColor: theme.backgroundSelected }]}
              onPress={() => router.push('/(auth)/phone-login')}
            >
              <Text style={[styles.buttonText, { color: theme.text }]}>Sign in with Phone</Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              Don't have an account?{' '}
            </Text>
            <Pressable onPress={() => router.push('/(auth)/register')}>
              <Text style={[styles.linkText, { color: Primary[500] }]}>Register</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: Spacing.four, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: Spacing.five, gap: Spacing.two },
  logoMark: { width: 56, height: 56, borderRadius: 16, marginBottom: Spacing.two },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 15, textAlign: 'center' },
  form: { gap: Spacing.three },
  field: { gap: Spacing.one },
  label: { fontSize: 14, fontWeight: '500' },
  input: {
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    fontSize: 16,
    borderWidth: 1.5,
  },
  errorText: { fontSize: 13, color: '#dc2626' },
  rootError: {
    padding: Spacing.two,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  forgotLink: { alignSelf: 'flex-end' },
  linkText: { fontSize: 14, fontWeight: '600' },
  button: {
    borderRadius: 12,
    paddingVertical: Spacing.three - 2,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  buttonOutline: { borderWidth: 1.5, backgroundColor: 'transparent' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.four },
  footerText: { fontSize: 14 },
});
