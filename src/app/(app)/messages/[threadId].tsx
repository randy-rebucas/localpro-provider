import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import EventSource from 'react-native-sse';

import { getMessages, getThreads, normaliseMessage, sendMessage, type Message, type Thread } from '@/api/messages';
import { Icon } from '@/components/icon';
import { BottomTabInset, Primary, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/auth-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

/* ─── Helpers ────────────────────────────────────────────────────────── */

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function sameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.toDateString() === db.toDateString();
}

/* ─── Bubble ─────────────────────────────────────────────────────────── */

interface BubbleProps {
  message: Message;
  isMine: boolean;
  otherAvatar: string | null;
  otherInitial: string;
  showAvatar: boolean;   // show avatar on the last received message in a group
}

function Bubble({ message, isMine, otherAvatar, otherInitial, showAvatar }: BubbleProps) {
  const theme = useTheme();

  return (
    <View style={[styles.bubbleWrap, isMine ? styles.bubbleRight : styles.bubbleLeft]}>
      {/* Avatar placeholder to keep alignment consistent */}
      {!isMine && (
        <View style={styles.avatarSlot}>
          {showAvatar ? (
            otherAvatar ? (
              <Image source={{ uri: otherAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: Primary[100] }]}>
                <Text style={[styles.avatarInitial, { color: Primary[700] }]}>{otherInitial}</Text>
              </View>
            )
          ) : null}
        </View>
      )}

      <View style={styles.bubbleContent}>
        <View
          style={[
            styles.bubble,
            isMine
              ? { backgroundColor: Primary[500], borderBottomRightRadius: 4 }
              : { backgroundColor: theme.backgroundElement, borderBottomLeftRadius: 4 },
          ]}
        >
          {message.attachmentUrl ? (
            <View style={styles.attachRow}>
              <Icon name="attach" size={14} color={isMine ? '#fff' : theme.text} />
              <Text style={[styles.bubbleText, { color: isMine ? '#fff' : theme.text }]}>Attachment</Text>
            </View>
          ) : (
            <Text style={[styles.bubbleText, { color: isMine ? '#fff' : theme.text }]}>
              {message.body}
            </Text>
          )}
        </View>
        <Text style={[styles.bubbleTime, { color: theme.textSecondary, textAlign: isMine ? 'right' : 'left' }]}>
          {formatTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

/* ─── Date separator ─────────────────────────────────────────────────── */

function DateSeparator({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.dateSep}>
      <View style={[styles.dateLine, { backgroundColor: theme.backgroundElement }]} />
      <View style={[styles.datePill, { backgroundColor: theme.backgroundElement }]}>
        <Text style={[styles.datePillText, { color: theme.textSecondary }]}>{label}</Text>
      </View>
      <View style={[styles.dateLine, { backgroundColor: theme.backgroundElement }]} />
    </View>
  );
}

/* ─── Screen ─────────────────────────────────────────────────────────── */

export default function ChatScreen() {
  const theme  = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const qc = useQueryClient();
  const myId = useAuthStore((s) => s.user?._id ?? '');

  const [input, setInput]           = useState('');
  const [sending, setSending]       = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const listRef = useRef<FlatList>(null);

  /* Keyboard listener */
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  /* Messages query */
  const { data: messages = [], isFetching, isError, refetch: refetchMessages } = useQuery({
    queryKey: ['messages', threadId],
    queryFn: () => getMessages(threadId!),
    enabled: !!threadId,
    staleTime: 1000 * 30,
  });

  /* Threads — served from cache when available, fetched fresh otherwise */
  const { data: threads = [] } = useQuery({
    queryKey: ['threads'],
    queryFn: getThreads,
    staleTime: 1000 * 60,
  });
  const thread      = threads.find((t) => t.id === threadId);
  const otherParty  = thread?.otherParty;
  const otherAvatar = otherParty?.avatar ?? null;
  const otherName   = otherParty?.name ?? 'Chat';
  const otherInitial = otherName.charAt(0).toUpperCase();

  /* SSE for real-time messages */
  useEffect(() => {
    if (!threadId) return;
    const es = new EventSource(`${API_URL}/api/messages/stream/${threadId}`, { withCredentials: true });
    es.addEventListener('message', (e: any) => {
      try {
        const msg: Message = normaliseMessage(JSON.parse(e.data), threadId!);
        qc.setQueryData<Message[]>(['messages', threadId], (prev = []) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        qc.invalidateQueries({ queryKey: ['threads'] });
      } catch (err) {
        if (__DEV__) console.warn('[SSE] Failed to process message event', err);
      }
    });
    return () => es.close();
  }, [threadId, qc]);

  /* Send */
  async function handleSend() {
    if (!input.trim() || !threadId) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      const msg = await sendMessage(threadId, text);
      qc.setQueryData<Message[]>(['messages', threadId], (prev = []) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      qc.invalidateQueries({ queryKey: ['threads'] });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setInput(text);
      // Brief delay so the restored text doesn't feel jarring
      setTimeout(() => setSending(false), 300);
      return;
    }
    setSending(false);
  }

  /* ── Render ── */
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, { backgroundColor: theme.background }]}>

      {/* ── Header ── */}
      <View style={[styles.nav, { borderBottomColor: theme.backgroundElement }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Icon name="chevron-back" size={24} color={Primary[500]} />
        </Pressable>

        <View style={styles.navMeta}>
          {otherAvatar ? (
            <Image source={{ uri: otherAvatar }} style={styles.navAvatar} />
          ) : (
            <View style={[styles.navAvatar, styles.navAvatarFallback, { backgroundColor: Primary[100] }]}>
              <Text style={[styles.navAvatarInitial, { color: Primary[700] }]}>{otherInitial}</Text>
            </View>
          )}
          <View style={styles.navText}>
            <Text style={[styles.navTitle, { color: theme.text }]} numberOfLines={1}>{otherName}</Text>
            {thread?.jobTitle ? (
              <Text style={[styles.navSub, { color: Primary[500] }]} numberOfLines={1}>
                {thread.jobTitle}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={insets.top + 52}
      >
        {/* ── Message list ── */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, messages.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item, index }) => {
            // Provider message = RIGHT (isMine true), client message = LEFT (isMine false).
            // Primary check: compare senderId against the known client ID from thread data.
            // Fallback: compare against our own auth user ID when client ID is unknown.
            const clientId = otherParty?.id ?? '';
            const isMine = clientId
              ? item.senderId !== clientId   // sender is NOT the client → it's mine
              : item.senderId === myId;       // fallback: does senderId match my own ID?
            const prev       = index > 0 ? messages[index - 1] : null;
            const next       = index < messages.length - 1 ? messages[index + 1] : null;
            const showDate   = !prev || !sameDay(prev.createdAt, item.createdAt);
            const showAvatar = !isMine && (!next || next.senderId !== item.senderId);
            return (
              <View>
                {showDate && <DateSeparator label={formatDateLabel(item.createdAt)} />}
                <Bubble
                  message={item}
                  isMine={isMine}
                  otherAvatar={otherAvatar}
                  otherInitial={otherInitial}
                  showAvatar={showAvatar}
                />
              </View>
            );
          }}
          ListEmptyComponent={
            isFetching ? (
              <View style={styles.loadingCenter}>
                <ActivityIndicator color={Primary[500]} />
              </View>
            ) : isError ? (
              <View style={styles.empty}>
                <View style={[styles.emptyIconWrap, { backgroundColor: '#fee2e2' }]}>
                  <Icon name="alert-circle-outline" size={36} color="#ef4444" />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>Couldn't load messages</Text>
                <Pressable onPress={() => refetchMessages()} style={[styles.retryBtn, { backgroundColor: Primary[500] }]}>
                  <Icon name="refresh-outline" size={15} color="#fff" />
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.empty}>
                <View style={[styles.emptyIconWrap, { backgroundColor: Primary[50] }]}>
                  <Icon name="chatbubbles-outline" size={36} color={Primary[400]} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No messages yet</Text>
                <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
                  Start the conversation — introduce yourself and share your availability.
                </Text>
              </View>
            )
          }
        />

        {/* ── Input bar ── */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.backgroundElement,
              paddingBottom: keyboardOpen ? Spacing.two : BottomTabInset,
            },
          ]}
        >
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            placeholder="Type a message…"
            placeholderTextColor={theme.textSecondary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
            returnKeyType="default"
          />
          <Pressable
            style={[
              styles.sendBtn,
              { backgroundColor: input.trim() ? Primary[500] : theme.backgroundElement },
            ]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="send" size={18} color={input.trim() ? '#fff' : theme.textSecondary} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  flex:        { flex: 1 },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* Nav */
  nav:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth, gap: Spacing.two },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navMeta:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  navAvatar:   { width: 38, height: 38, borderRadius: 19 },
  navAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  navAvatarInitial:  { fontSize: 16, fontWeight: '700' },
  navText:     { flex: 1, gap: 1 },
  navTitle:    { fontSize: 15, fontWeight: '700' },
  navSub:      { fontSize: 12, fontWeight: '500' },

  /* List */
  list:        { padding: Spacing.three, gap: 2, paddingBottom: Spacing.three },
  listEmpty:   { flex: 1 },

  /* Date separator */
  dateSep:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginVertical: Spacing.two },
  dateLine:    { flex: 1, height: StyleSheet.hairlineWidth },
  datePill:    { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  datePillText:{ fontSize: 11, fontWeight: '600' },

  /* Bubbles */
  bubbleWrap:    { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginVertical: 2 },
  bubbleRight:   { justifyContent: 'flex-end' },
  bubbleLeft:    { justifyContent: 'flex-start' },
  avatarSlot:    { width: 28, alignItems: 'center', justifyContent: 'flex-end' },
  avatar:        { width: 26, height: 26, borderRadius: 13 },
  avatarFallback:{ alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 11, fontWeight: '700' },
  bubbleContent: { maxWidth: '75%', gap: 3 },
  bubble:        { borderRadius: 18, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  attachRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bubbleText:    { fontSize: 15, lineHeight: 22 },
  bubbleTime:    { fontSize: 11, paddingHorizontal: 4, opacity: 0.6 },

  /* Empty / error */
  empty:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.five },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.one },
  emptyTitle:    { fontSize: 17, fontWeight: '700' },
  emptyHint:     { fontSize: 14, textAlign: 'center', lineHeight: 20, opacity: 0.7 },
  retryBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10, marginTop: 4 },
  retryText:     { color: '#fff', fontSize: 14, fontWeight: '700' },

  /* Input bar */
  inputBar:  { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Spacing.three, paddingTop: Spacing.two, gap: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
  input:     { flex: 1, borderRadius: 22, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 1, fontSize: 15, maxHeight: 120, minHeight: 40 },
  sendBtn:   { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
});
