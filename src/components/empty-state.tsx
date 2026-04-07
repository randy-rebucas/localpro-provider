import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Primary, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface EmptyStateProps {
  emoji?: string;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ emoji = '📭', title, description, ctaLabel, onCta }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {description && (
        <Text style={[styles.description, { color: theme.textSecondary }]}>{description}</Text>
      )}
      {ctaLabel && onCta && (
        <Pressable style={[styles.button, { backgroundColor: Primary[500] }]} onPress={onCta}>
          <Text style={styles.buttonText}>{ctaLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
    gap: Spacing.three,
  },
  emoji: { fontSize: 56 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  description: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  button: {
    borderRadius: 12,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 4,
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
