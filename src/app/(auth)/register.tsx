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

import { register } from '@/api/auth';
import { AppLogo } from '@/components/app-logo';
import { Colors, Primary, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const schema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const theme = useTheme();
  const router = useRouter();

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      await register({ name: data.name, email: data.email, password: data.password, role: 'provider' });
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Registration failed. Please try again.';
      setError('root', { message: msg });
    }
  }

  if (isSubmitSuccessful) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.success}>
          <View style={[styles.successIcon, { backgroundColor: '#dcfce7' }]}>
            <Text style={{ fontSize: 32 }}>✓</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Check your email</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            We sent a verification link to your email. Please verify before signing in.
          </Text>
          <Pressable
            style={[styles.button, { backgroundColor: Primary[500] }]}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.buttonText}>Go to Login</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={[styles.backText, { color: Primary[500] }]}>← Back</Text>
          </Pressable>

          <View style={styles.header}>
            <AppLogo size={72} />
            <Text style={[styles.title, { color: theme.text }]}>Create account</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Join LocalPro as a service provider
            </Text>
          </View>

          <View style={styles.form}>
            {(['name', 'email', 'password', 'confirmPassword'] as const).map((name) => (
              <View key={name} style={styles.field}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  {name === 'confirmPassword' ? 'Confirm Password' : name.charAt(0).toUpperCase() + name.slice(1)}
                </Text>
                <Controller
                  control={control}
                  name={name}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.backgroundElement,
                          color: theme.text,
                          borderColor: errors[name] ? '#dc2626' : 'transparent',
                        },
                      ]}
                      placeholder={
                        name === 'name' ? 'Juan dela Cruz' :
                        name === 'email' ? 'you@example.com' : '••••••••'
                      }
                      placeholderTextColor={theme.textSecondary}
                      secureTextEntry={name === 'password' || name === 'confirmPassword'}
                      autoCapitalize={name === 'name' ? 'words' : 'none'}
                      keyboardType={name === 'email' ? 'email-address' : 'default'}
                      autoComplete={
                        name === 'email' ? 'email' :
                        name === 'password' ? 'new-password' : 'off'
                      }
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
                {errors[name] && (
                  <Text style={styles.errorText}>{errors[name]?.message}</Text>
                )}
              </View>
            ))}

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
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <Pressable onPress={() => router.push('/(auth)/login')}>
              <Text style={[styles.linkText, { color: Primary[500] }]}>Sign In</Text>
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
  scroll: { flexGrow: 1, padding: Spacing.four },
  backBtn: { marginBottom: Spacing.three },
  backText: { fontSize: 15, fontWeight: '600' },
  header: { marginBottom: Spacing.four, gap: Spacing.one, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
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
  rootError: { padding: Spacing.two, backgroundColor: '#fee2e2', borderRadius: 8 },
  button: {
    borderRadius: 12,
    paddingVertical: Spacing.three - 2,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.four },
  footerText: { fontSize: 14 },
  linkText: { fontSize: 14, fontWeight: '600' },
  success: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
});
