import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { resetPassword } from '@/api/auth';
import { AppLogo } from '@/components/app-logo';
import { Primary, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type FormData = z.infer<typeof schema>;

export default function ResetPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ token: string | string[] }>();
  // Expo Router may pass query params as string[] when deep-linked; normalise to string
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    if (!token) {
      setError('root', { message: 'Invalid or missing reset token.' });
      return;
    }
    try {
      await resetPassword(token, data.password);
    } catch (err: any) {
      setError('root', { message: err?.response?.data?.error ?? 'Failed to reset password.' });
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.container}>
        {isSubmitSuccessful ? (
          <View style={styles.success}>
            <Text style={[styles.title, { color: theme.text }]}>Password reset!</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Your password has been updated. Sign in with your new password.
            </Text>
            <Pressable
              style={[styles.button, { backgroundColor: Primary[500] }]}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={styles.buttonText}>Go to Login</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <AppLogo size={72} />
            <Text style={[styles.title, { color: theme.text }]}>Reset password</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Enter your new password below.
            </Text>
            <View style={styles.form}>
              {(['password', 'confirmPassword'] as const).map((name) => (
                <View key={name} style={styles.field}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>
                    {name === 'confirmPassword' ? 'Confirm Password' : 'New Password'}
                  </Text>
                  <Controller
                    control={control}
                    name={name}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                        placeholder="••••••••"
                        placeholderTextColor={theme.textSecondary}
                        secureTextEntry
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                      />
                    )}
                  />
                  {errors[name] && <Text style={styles.errorText}>{errors[name]?.message}</Text>}
                </View>
              ))}
              {errors.root && <Text style={styles.errorText}>{errors.root.message}</Text>}
              <Pressable
                style={[styles.button, { backgroundColor: Primary[500] }, isSubmitting && { opacity: 0.6 }]}
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting}
              >
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset Password</Text>}
              </Pressable>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: Spacing.four, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: Spacing.one, textAlign: 'center' },
  subtitle: { fontSize: 15, marginBottom: Spacing.four, textAlign: 'center' },
  form: { gap: Spacing.three, width: '100%' },
  field: { gap: Spacing.one },
  label: { fontSize: 14, fontWeight: '500' },
  input: { borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 4, fontSize: 16 },
  errorText: { fontSize: 13, color: '#dc2626' },
  button: { borderRadius: 12, paddingVertical: Spacing.three - 2, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  success: { gap: Spacing.three },
});
