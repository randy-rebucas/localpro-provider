import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
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

import { getSupportMessages, sendSupportMessage, type SupportMessage } from '@/api/support';
import { Icon } from '@/components/icon';
import { Primary, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/auth-store';

export default function SupportScreen() {
  const theme   = useTheme();
  const router  = useRouter();
  const qc      = useQueryClient();
  const userId  = useAuthStore((s) => s.user?._id);
  const [body, setBody] = useState('');
  const listRef = useRef<FlatList>(null);

  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ['support-messages'],
    queryFn:  getSupportMessages,
    refetchInterval: 15_000,
  });

  const sendMutation = useMutation({
    mutationFn: () => sendSupportMessage(body.trim()),
    onSuccess: () => {
      setBody('');
      qc.invalidateQueries({ queryKey: ['support-messages'] });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
    },
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Support</Text>
            <Text style={[styles.headerSub, { color: theme.textSecondary }]}>Chat with LocalPro team</Text>
          </View>
          <View style={[styles.onlineDot, { backgroundColor: '#22c55e' }]} />
        </View>

        {/* Messages */}
        {isLoading ? (
          <View style={styles.loadingCenter}>
            <Icon name="headset-outline" size={48} color={theme.textSecondary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading conversation…</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListHeaderComponent={
              <View style={[styles.welcomeCard, { backgroundColor: Primary[50] }]}>
                <Icon name="headset-outline" size={24} color={Primary[600]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.welcomeTitle, { color: Primary[700] }]}>LocalPro Support</Text>
                  <Text style={[styles.welcomeText, { color: Primary[600] }]}>
                    We typically reply within 24 hours. For urgent issues, describe your problem in detail.
                  </Text>
                </View>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Icon name="chatbubbles-outline" size={48} color={theme.textSecondary} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>Start a conversation</Text>
                <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
                  Send a message to the support team and we will get back to you.
                </Text>
              </View>
            }
            renderItem={({ item }: { item: SupportMessage }) => {
              const isMine = item.senderId === userId || item.senderRole === 'provider';
              return (
                <View style={[styles.bubbleWrap, isMine ? styles.bubbleRight : styles.bubbleLeft]}>
                  {!isMine && (
                    <View style={[styles.agentAvatar, { backgroundColor: Primary[100] }]}>
                      <Icon name="headset-outline" size={14} color={Primary[600]} />
                    </View>
                  )}
                  <View>
                    {!isMine && (
                      <Text style={[styles.agentLabel, { color: theme.textSecondary }]}>Support</Text>
                    )}
                    <View style={[styles.bubble, { backgroundColor: isMine ? Primary[500] : theme.backgroundElement }]}>
                      <Text style={[styles.bubbleText, { color: isMine ? '#fff' : theme.text }]}>
                        {item.body}
                      </Text>
                    </View>
                    <Text style={[styles.bubbleTime, { color: theme.textSecondary }, isMine ? styles.timeRight : styles.timeLeft]}>
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { backgroundColor: theme.background, borderTopColor: theme.backgroundElement }]}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            value={body}
            onChangeText={setBody}
            placeholder="Describe your issue…"
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={2000}
          />
          <Pressable
            style={[styles.sendBtn, { backgroundColor: body.trim() ? Primary[500] : theme.backgroundElement }]}
            onPress={() => body.trim() && sendMutation.mutate()}
            disabled={!body.trim() || sendMutation.isPending}
          >
            <Icon name="send" size={18} color={body.trim() ? '#fff' : theme.textSecondary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:       { width: 32, alignItems: 'flex-start' },
  headerTitle:   { fontSize: 17, fontWeight: '700' },
  headerSub:     { fontSize: 12 },
  onlineDot:     { width: 10, height: 10, borderRadius: 5 },
  list:          { padding: Spacing.four, gap: Spacing.two, paddingBottom: 16 },
  welcomeCard:   { borderRadius: 14, padding: Spacing.three, flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start', marginBottom: Spacing.two },
  welcomeTitle:  { fontSize: 14, fontWeight: '700' },
  welcomeText:   { fontSize: 12, lineHeight: 17, marginTop: 2 },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  loadingText:   { fontSize: 14 },
  empty:         { alignItems: 'center', paddingTop: 40, gap: Spacing.two },
  emptyTitle:    { fontSize: 18, fontWeight: '700' },
  emptyHint:     { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  bubbleWrap:    { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  bubbleLeft:    { justifyContent: 'flex-start' },
  bubbleRight:   { justifyContent: 'flex-end', flexDirection: 'row-reverse' },
  agentAvatar:   { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  agentLabel:    { fontSize: 10, fontWeight: '600', marginBottom: 2, paddingLeft: 4 },
  bubble:        { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, maxWidth: 280 },
  bubbleText:    { fontSize: 14, lineHeight: 20 },
  bubbleTime:    { fontSize: 10, marginTop: 2 },
  timeLeft:      { paddingLeft: 6 },
  timeRight:     { textAlign: 'right', paddingRight: 4 },
  inputBar:      { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two, padding: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
  input:         { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn:       { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
