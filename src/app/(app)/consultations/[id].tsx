import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getConsultation,
  getConsultationMessages,
  respondToConsultation,
  sendConsultationMessage,
  type ConsultationMessage,
} from '@/api/consultations';
import { Icon } from '@/components/icon';
import { CardSkeleton } from '@/components/loading-skeleton';
import { StatusChip } from '@/components/status-chip';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/auth-store';

export default function ConsultationDetailScreen() {
  const theme   = useTheme();
  const router  = useRouter();
  const qc      = useQueryClient();
  const insets  = useSafeAreaInsets();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id      = Array.isArray(rawId) ? rawId[0] : rawId;
  const userId  = useAuthStore((s) => s.user?._id);
  const [body,  setBody]  = useState('');
  const [estAmt, setEstAmt] = useState('');
  const [estNote, setEstNote] = useState('');

  const { data: consultation, isLoading, isError: consultationError } = useQuery({
    queryKey: ['consultation', id],
    queryFn:  () => getConsultation(id!),
    enabled:  !!id,
    staleTime: 1000 * 60,
  });

  const { data: messages = [], refetch: refetchMsgs } = useQuery({
    queryKey: ['consultation-msgs', id],
    queryFn:  () => getConsultationMessages(id),
    enabled:  !!id,
    refetchInterval: 15_000,
  });

  const respondMutation = useMutation({
    mutationFn: (action: 'accept' | 'decline') =>
      respondToConsultation(id, {
        action,
        estimateAmount: estAmt ? Number(estAmt) : undefined,
        estimateNote:   estNote.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consultation', id] });
      qc.invalidateQueries({ queryKey: ['consultations'] });
    },
    onError: () => Alert.alert('Error', 'Could not respond. Please try again.'),
  });

  const sendMutation = useMutation({
    mutationFn: () => sendConsultationMessage(id, body.trim()),
    onSuccess: () => {
      setBody('');
      refetchMsgs();
    },
    onError: () => Alert.alert('Error', 'Could not send message.'),
  });

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}><Icon name="chevron-back" size={22} color={theme.text} /></Pressable>
        </View>
        <View style={{ padding: Spacing.four, gap: Spacing.three }}>
          {[0, 1].map((i) => <CardSkeleton key={i} />)}
        </View>
      </SafeAreaView>
    );
  }

  if (consultationError || !consultation) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}><Icon name="chevron-back" size={22} color={theme.text} /></Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Consultation</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.errorWrap}>
          <Icon name="alert-circle-outline" size={52} color="#ef4444" />
          <Text style={[styles.errorTitle, { color: theme.text }]}>Couldn't load consultation</Text>
          <Pressable onPress={() => router.back()} style={styles.retryRow}>
            <Icon name="arrow-back-outline" size={14} color={Primary[500]} />
            <Text style={[styles.retryText, { color: Primary[500] }]}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isPending = consultation.status === 'pending';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
              {consultation?.title ?? 'Consultation'}
            </Text>
            <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
              {consultation?.type === 'site_inspection' ? 'Site Inspection' : 'Chat Consultation'}
            </Text>
          </View>
          <StatusChip status={consultation?.status ?? 'pending'} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Details */}
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.cardDesc, { color: theme.text }]}>{consultation?.description}</Text>
            {consultation?.location && (
              <View style={styles.metaRow}>
                <Icon name="location-outline" size={14} color={theme.textSecondary} />
                <Text style={[styles.metaText, { color: theme.textSecondary }]}>{consultation.location}</Text>
              </View>
            )}
            {consultation?.estimateAmount != null && (
              <Text style={[styles.estimate, { color: Primary[500] }]}>
                Estimate: ₱{consultation.estimateAmount.toLocaleString()}
                {consultation.estimateNote ? ` — ${consultation.estimateNote}` : ''}
              </Text>
            )}
          </View>

          {/* Respond form (only when pending) */}
          {isPending && (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Respond to Request</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={estAmt}
                onChangeText={setEstAmt}
                placeholder="Estimate amount (₱) — optional"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.textarea, { backgroundColor: theme.background, color: theme.text }]}
                value={estNote}
                onChangeText={setEstNote}
                placeholder="Estimate note — optional"
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={3}
              />
              <View style={styles.respondBtns}>
                <Pressable
                  style={[styles.respondBtn, { backgroundColor: Status.errorBg, borderColor: Status.error, borderWidth: 1 }]}
                  onPress={() => Alert.alert('Decline', 'Decline this consultation?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Decline', style: 'destructive', onPress: () => respondMutation.mutate('decline') },
                  ])}
                  disabled={respondMutation.isPending}
                >
                  <Icon name="close-outline" size={18} color={Status.error} />
                  <Text style={[styles.respondBtnText, { color: Status.error }]}>Decline</Text>
                </Pressable>
                <Pressable
                  style={[styles.respondBtn, { backgroundColor: Status.success }]}
                  onPress={() => respondMutation.mutate('accept')}
                  disabled={respondMutation.isPending}
                >
                  <Icon name="checkmark-outline" size={18} color="#fff" />
                  <Text style={[styles.respondBtnText, { color: '#fff' }]}>
                    {respondMutation.isPending ? 'Sending…' : 'Accept'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Messages */}
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Messages</Text>
          {messages.length === 0 ? (
            <View style={styles.emptyMsgs}>
              <Icon name="chatbubble-outline" size={32} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No messages yet.</Text>
            </View>
          ) : (
            messages.map((msg: ConsultationMessage) => {
              const isMine = msg.senderId === userId;
              return (
                <View key={msg._id} style={[styles.bubbleWrap, isMine ? styles.bubbleRight : styles.bubbleLeft]}>
                  <View style={[styles.bubble, { backgroundColor: isMine ? Primary[500] : theme.backgroundElement }]}>
                    <Text style={[styles.bubbleText, { color: isMine ? '#fff' : theme.text }]}>{msg.body}</Text>
                  </View>
                  <Text style={[styles.bubbleTime, { color: theme.textSecondary }]}>
                    {(() => { const d = new Date(msg.createdAt); return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); })()}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Message input */}
        <View style={[styles.inputBar, { backgroundColor: theme.background, borderTopColor: theme.backgroundElement, paddingBottom: insets.bottom || Spacing.two }]}>
          <TextInput
            style={[styles.msgInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            value={body}
            onChangeText={setBody}
            placeholder="Type a message…"
            placeholderTextColor={theme.textSecondary}
            multiline
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
  headerTitle:   { fontSize: 16, fontWeight: '700' },
  headerSub:     { fontSize: 12 },
  scroll:        { padding: Spacing.four, gap: Spacing.three, paddingBottom: BottomTabInset + 24 },
  errorWrap:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.five },
  errorTitle:    { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  retryRow:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  retryText:     { fontSize: 14, fontWeight: '600' },
  card:          { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  cardTitle:     { fontSize: 15, fontWeight: '700' },
  cardDesc:      { fontSize: 14, lineHeight: 21 },
  metaRow:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:      { fontSize: 13 },
  estimate:      { fontSize: 14, fontWeight: '600' },
  input:         { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  textarea:      { minHeight: 72, textAlignVertical: 'top' },
  respondBtns:   { flexDirection: 'row', gap: Spacing.two },
  respondBtn:    { flex: 1, borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  respondBtnText:{ fontSize: 14, fontWeight: '700' },
  sectionLabel:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  bubbleWrap:    { gap: 2 },
  bubbleLeft:    { alignItems: 'flex-start' },
  bubbleRight:   { alignItems: 'flex-end' },
  bubble:        { borderRadius: 16, padding: Spacing.two + 2, maxWidth: '80%' },
  bubbleText:    { fontSize: 14, lineHeight: 20 },
  bubbleTime:    { fontSize: 11, marginBottom: Spacing.one },
  emptyMsgs:    { alignItems: 'center', paddingVertical: Spacing.four, gap: Spacing.one },
  emptyText:     { fontSize: 13 },
  inputBar:      { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two, padding: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
  msgInput:      { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn:       { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
