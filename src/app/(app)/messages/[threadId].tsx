import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EventSource from 'react-native-sse';

import { getMessages, sendMessage, type Message } from '@/api/messages';
import { Primary, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/auth-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

function Bubble({ message, isMine }: { message: Message; isMine: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.bubbleWrap, isMine ? styles.bubbleRight : styles.bubbleLeft]}>
      <View
        style={[
          styles.bubble,
          isMine
            ? { backgroundColor: Primary[500] }
            : { backgroundColor: theme.backgroundElement },
        ]}
      >
        {message.attachmentUrl ? (
          <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
            📎 Attachment
          </Text>
        ) : (
          <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
            {message.body}
          </Text>
        )}
      </View>
      <Text style={[styles.bubbleTime, { color: theme.textSecondary }]}>
        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
}

export default function ChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', threadId],
    queryFn: () => getMessages(threadId!),
    enabled: !!threadId,
  });

  // SSE real-time stream
  useEffect(() => {
    if (!threadId) return;
    const es = new EventSource(`${API_URL}/api/messages/stream/${threadId}`);
    es.addEventListener('message', (e: any) => {
      try {
        const msg: Message = JSON.parse(e.data);
        qc.setQueryData<Message[]>(['messages', threadId], (prev = []) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      } catch {}
    });
    return () => es.close();
  }, [threadId]);

  async function handleSend() {
    if (!input.trim() || !threadId) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      const msg = await sendMessage(threadId, text);
      qc.setQueryData<Message[]>(['messages', threadId], (prev = []) => [...prev, msg]);
      qc.invalidateQueries({ queryKey: ['threads'] });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* Nav */}
      <View style={[styles.nav, { borderBottomColor: theme.backgroundElement }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: Primary[500] }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: theme.text }]}>Chat</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => (
            <Bubble message={item} isMine={item.senderId === user?._id} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No messages yet. Say hello!
              </Text>
            </View>
          }
        />

        {/* Input bar */}
        <View style={[styles.inputBar, { backgroundColor: theme.background, borderTopColor: theme.backgroundElement }]}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            placeholder="Type a message…"
            placeholderTextColor={theme.textSecondary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
          />
          <Pressable
            style={[styles.sendBtn, { backgroundColor: input.trim() ? Primary[500] : theme.backgroundElement }]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            <Text style={[styles.sendIcon, { opacity: input.trim() ? 1 : 0.4 }]}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderBottomWidth: 1,
  },
  back: { fontSize: 15, fontWeight: '600', width: 60 },
  navTitle: { fontSize: 16, fontWeight: '700' },
  list: { padding: Spacing.three, gap: Spacing.two, paddingBottom: 16 },
  bubbleWrap: { maxWidth: '80%', gap: 2 },
  bubbleLeft: { alignSelf: 'flex-start' },
  bubbleRight: { alignSelf: 'flex-end' },
  bubble: { borderRadius: 16, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  bubbleText: { fontSize: 15, lineHeight: 22, color: '#000' },
  bubbleTextMine: { color: '#fff' },
  bubbleTime: { fontSize: 11, paddingHorizontal: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five },
  emptyText: { fontSize: 14 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.two,
    gap: Spacing.two,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
