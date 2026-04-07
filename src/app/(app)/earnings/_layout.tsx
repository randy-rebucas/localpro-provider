import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';

export default function EarningsLayout() {
  const theme = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="transactions" />
      <Stack.Screen name="withdraw" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
