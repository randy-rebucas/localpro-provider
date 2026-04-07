import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';

export default function QuotesLayout() {
  const theme = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
