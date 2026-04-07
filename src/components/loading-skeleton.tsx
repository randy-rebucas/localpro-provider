import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: theme.backgroundElement, opacity },
        style,
      ]}
    />
  );
}

export function CardSkeleton({ style }: { style?: ViewStyle }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }, style]}>
      <View style={styles.row}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={styles.lines}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={12} />
        </View>
      </View>
      <Skeleton height={12} />
      <Skeleton width="80%" height={12} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lines: { flex: 1, gap: 6 },
});
