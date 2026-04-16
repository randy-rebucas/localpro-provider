/**
 * Training Hub — Course List
 * Docs: provider-training-mobile.md
 *
 * GET /api/provider/training              — course list
 * GET /api/provider/training/enrollments  — my enrollments
 */
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getCourses,
  getEnrollments,
  type Course,
  type CourseCategory,
  type Enrollment,
} from '@/api/provider-profile';
import { Icon } from '@/components/icon';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/* ─── Constants ─────────────────────────────────────────────────────── */

export const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  all:           { label: 'All',           icon: 'apps-outline',       color: Primary[500] },
  basic:         { label: 'Basic',         icon: 'school-outline',     color: '#3b82f6'    },
  advanced:      { label: 'Advanced',      icon: 'construct-outline',  color: '#8b5cf6'    },
  safety:        { label: 'Safety',        icon: 'shield-outline',     color: '#f59e0b'    },
  custom:        { label: 'Specialty',     icon: 'star-outline',       color: '#10b981'    },
  certification: { label: 'Certification', icon: 'ribbon-outline',     color: '#ef4444'    },
};

const CATEGORIES = ['all', 'basic', 'advanced', 'safety', 'custom', 'certification'] as const;

function catColor(cat: string) {
  return CATEGORY_META[cat]?.color ?? Primary[500];
}

/* ─── Enrolled course row (My Courses) ──────────────────────────────── */
function EnrolledRow({ course, enrollment, onPress }: { course: Course; enrollment: Enrollment; onPress: () => void }) {
  const theme     = useTheme();
  const completed = enrollment.status === 'completed';
  const total     = course.lessons?.length ?? 1;
  const done      = enrollment.completedLessons.length;
  const pct       = completed ? 100 : Math.round((done / total) * 100);
  const color     = catColor(course.category);

  return (
    <Pressable
      style={[styles.enrolledRow, { backgroundColor: theme.backgroundElement }]}
      onPress={onPress}
    >
      <View style={[styles.enrolledIcon, { backgroundColor: color + '18' }]}>
        <Icon name={completed ? 'checkmark-circle' : 'play-circle-outline'} size={22} color={completed ? Status.success : color} />
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={[styles.enrolledTitle, { color: theme.text }]} numberOfLines={1}>{course.title}</Text>
        {completed ? (
          <Text style={[styles.enrolledSub, { color: Status.success }]}>Completed · Badge earned ✓</Text>
        ) : (
          <>
            <View style={[styles.miniTrack, { backgroundColor: color + '20' }]}>
              <View style={[styles.miniFill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
            <Text style={[styles.enrolledSub, { color: theme.textSecondary }]}>{done}/{total} lessons · {pct}%</Text>
          </>
        )}
      </View>
      <Icon name="chevron-forward" size={16} color={theme.textSecondary} />
    </Pressable>
  );
}

/* ─── Available course card ──────────────────────────────────────────── */
function CourseCard({ item, onPress }: { item: Course; onPress: () => void }) {
  const theme   = useTheme();
  const color   = catColor(item.category);
  const catMeta = CATEGORY_META[item.category];
  const hours   = (item.durationMinutes / 60).toFixed(1).replace(/\.0$/, '');
  const lessonCount = item.lessons?.length ?? 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.courseCard, { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.9 : 1 }]}
      onPress={onPress}
    >
      {/* Top accent bar */}
      <View style={[styles.cardAccent, { backgroundColor: color }]} />

      <View style={styles.cardBody}>
        {/* Header row */}
        <View style={styles.cardTop}>
          <View style={[styles.catBadge, { backgroundColor: color + '18' }]}>
            <Icon name={catMeta?.icon as any ?? 'school-outline'} size={12} color={color} />
            <Text style={[styles.catBadgeText, { color }]}>{catMeta?.label ?? item.category}</Text>
          </View>
          <View style={[styles.pricePill, { backgroundColor: item.price === 0 ? Status.successBg : Primary[50] }]}>
            <Text style={[styles.priceText, { color: item.price === 0 ? Status.success : Primary[600] }]}>
              {item.price === 0 ? 'Free' : `₱${item.price.toLocaleString()}`}
            </Text>
          </View>
        </View>

        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>{item.title}</Text>
        <Text style={[styles.cardDesc, { color: theme.textSecondary }]} numberOfLines={2}>{item.description}</Text>

        {/* Meta row */}
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Icon name="book-outline" size={13} color={theme.textSecondary} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>{lessonCount} lessons</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Icon name="time-outline" size={13} color={theme.textSecondary} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>{hours}h</Text>
          </View>
          {(item.enrollmentCount ?? 0) > 0 && (
            <>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Icon name="people-outline" size={13} color={theme.textSecondary} />
                <Text style={[styles.metaText, { color: theme.textSecondary }]}>{item.enrollmentCount}</Text>
              </View>
            </>
          )}
        </View>

        {/* CTA */}
        <View style={[styles.cardCta, { backgroundColor: color }]}>
          <Text style={styles.cardCtaText}>
            {item.price === 0 ? 'Enroll Free' : 'View Course'}
          </Text>
          <Icon name="arrow-forward" size={14} color="#fff" />
        </View>
      </View>
    </Pressable>
  );
}

/* ─── Screen ─────────────────────────────────────────────────────────── */
export default function TrainingScreen() {
  const theme  = useTheme();
  const router = useRouter();
  const [category, setCategory] = useState<string>('all');

  const { data: courses = [], isLoading, refetch } = useQuery({
    queryKey: ['courses', category],
    queryFn:  () => getCourses(category === 'all' ? undefined : category as CourseCategory),
    staleTime: 1000 * 60 * 5,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments'],
    queryFn:  getEnrollments,
    staleTime: 1000 * 60 * 5,
  });

  // Build enrollment map keyed by courseId string
  const enrollmentMap: Record<string, Enrollment> = {};
  for (const e of enrollments) {
    const cid = typeof e.courseId === 'string' ? e.courseId : (e.courseId as Course)._id;
    enrollmentMap[cid] = e;
  }

  const inProgress  = enrollments.filter((e) => e.status === 'enrolled');
  const completed   = enrollments.filter((e) => e.status === 'completed');

  // Available courses exclude already enrolled
  const available = courses.filter((c) => !enrollmentMap[c._id]);

  function navToCourse(id: string) {
    router.push(`/(app)/profile/training/${id}` as any);
  }

  // Build course lookup from courses list for enrolled rows
  const courseMap: Record<string, Course> = {};
  for (const c of courses) courseMap[c._id] = c;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Training & Courses</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={available}
        keyExtractor={(item) => item._id}
        numColumns={1}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={isLoading}
        onRefresh={refetch}
        renderItem={({ item }) => (
          <CourseCard item={item} onPress={() => navToCourse(item._id)} />
        )}
        ListHeaderComponent={
          <>
            {/* ── Summary chips ─────────────────────────────── */}
            {(completed.length > 0 || inProgress.length > 0) && (
              <View style={styles.summaryRow}>
                {completed.length > 0 && (
                  <View style={[styles.summaryChip, { backgroundColor: Status.successBg }]}>
                    <Icon name="ribbon" size={15} color={Status.success} />
                    <Text style={[styles.summaryText, { color: Status.success }]}>
                      {completed.length} badge{completed.length > 1 ? 's' : ''} earned
                    </Text>
                  </View>
                )}
                {inProgress.length > 0 && (
                  <View style={[styles.summaryChip, { backgroundColor: Primary[50] }]}>
                    <Icon name="play-circle" size={15} color={Primary[500]} />
                    <Text style={[styles.summaryText, { color: Primary[600] }]}>
                      {inProgress.length} in progress
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* ── My Courses (in progress) ───────────────────── */}
            {inProgress.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: Spacing.three }]}>MY COURSES</Text>
                <View style={styles.enrolledList}>
                  {inProgress.map((e) => {
                    const cid = typeof e.courseId === 'string' ? e.courseId : (e.courseId as Course)._id;
                    const course = courseMap[cid] ?? { _id: cid, title: e.courseTitle, lessons: [], category: 'basic', price: 0, durationMinutes: 0, badgeSlug: '', slug: '', description: '', enrollmentCount: 0 } as Course;
                    return <EnrolledRow key={e._id} course={course} enrollment={e} onPress={() => navToCourse(cid)} />;
                  })}
                </View>
              </>
            )}

            {/* ── Certificates ──────────────────────────────── */}
            {completed.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: Spacing.three }]}>MY CERTIFICATES</Text>
                <View style={styles.certGrid}>
                  {completed.map((e) => {
                    const cid = typeof e.courseId === 'string' ? e.courseId : (e.courseId as Course)._id;
                    const course = courseMap[cid];
                    const color = catColor(course?.category ?? 'basic');
                    return (
                      <Pressable
                        key={e._id}
                        style={[styles.certCard, { backgroundColor: theme.backgroundElement, borderColor: color + '40' }]}
                        onPress={() => navToCourse(cid)}
                      >
                        <View style={[styles.certIcon, { backgroundColor: color + '18' }]}>
                          <Icon name="ribbon" size={20} color={color} />
                        </View>
                        <Text style={[styles.certTitle, { color: theme.text }]} numberOfLines={2}>
                          {e.courseTitle}
                        </Text>
                        <Text style={[styles.certDate, { color: theme.textSecondary }]}>
                          {e.completedAt ? new Date(e.completedAt).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' }) : ''}
                        </Text>
                        <View style={[styles.certViewBtn, { backgroundColor: color }]}>
                          <Text style={styles.certViewText}>View Certificate</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {/* ── Category filter ──────────────────────────── */}
            <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: Spacing.three }]}>BROWSE COURSES</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catScroll}
            >
              {CATEGORIES.map((cat) => {
                const meta   = CATEGORY_META[cat];
                const active = cat === category;
                return (
                  <Pressable
                    key={cat}
                    style={[styles.catChip, {
                      backgroundColor: active ? meta.color : theme.backgroundElement,
                      borderColor: active ? meta.color : 'transparent',
                    }]}
                    onPress={() => setCategory(cat)}
                  >
                    <Icon name={meta.icon as any} size={14} color={active ? '#fff' : theme.textSecondary} />
                    <Text style={[styles.catChipText, { color: active ? '#fff' : theme.text }]}>{meta.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {available.length > 0 && (
              <Text style={[styles.countLabel, { color: theme.textSecondary, marginTop: Spacing.three }]}>
                {available.length} course{available.length !== 1 ? 's' : ''} available
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={[styles.emptyIconWrap, { backgroundColor: Primary[50] }]}>
                <Icon name="book-outline" size={32} color={Primary[400]} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {courses.length > 0 ? 'All courses enrolled!' : 'No courses yet'}
              </Text>
              <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
                {courses.length > 0
                  ? 'Check back for new courses or try a different category.'
                  : 'Training courses will appear here once published.'}
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe:           { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:        { width: 32, alignItems: 'flex-start' },
  headerTitle:    { fontSize: 17, fontWeight: '700' },
  list:           { padding: Spacing.four, gap: Spacing.four, paddingBottom: BottomTabInset + 24 },

  /* Summary */
  summaryRow:     { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  summaryChip:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  summaryText:    { fontSize: 13, fontWeight: '700' },

  /* Section label */
  sectionLabel:   { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 6, marginBottom: 6 },

  /* Enrolled rows */
  enrolledList:   { gap: StyleSheet.hairlineWidth, borderRadius: 16, overflow: 'hidden' },
  enrolledRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  enrolledIcon:   { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  enrolledTitle:  { fontSize: 14, fontWeight: '600' },
  enrolledSub:    { fontSize: 12, marginTop: 2 },
  miniTrack:      { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  miniFill:       { height: 4, borderRadius: 2 },

  /* Certificate grid */
  certGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  certCard:       { flex: 1, minWidth: '44%', borderRadius: 16, padding: Spacing.three, gap: Spacing.two, borderWidth: 1.5 },
  certIcon:       { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  certTitle:      { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  certDate:       { fontSize: 11 },
  certViewBtn:    { borderRadius: 10, paddingVertical: 8, alignItems: 'center', marginTop: 2 },
  certViewText:   { color: '#fff', fontSize: 11, fontWeight: '700' },

  /* Category filter */
  catScroll:      { gap: Spacing.two, paddingVertical: 2 },
  catChip:        { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1.5 },
  catChipText:    { fontSize: 13, fontWeight: '600' },
  countLabel:     { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: 4, marginBottom: 4 },

  /* Course card */
  courseCard:     { borderRadius: 20, overflow: 'hidden' },
  cardAccent:     { height: 5 },
  cardBody:       { padding: Spacing.four, gap: Spacing.three },
  cardTop:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catBadge:       { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  catBadgeText:   { fontSize: 11, fontWeight: '700' },
  pricePill:      { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  priceText:      { fontSize: 12, fontWeight: '800' },
  cardTitle:      { fontSize: 16, fontWeight: '800', lineHeight: 23 },
  cardDesc:       { fontSize: 13, lineHeight: 20 },
  cardMeta:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaItem:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:       { fontSize: 12 },
  metaDivider:    { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#ccc' },
  cardCta:        { borderRadius: 13, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  cardCtaText:    { color: '#fff', fontSize: 14, fontWeight: '700' },

  /* Empty */
  emptyCard:      { borderRadius: 18, padding: Spacing.five, alignItems: 'center', gap: Spacing.three },
  emptyIconWrap:  { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:     { fontSize: 17, fontWeight: '700' },
  emptyHint:      { fontSize: 14, textAlign: 'center', lineHeight: 21 },
});
