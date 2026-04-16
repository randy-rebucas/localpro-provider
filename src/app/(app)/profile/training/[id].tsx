/**
 * Course Detail + Lesson Player
 * Docs: provider-training-mobile.md
 *
 * GET    /api/provider/training/[id]                                        — course detail
 * POST   /api/provider/training/[id]/enroll                                 — enroll (wallet / free)
 * POST   /api/provider/training/[id]/checkout                               — PayMongo checkout
 * POST   /api/provider/training/[id]/activate                               — activate after payment
 * POST   /api/provider/training/enrollments/[enrollmentId]/lessons/[lessonId]/complete
 * POST   /api/provider/training/enrollments/[enrollmentId]/complete         — claim badge
 * GET    /api/provider/training/[id]/certificate                            — certificate data
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  activateEnrollment,
  checkoutCourse,
  completeCourse,
  completeLessonApi,
  enrollCourse,
  getCertificate,
  getCourseDetail,
  type Certificate,
  type CourseDetail,
  type Lesson,
} from '@/api/provider-profile';
import { Icon } from '@/components/icon';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CATEGORY_META } from './index';

/* ─── Simple markdown → plain text renderer ─────────────────────────── */
function renderMarkdown(md: string): string {
  return md
    .replace(/#{1,6}\s+(.+)/g, '$1')           // headings → plain
    .replace(/\*\*(.+?)\*\*/g, '$1')            // bold
    .replace(/\*(.+?)\*/g, '$1')                // italic
    .replace(/`(.+?)`/g, '$1')                  // inline code
    .replace(/^[-*]\s+/gm, '• ')               // bullet lists
    .replace(/^\d+\.\s+/gm, (m) => m)           // numbered lists
    .replace(/\n{3,}/g, '\n\n')                 // extra blank lines
    .trim();
}

/* ─── Certificate modal ─────────────────────────────────────────────── */
function CertificateModal({ cert, onClose }: { cert: Certificate; onClose: () => void }) {
  const theme = useTheme();
  async function handleShare() {
    try {
      await Share.share({
        message: `I earned the "${cert.courseTitle}" certificate on LocalPro!\nCertificate No: ${cert.certificateNumber}`,
      });
    } catch { /* ignore */ }
  }
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.certModal, { backgroundColor: theme.background }]}>
        <View style={styles.certModalHeader}>
          <Text style={[styles.certModalTitle, { color: theme.text }]}>Certificate</Text>
          <Pressable onPress={onClose} style={styles.certCloseBtn}>
            <Icon name="close" size={20} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.certBody}>
          {/* Certificate card */}
          <View style={[styles.certCard, { borderColor: Primary[200] }]}>
            <View style={[styles.certTopBar, { backgroundColor: Primary[500] }]} />
            <View style={styles.certInner}>
              <View style={[styles.certBadgeWrap, { backgroundColor: Primary[50] }]}>
                <Icon name="ribbon" size={40} color={Primary[500]} />
              </View>
              <Text style={[styles.certIssuer, { color: Primary[500] }]}>LocalPro Certificate of Completion</Text>
              <Text style={[styles.certCourseName, { color: theme.text }]}>{cert.courseTitle}</Text>
              <View style={[styles.certDivider, { backgroundColor: Primary[100] }]} />
              <Text style={[styles.certAwardedTo, { color: theme.textSecondary }]}>Awarded to</Text>
              <Text style={[styles.certProviderName, { color: theme.text }]}>{cert.providerName}</Text>
              <View style={styles.certFooterRow}>
                <View>
                  <Text style={[styles.certFooterLabel, { color: theme.textSecondary }]}>Issued</Text>
                  <Text style={[styles.certFooterValue, { color: theme.text }]}>
                    {new Date(cert.completedAt).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.certFooterLabel, { color: theme.textSecondary }]}>Certificate No.</Text>
                  <Text style={[styles.certFooterValue, { color: Primary[600] }]}>{cert.certificateNumber}</Text>
                </View>
              </View>
            </View>
          </View>

          <Pressable style={[styles.shareBtn, { backgroundColor: Primary[500] }]} onPress={handleShare}>
            <Icon name="share-social-outline" size={18} color="#fff" />
            <Text style={styles.shareBtnText}>Share Certificate</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

/* ─── Lesson content viewer ─────────────────────────────────────────── */
function LessonViewer({ lesson }: { lesson: Lesson }) {
  const theme = useTheme();
  return (
    <View style={styles.lessonViewer}>
      {lesson.imageUrl ? (
        <Image source={{ uri: lesson.imageUrl }} style={styles.lessonImage} resizeMode="cover" />
      ) : null}
      {lesson.videoUrl ? (
        <Pressable
          style={[styles.videoBtn, { backgroundColor: theme.backgroundElement }]}
          onPress={() => WebBrowser.openBrowserAsync(lesson.videoUrl!)}
        >
          <View style={[styles.videoPlayIcon, { backgroundColor: Primary[500] }]}>
            <Icon name="play" size={18} color="#fff" />
          </View>
          <Text style={[styles.videoBtnText, { color: theme.text }]}>Watch Video Lesson</Text>
          <Icon name="open-outline" size={16} color={theme.textSecondary} />
        </Pressable>
      ) : null}
      {lesson.content ? (
        <Text style={[styles.lessonContent, { color: theme.text }]}>
          {renderMarkdown(lesson.content)}
        </Text>
      ) : (
        <View style={[styles.lessonPlaceholder, { backgroundColor: theme.backgroundElement }]}>
          <Icon name="document-text-outline" size={32} color={theme.textSecondary} />
          <Text style={[styles.lessonPlaceholderText, { color: theme.textSecondary }]}>
            Enroll to view lesson content
          </Text>
        </View>
      )}
    </View>
  );
}

/* ─── Screen ─────────────────────────────────────────────────────────── */
export default function CourseDetailScreen() {
  const theme   = useTheme();
  const router  = useRouter();
  const qc      = useQueryClient();
  const { id }  = useLocalSearchParams<{ id: string }>();

  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [certModal, setCertModal]             = useState(false);
  const [certData, setCertData]               = useState<Certificate | null>(null);
  const [activating, setActivating]           = useState(false);

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn:  () => getCourseDetail(id),
    enabled:  !!id,
    staleTime: 1000 * 60 * 2,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['course', id] });
    qc.invalidateQueries({ queryKey: ['enrollments'] });
    qc.invalidateQueries({ queryKey: ['courses'] });
  };

  const enrollment   = course?.enrollment ?? null;
  const lessons      = course?.lessons ?? [];
  const activeLesson = lessons[activeLessonIdx] ?? null;
  const isEnrolled   = !!enrollment;
  const isCompleted  = enrollment?.status === 'completed';
  const completedSet = new Set(enrollment?.completedLessons ?? []);
  const allDone      = lessons.length > 0 && lessons.every((l) => completedSet.has(l._id));
  const progress     = lessons.length > 0 ? Math.round((completedSet.size / lessons.length) * 100) : 0;
  const color        = CATEGORY_META[course?.category ?? 'basic']?.color ?? Primary[500];

  /* ── Enroll (wallet / free) */
  const enrollMutation = useMutation({
    mutationFn: () => enrollCourse(id),
    onSuccess: () => { invalidate(); Alert.alert('Enrolled!', "You now have access to all lessons."); },
    onError: (err: any) => {
      const msg = err?.response?.data?.error ?? 'Could not enroll.';
      if (err?.response?.status === 402) {
        Alert.alert('Insufficient Balance', msg, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Pay with Card', onPress: startPaymongo },
        ]);
      } else {
        Alert.alert('Error', msg);
      }
    },
  });

  /* ── PayMongo checkout */
  async function startPaymongo() {
    try {
      const { checkoutUrl, checkoutSessionId } = await checkoutCourse(id);
      // Persist session ID before opening browser
      await SecureStore.setItemAsync(`training_session_${id}`, checkoutSessionId);
      const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, 'localpro://');
      const urlStr = (result as any).url ?? '';
      if (urlStr.includes('payment=success')) {
        await handleActivation(checkoutSessionId);
      } else if (urlStr.includes('payment=cancelled')) {
        Alert.alert('Payment Cancelled', 'Your payment was cancelled. You can try again anytime.');
      }
    } catch {
      Alert.alert('Error', 'Could not start checkout. Please try again.');
    }
  }

  async function handleActivation(sessionId: string) {
    setActivating(true);
    let activated = false;
    for (let i = 0; i < 8; i++) {
      try {
        const res = await activateEnrollment(id, sessionId);
        if (res.activated) { activated = true; break; }
      } catch { /* retry */ }
      await new Promise((r) => setTimeout(r, 3000));
    }
    setActivating(false);
    if (activated) {
      invalidate();
      Alert.alert('Enrollment Activated!', "You now have access to all lessons.");
    } else {
      Alert.alert('Processing…', 'Your payment was received. Enrollment is being activated — please refresh in a moment.');
    }
    await SecureStore.deleteItemAsync(`training_session_${id}`);
  }

  /* ── Mark lesson complete */
  const lessonMutation = useMutation({
    mutationFn: (lessonId: string) => completeLessonApi(enrollment!._id, lessonId),
    onSuccess: () => {
      invalidate();
      // Auto-advance to next incomplete lesson
      const nextIdx = lessons.findIndex((l, i) => i > activeLessonIdx && !completedSet.has(l._id));
      if (nextIdx !== -1) setActiveLessonIdx(nextIdx);
    },
    onError: () => Alert.alert('Error', 'Could not mark lesson complete.'),
  });

  /* ── Complete course + claim badge */
  const completeMutation = useMutation({
    mutationFn: () => completeCourse(enrollment!._id),
    onSuccess: () => {
      invalidate();
      Alert.alert('🎓 Course Completed!', "You've earned your badge. View your certificate below.");
    },
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.error ?? 'Could not complete course.'),
  });

  /* ── View certificate */
  async function viewCertificate() {
    try {
      const cert = await getCertificate(id);
      setCertData(cert);
      setCertModal(true);
    } catch {
      Alert.alert('Error', 'Could not load certificate.');
    }
  }

  if (isLoading || !course) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <View style={{ flex: 1 }} />
        </View>
        <ActivityIndicator color={Primary[500]} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const catMeta = CATEGORY_META[course.category];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* ── Activating banner ──────────────────────────────── */}
      {activating && (
        <View style={[styles.activatingBanner, { backgroundColor: Primary[50] }]}>
          <ActivityIndicator size="small" color={Primary[500]} />
          <Text style={[styles.activatingText, { color: Primary[700] }]}>Activating your enrollment…</Text>
        </View>
      )}

      {/* ── Header ─────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{course.title}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Course hero ──────────────────────────────────── */}
        <View style={[styles.hero, { backgroundColor: color + '12', borderColor: color + '30' }]}>
          <View style={styles.heroTop}>
            <View style={[styles.heroCatPill, { backgroundColor: color + '20' }]}>
              <Icon name={catMeta?.icon as any ?? 'school-outline'} size={12} color={color} />
              <Text style={[styles.heroCatText, { color }]}>{catMeta?.label ?? course.category}</Text>
            </View>
            <View style={[styles.pricePill, { backgroundColor: course.price === 0 ? Status.successBg : Primary[50] }]}>
              <Text style={[styles.priceText, { color: course.price === 0 ? Status.success : Primary[600] }]}>
                {course.price === 0 ? 'Free' : `₱${course.price.toLocaleString()}`}
              </Text>
            </View>
          </View>
          <Text style={[styles.heroTitle, { color: theme.text }]}>{course.title}</Text>
          <Text style={[styles.heroDesc, { color: theme.textSecondary }]}>{course.description}</Text>
          <View style={styles.heroMeta}>
            <View style={styles.metaItem}>
              <Icon name="book-outline" size={14} color={theme.textSecondary} />
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>{lessons.length} lessons</Text>
            </View>
            <View style={styles.metaDot} />
            <View style={styles.metaItem}>
              <Icon name="time-outline" size={14} color={theme.textSecondary} />
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                {(course.durationMinutes / 60).toFixed(1).replace(/\.0$/, '')}h
              </Text>
            </View>
            {(course.enrollmentCount ?? 0) > 0 && (
              <>
                <View style={styles.metaDot} />
                <View style={styles.metaItem}>
                  <Icon name="people-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.metaText, { color: theme.textSecondary }]}>{course.enrollmentCount} enrolled</Text>
                </View>
              </>
            )}
          </View>

          {/* Progress bar (enrolled) */}
          {isEnrolled && !isCompleted && (
            <View style={styles.progressBlock}>
              <View style={styles.progressTopRow}>
                <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
                  {completedSet.size}/{lessons.length} lessons
                </Text>
                <Text style={[styles.progressPct, { color }]}>{progress}%</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: color + '20' }]}>
                <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: color }]} />
              </View>
            </View>
          )}
          {isCompleted && (
            <View style={[styles.completedBanner, { backgroundColor: Status.successBg }]}>
              <Icon name="checkmark-circle" size={18} color={Status.success} />
              <Text style={[styles.completedBannerText, { color: Status.success }]}>Course Completed · Badge Earned 🎓</Text>
            </View>
          )}
        </View>

        {/* ── Enroll CTAs (not enrolled) ───────────────────── */}
        {!isEnrolled && (
          <View style={styles.enrollSection}>
            {course.price === 0 ? (
              <Pressable
                style={[styles.enrollBtn, { backgroundColor: color }]}
                onPress={() => enrollMutation.mutate()}
                disabled={enrollMutation.isPending}
              >
                {enrollMutation.isPending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Icon name="arrow-forward-circle-outline" size={20} color="#fff" />}
                <Text style={styles.enrollBtnText}>Enroll Free</Text>
              </Pressable>
            ) : (
              <View style={styles.payRow}>
                <Pressable
                  style={[styles.payBtn, { backgroundColor: color, flex: 1 }]}
                  onPress={() => Alert.alert(
                    `Enroll for ₱${course.price.toLocaleString()}`,
                    'Deduct from your wallet balance?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Pay with Wallet', onPress: () => enrollMutation.mutate() },
                    ],
                  )}
                  disabled={enrollMutation.isPending}
                >
                  {enrollMutation.isPending
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Icon name="wallet-outline" size={18} color="#fff" />}
                  <Text style={styles.payBtnText}>Wallet · ₱{course.price.toLocaleString()}</Text>
                </Pressable>
                <Pressable
                  style={[styles.payBtn, { backgroundColor: theme.backgroundElement, flex: 1 }]}
                  onPress={startPaymongo}
                >
                  <Icon name="card-outline" size={18} color={theme.text} />
                  <Text style={[styles.payBtnText, { color: theme.text }]}>Pay with Card</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* ── Certificate CTA (completed) ──────────────────── */}
        {isCompleted && (
          <Pressable style={[styles.certBtn, { backgroundColor: Status.successBg, borderColor: Status.success }]} onPress={viewCertificate}>
            <Icon name="ribbon" size={20} color={Status.success} />
            <Text style={[styles.certBtnText, { color: Status.success }]}>View & Share Certificate</Text>
            <Icon name="chevron-forward" size={16} color={Status.success} />
          </Pressable>
        )}

        {/* ── Claim badge CTA (all lessons done, not yet completed) ── */}
        {isEnrolled && !isCompleted && allDone && (
          <Pressable
            style={[styles.claimBtn, { backgroundColor: Primary[500] }]}
            onPress={() => Alert.alert(
              '🎓 Claim Your Badge',
              'You\'ve completed all lessons! Claim your badge and certificate now.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Claim Badge', onPress: () => completeMutation.mutate() },
              ],
            )}
            disabled={completeMutation.isPending}
          >
            {completeMutation.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Icon name="ribbon" size={20} color="#fff" />}
            <Text style={styles.claimBtnText}>Claim Badge & Complete</Text>
          </Pressable>
        )}

        {/* ── Lesson player (enrolled, active lesson) ──────── */}
        {isEnrolled && activeLesson && (
          <View style={[styles.playerCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.playerHeader}>
              <View style={[styles.playerLessonNum, { backgroundColor: color }]}>
                <Text style={styles.playerLessonNumText}>{activeLesson.order}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.playerLessonTitle, { color: theme.text }]}>{activeLesson.title}</Text>
                <Text style={[styles.playerLessonDur, { color: theme.textSecondary }]}>
                  {activeLesson.durationMinutes} min
                  {completedSet.has(activeLesson._id) ? ' · Completed ✓' : ''}
                </Text>
              </View>
            </View>
            <LessonViewer lesson={activeLesson} />
            {/* Nav + mark complete */}
            <View style={styles.playerActions}>
              <Pressable
                style={[styles.playerNavBtn, { backgroundColor: theme.background, opacity: activeLessonIdx === 0 ? 0.3 : 1 }]}
                onPress={() => setActiveLessonIdx((i) => Math.max(0, i - 1))}
                disabled={activeLessonIdx === 0}
              >
                <Icon name="chevron-back" size={18} color={theme.text} />
                <Text style={[styles.playerNavText, { color: theme.text }]}>Prev</Text>
              </Pressable>
              {!completedSet.has(activeLesson._id) && (
                <Pressable
                  style={[styles.markCompleteBtn, { backgroundColor: color }]}
                  onPress={() => lessonMutation.mutate(activeLesson._id)}
                  disabled={lessonMutation.isPending}
                >
                  {lessonMutation.isPending
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Icon name="checkmark" size={18} color="#fff" />}
                  <Text style={styles.markCompleteText}>Mark Complete</Text>
                </Pressable>
              )}
              {completedSet.has(activeLesson._id) && (
                <View style={[styles.markCompleteBtn, { backgroundColor: Status.successBg }]}>
                  <Icon name="checkmark-circle" size={18} color={Status.success} />
                  <Text style={[styles.markCompleteText, { color: Status.success }]}>Completed</Text>
                </View>
              )}
              <Pressable
                style={[styles.playerNavBtn, { backgroundColor: theme.background, opacity: activeLessonIdx >= lessons.length - 1 ? 0.3 : 1 }]}
                onPress={() => setActiveLessonIdx((i) => Math.min(lessons.length - 1, i + 1))}
                disabled={activeLessonIdx >= lessons.length - 1}
              >
                <Text style={[styles.playerNavText, { color: theme.text }]}>Next</Text>
                <Icon name="chevron-forward" size={18} color={theme.text} />
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Lesson list ──────────────────────────────────── */}
        <View style={[styles.lessonList, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.lessonListTitle, { color: theme.text }]}>Lessons</Text>
          {lessons.map((lesson, idx) => {
            const isDone    = completedSet.has(lesson._id);
            const isActive  = isEnrolled && idx === activeLessonIdx;
            return (
              <Pressable
                key={lesson._id}
                style={[
                  styles.lessonRow,
                  isActive && { backgroundColor: color + '12' },
                  { borderTopColor: theme.background },
                ]}
                onPress={() => isEnrolled && setActiveLessonIdx(idx)}
                disabled={!isEnrolled}
              >
                <View style={[
                  styles.lessonRowIcon,
                  { backgroundColor: isDone ? Status.successBg : isActive ? color + '20' : theme.background },
                ]}>
                  <Icon
                    name={isDone ? 'checkmark-circle' : isEnrolled ? 'play-circle-outline' : 'lock-closed-outline'}
                    size={18}
                    color={isDone ? Status.success : isActive ? color : theme.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.lessonRowTitle, { color: isDone || isActive ? theme.text : theme.textSecondary }]}>
                    {lesson.order}. {lesson.title}
                  </Text>
                  <Text style={[styles.lessonRowDur, { color: theme.textSecondary }]}>
                    {lesson.durationMinutes} min
                  </Text>
                </View>
                {isDone && <Icon name="checkmark" size={14} color={Status.success} />}
                {isActive && !isDone && <View style={[styles.activeDot, { backgroundColor: color }]} />}
              </Pressable>
            );
          })}
        </View>

      </ScrollView>

      {/* Certificate modal */}
      {certModal && certData && (
        <CertificateModal cert={certData} onClose={() => setCertModal(false)} />
      )}
    </SafeAreaView>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe:               { flex: 1 },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:            { width: 32, alignItems: 'flex-start' },
  headerTitle:        { flex: 1, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  scroll:             { padding: Spacing.four, gap: Spacing.three, paddingBottom: BottomTabInset + 24 },

  activatingBanner:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.two, paddingHorizontal: Spacing.three },
  activatingText:     { fontSize: 13, fontWeight: '600' },

  /* Hero */
  hero:               { borderRadius: 18, padding: Spacing.four, gap: Spacing.two, borderWidth: 1 },
  heroTop:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroCatPill:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  heroCatText:        { fontSize: 11, fontWeight: '700' },
  pricePill:          { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  priceText:          { fontSize: 12, fontWeight: '800' },
  heroTitle:          { fontSize: 20, fontWeight: '800', lineHeight: 26 },
  heroDesc:           { fontSize: 13, lineHeight: 19 },
  heroMeta:           { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaItem:           { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:           { fontSize: 12 },
  metaDot:            { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#ccc' },
  progressBlock:      { gap: 6 },
  progressTopRow:     { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel:      { fontSize: 12 },
  progressPct:        { fontSize: 12, fontWeight: '700' },
  progressTrack:      { height: 7, borderRadius: 4, overflow: 'hidden' },
  progressFill:       { height: 7, borderRadius: 4 },
  completedBanner:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: Spacing.two },
  completedBannerText:{ fontSize: 13, fontWeight: '700' },

  /* Enroll */
  enrollSection:      { gap: Spacing.two },
  enrollBtn:          { borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  enrollBtnText:      { color: '#fff', fontSize: 15, fontWeight: '700' },
  payRow:             { flexDirection: 'row', gap: Spacing.two },
  payBtn:             { borderRadius: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  payBtnText:         { color: '#fff', fontSize: 13, fontWeight: '700' },

  /* Badge/cert CTAs */
  claimBtn:           { borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  claimBtnText:       { color: '#fff', fontSize: 15, fontWeight: '700' },
  certBtn:            { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: 14, padding: Spacing.three, borderWidth: 1.5 },
  certBtnText:        { flex: 1, fontSize: 14, fontWeight: '700' },

  /* Player */
  playerCard:         { borderRadius: 18, padding: Spacing.three, gap: Spacing.two },
  playerHeader:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  playerLessonNum:    { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  playerLessonNumText:{ color: '#fff', fontSize: 14, fontWeight: '800' },
  playerLessonTitle:  { fontSize: 15, fontWeight: '700' },
  playerLessonDur:    { fontSize: 12, marginTop: 1 },
  playerActions:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: 4 },
  playerNavBtn:       { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  playerNavText:      { fontSize: 13, fontWeight: '600' },
  markCompleteBtn:    { flex: 1, borderRadius: 10, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  markCompleteText:   { color: '#fff', fontSize: 13, fontWeight: '700' },

  /* Lesson viewer */
  lessonViewer:       { gap: Spacing.two },
  lessonImage:        { width: '100%', height: 180, borderRadius: 12 },
  videoBtn:           { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: 12, padding: Spacing.two },
  videoPlayIcon:      { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  videoBtnText:       { flex: 1, fontSize: 14, fontWeight: '600' },
  lessonContent:      { fontSize: 14, lineHeight: 22 },
  lessonPlaceholder:  { borderRadius: 12, padding: Spacing.four, alignItems: 'center', gap: Spacing.two },
  lessonPlaceholderText:{ fontSize: 13 },

  /* Lesson list */
  lessonList:         { borderRadius: 18, overflow: 'hidden' },
  lessonListTitle:    { fontSize: 15, fontWeight: '700', padding: Spacing.three, paddingBottom: Spacing.two },
  lessonRow:          { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 2, borderTopWidth: StyleSheet.hairlineWidth },
  lessonRowIcon:      { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  lessonRowTitle:     { fontSize: 14, fontWeight: '500' },
  lessonRowDur:       { fontSize: 12, marginTop: 1 },
  activeDot:          { width: 8, height: 8, borderRadius: 4 },

  /* Certificate modal */
  certModal:          { flex: 1 },
  certModalHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  certModalTitle:     { fontSize: 17, fontWeight: '700' },
  certCloseBtn:       { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  certBody:           { padding: Spacing.four, gap: Spacing.three },
  certCard:           { borderRadius: 20, borderWidth: 1.5, overflow: 'hidden' },
  certTopBar:         { height: 8 },
  certInner:          { padding: Spacing.four, alignItems: 'center', gap: Spacing.two },
  certBadgeWrap:      { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.one },
  certIssuer:         { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  certCourseName:     { fontSize: 20, fontWeight: '800', textAlign: 'center', lineHeight: 26 },
  certDivider:        { width: 60, height: 2, borderRadius: 1, marginVertical: Spacing.one },
  certAwardedTo:      { fontSize: 12 },
  certProviderName:   { fontSize: 18, fontWeight: '700' },
  certFooterRow:      { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: Spacing.two },
  certFooterLabel:    { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  certFooterValue:    { fontSize: 14, fontWeight: '700', marginTop: 2 },
  shareBtn:           { borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  shareBtnText:       { color: '#fff', fontSize: 15, fontWeight: '700' },
});
