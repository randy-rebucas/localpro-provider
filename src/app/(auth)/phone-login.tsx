import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { sendPhoneOtp, verifyPhoneOtp } from '@/api/auth';
import { AppLogo } from '@/components/app-logo';
import { Primary, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/auth-store';

const phoneSchema = z.object({
  phone: z.string().regex(/^\+?63\d{10}$/, 'Enter a valid PH phone number (+639XXXXXXXXX)'),
});
const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export default function PhoneLoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [phone, setPhoneValue] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({ resolver: zodResolver(phoneSchema) });
  const otpForm = useForm<z.infer<typeof otpSchema>>({ resolver: zodResolver(otpSchema) });

  async function onSendOtp(data: z.infer<typeof phoneSchema>) {
    try {
      await sendPhoneOtp(data.phone);
      setPhoneValue(data.phone);
      setStep('otp');
    } catch (err: any) {
      phoneForm.setError('root', { message: err?.response?.data?.error ?? 'Failed to send OTP' });
    }
  }

  async function onVerifyOtp(data: z.infer<typeof otpSchema>) {
    try {
      const user = await verifyPhoneOtp(phone, data.otp);
      setUser(user);
    } catch (err: any) {
      otpForm.setError('root', { message: err?.response?.data?.error ?? 'Invalid or expired OTP' });
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.container}>
          <Pressable style={styles.backBtn} onPress={() => (step === 'otp' ? setStep('phone') : router.back())}>
            <Text style={[styles.backText, { color: Primary[500] }]}>← Back</Text>
          </Pressable>

          <AppLogo size={72} />
          <Text style={[styles.title, { color: theme.text }]}>
            {step === 'phone' ? 'Phone Sign In' : 'Enter OTP'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {step === 'phone'
              ? 'Enter your Philippine phone number'
              : `We sent a 6-digit code to ${phone}`}
          </Text>

          {step === 'phone' ? (
            <View style={styles.form}>
              <Controller
                control={phoneForm.control}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                    placeholder="+639XXXXXXXXX"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="phone-pad"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {phoneForm.formState.errors.phone && (
                <Text style={styles.errorText}>{phoneForm.formState.errors.phone.message}</Text>
              )}
              {phoneForm.formState.errors.root && (
                <Text style={styles.errorText}>{phoneForm.formState.errors.root.message}</Text>
              )}
              <Pressable
                style={[styles.button, { backgroundColor: Primary[500] }]}
                onPress={phoneForm.handleSubmit(onSendOtp)}
                disabled={phoneForm.formState.isSubmitting}
              >
                {phoneForm.formState.isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send OTP</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <Controller
                control={otpForm.control}
                name="otp"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, letterSpacing: 8 }]}
                    placeholder="000000"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="number-pad"
                    maxLength={6}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {otpForm.formState.errors.otp && (
                <Text style={styles.errorText}>{otpForm.formState.errors.otp.message}</Text>
              )}
              {otpForm.formState.errors.root && (
                <Text style={styles.errorText}>{otpForm.formState.errors.root.message}</Text>
              )}
              <Pressable
                style={[styles.button, { backgroundColor: Primary[500] }]}
                onPress={otpForm.handleSubmit(onVerifyOtp)}
                disabled={otpForm.formState.isSubmitting}
              >
                {otpForm.formState.isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify & Sign In</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  container: { flex: 1, padding: Spacing.four, alignItems: 'center' },
  backBtn: { marginBottom: Spacing.four, alignSelf: 'flex-start' },
  backText: { fontSize: 15, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: Spacing.one, textAlign: 'center' },
  subtitle: { fontSize: 15, marginBottom: Spacing.four, textAlign: 'center' },
  form: { gap: Spacing.three, width: '100%' },
  input: {
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    fontSize: 20,
    textAlign: 'center',
  },
  errorText: { fontSize: 13, color: '#dc2626' },
  button: {
    borderRadius: 12,
    paddingVertical: Spacing.three - 2,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
