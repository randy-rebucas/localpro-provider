import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';

export default function JobsLayout() {
  const theme = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/chat" />
      <Stack.Screen name="[id]/upload-completion" options={{ presentation: 'modal' }} />
      <Stack.Screen name="[id]/withdraw" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
