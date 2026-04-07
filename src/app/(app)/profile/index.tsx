import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';

export default function Screen() {
  const theme = useTheme();
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: theme.background }]}>
      <View style={styles.center}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '600' }}>Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
