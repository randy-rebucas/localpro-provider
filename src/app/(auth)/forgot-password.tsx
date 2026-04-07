import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
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

import { forgotPassword } from '@/api/auth';
import { Primary, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
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
      await forgotPassword(data.email);
    } catch (err: any) {
      setError('root', { message: err?.response?.data?.error ?? 'Failed. Please try again.' });
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.container}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={[styles.backText, { color: Primary[500] }]}>← Back</Text>
        </Pressable>

        {isSubmitSuccessful ? (
          <View style={styles.success}>
            <Text style={[styles.title, { color: theme.text }]}>Email sent</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Check your inbox for a password reset link. It expires in 1 hour.
            </Text>
            <Pressable
              style={[styles.button, { backgroundColor: Primary[500] }]}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={styles.buttonText}>Back to Login</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={[styles.title, { color: theme.text }]}>Forgot password</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Enter your email and we'll send a reset link.
            </Text>

            <View style={styles.form}>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
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
              {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
              {errors.root && <Text style={styles.errorText}>{errors.root.message}</Text>}

              <Pressable
                style={[styles.button, { backgroundColor: Primary[500] }, isSubmitting && { opacity: 0.6 }]}
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting}
              >
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Reset Link</Text>}
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
  container: { flex: 1, padding: Spacing.four },
  backBtn: { marginBottom: Spacing.four },
  backText: { fontSize: 15, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: Spacing.one },
  subtitle: { fontSize: 15, marginBottom: Spacing.four },
  form: { gap: Spacing.three },
  input: {
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    fontSize: 16,
  },
  errorText: { fontSize: 13, color: '#dc2626' },
  button: { borderRadius: 12, paddingVertical: Spacing.three - 2, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  success: { flex: 1, justifyContent: 'center', gap: Spacing.three },
});
