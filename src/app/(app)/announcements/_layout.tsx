import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
export default function Layout() {
  const theme = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }} />;
}
