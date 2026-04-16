/**
 * Job-scoped chat — navigates to the message thread associated with this job.
 * We look up the thread by jobId, then redirect to the full chat screen.
 */
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getThreads } from '@/api/messages';
import { Icon } from '@/components/icon';
import { Primary, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function JobChatScreen() {
  const theme  = useTheme();
  const router = useRouter();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const { data: threads, isLoading, isError } = useQuery({
    queryKey: ['threads'],
    queryFn:  getThreads,
    staleTime: 0,
    enabled:  !!id,
  });

  useEffect(() => {
    if (!threads) return;
    // Per API docs: threadId = jobId for job threads (§6 Messages & Chat)
    // After normalisation, thread.id holds the threadId value
    const thread = threads.find((t) => t.id === id);
    if (thread) {
      router.replace(`/(app)/messages/${thread.id}`);
    }
  }, [threads, id, router]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Chat with Client</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.center}>
        {isLoading ? (
          <>
            <ActivityIndicator size="large" color={Primary[500]} />
            <Text style={[styles.hint, { color: theme.textSecondary }]}>Finding conversation…</Text>
          </>
        ) : isError ? (
          <>
            <Icon name="alert-circle-outline" size={48} color="#ef4444" />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Couldn't load messages</Text>
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              Check your connection and try again.
            </Text>
            <Pressable
              style={[styles.btn, { backgroundColor: Primary[500] }]}
              onPress={() => router.push('/(app)/messages')}
            >
              <Icon name="chatbubble-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Open Messages</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Icon name="chatbubbles-outline" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No conversation yet</Text>
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              Messages with the client about this job will appear here once the job starts.
            </Text>
            <Pressable
              style={[styles.btn, { backgroundColor: Primary[500] }]}
              onPress={() => router.push('/(app)/messages')}
            >
              <Icon name="chatbubble-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Open Messages</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:     { width: 32, alignItems: 'flex-start' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700' },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five, gap: Spacing.three },
  emptyTitle:  { fontSize: 20, fontWeight: '700' },
  hint:        { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  btn:         { borderRadius: 14, paddingVertical: 14, paddingHorizontal: Spacing.five, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.two },
  btnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },
});
