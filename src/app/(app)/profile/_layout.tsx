import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';

export default function ProfileLayout() {
  const theme = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="skills" />
      <Stack.Screen name="service-areas" />
      <Stack.Screen name="certifications" />
      <Stack.Screen name="portfolio" />
      <Stack.Screen name="addresses" />
      <Stack.Screen name="kyc" />
      <Stack.Screen name="boost" />
      <Stack.Screen name="training/index" />
      <Stack.Screen name="training/[id]" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
