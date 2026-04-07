import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getJobs, type Job } from '@/api/jobs';
import { AppHeader } from '@/components/app-header';
import { Icon } from '@/components/icon';
import { CardSkeleton } from '@/components/loading-skeleton';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const CATEGORIES: { label: string; icon: string }[] = [
  { label: 'All',        icon: 'grid-outline' },
  { label: 'Electrical', icon: 'flash-outline' },
  { label: 'Plumbing',   icon: 'water-outline' },
  { label: 'Carpentry',  icon: 'hammer-outline' },
  { label: 'Painting',   icon: 'color-palette-outline' },
  { label: 'Cleaning',   icon: 'sparkles-outline' },
  { label: 'HVAC',       icon: 'thermometer-outline' },
  { label: 'Other',      icon: 'ellipsis-horizontal-outline' },
];

const TAG_META: Record<string, { color: string; bg: string; icon: string }> = {
  PESO:      { color: Status.info,    bg: Status.infoBg,    icon: 'shield-checkmark-outline' },
  LGU:       { color: Status.success, bg: Status.successBg, icon: 'business-outline' },
  Emergency: { color: Status.error,   bg: Status.errorBg,   icon: 'flash-outline' },
};

function TagChip({ tag }: { tag: string }) {
  const c = TAG_META[tag] ?? { color: Status.warning, bg: Status.warningBg, icon: 'pricetag-outline' };
  return (
    <View style={[styles.tagChip, { backgroundColor: c.bg, borderColor: c.color }]}>
      <Icon name={c.icon as any} size={11} color={c.color} />
      <Text style={[styles.tagText, { color: c.color }]}>{tag}</Text>
    </View>
  );
}

function JobCard({ job, onPress }: { job: Job; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable style={[styles.card, { backgroundColor: theme.backgroundElement }]} onPress={onPress}>
      {job.isPriority && (
        <View style={[styles.priorityBadge, { backgroundColor: '#FEF3C7' }]}>
          <Icon name="star" size={12} color="#D97706" />
          <Text style={styles.priorityText}>Priority</Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
          {job.title}
        </Text>
        <Text style={[styles.budget, { color: Primary[500] }]}>
          ₱{job.budget.toLocaleString()}
        </Text>
      </View>

      <Text style={[styles.category, { color: theme.textSecondary }]}>{job.category}</Text>

      <View style={styles.locationRow}>
        <Icon name="location-outline" size={13} color={theme.textSecondary} />
        <Text style={[styles.location, { color: theme.textSecondary }]} numberOfLines={1}>
          {job.location}
        </Text>
      </View>

      {job.jobTags.length > 0 && (
        <View style={styles.tagRow}>
          {job.jobTags.map((tag) => <TagChip key={tag} tag={tag} />)}
        </View>
      )}

      <Text style={[styles.dateText, { color: theme.textSecondary }]}>
        Posted {new Date(job.createdAt).toLocaleDateString()}
      </Text>
    </Pressable>
  );
}

export default function MarketplaceScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [aiRank, setAiRank] = useState(false);

  const { data: rawJobs, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['jobs', { category, aiRank }],
    queryFn: () =>
      getJobs({
        status: 'open',
        category: category !== 'All' ? category : undefined,
        aiRank,
      }),
  });

  const jobs: Job[] = Array.isArray(rawJobs) ? rawJobs : [];

  const filtered = jobs.filter(
    (j) =>
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.location.toLowerCase().includes(search.toLowerCase()),
  );
  const sorted = [...filtered].sort((a, b) => (b.isPriority ? 1 : 0) - (a.isPriority ? 1 : 0));

  const activeCount = category !== 'All'
    ? sorted.length
    : undefined;

  const aiToggle = (
    <Pressable
      style={[styles.aiToggle, { backgroundColor: aiRank ? Primary[500] : theme.backgroundElement }]}
      onPress={() => setAiRank((v) => !v)}
    >
      <Icon name="flash" size={14} color={aiRank ? '#fff' : theme.textSecondary} />
      <Text style={[styles.aiToggleText, { color: aiRank ? '#fff' : theme.textSecondary }]}>
        AI Rank
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <AppHeader title="Marketplace" right={aiToggle} />

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: theme.backgroundElement }]}>
        <Icon name="search-outline" size={16} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search jobs or location…"
          placeholderTextColor={theme.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categories}
      >
        {CATEGORIES.map(({ label, icon }) => {
          const active = label === category;
          return (
            <Pressable
              key={label}
              style={[styles.catChip, active && styles.catChipActive]}
              onPress={() => setCategory(label)}
            >
              <Icon
                name={icon as any}
                size={14}
                color={active ? Primary[600] : theme.textSecondary}
              />
              <Text style={[styles.catText, { color: active ? Primary[600] : theme.textSecondary }]}>
                {label}
              </Text>
              {active && <View style={styles.catDot} />}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* List */}
      {isLoading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => <CardSkeleton key={i} style={{ marginHorizontal: Spacing.four }} />)}
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Primary[500]} />
          }
          renderItem={({ item }) => (
            <JobCard job={item} onPress={() => router.push(`/(app)/marketplace/${item._id}`)} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="search-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No open jobs</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Pull to refresh or try a different category.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  aiToggle: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  aiToggleText: { fontSize: 13, fontWeight: '600' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.four,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    gap: Spacing.two,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: Spacing.two + 2 },
  categoriesScroll: {
    flexGrow:  0,          // prevent ScrollView from expanding vertically
    height:    44,
  },
  categories: {
    paddingHorizontal: Spacing.four,
    gap:               8,
    alignItems:        'center',
    paddingVertical:   4,
  },
  catChip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
    borderRadius:      20,
    paddingHorizontal: 12,
    paddingVertical:   5,
    backgroundColor:   'transparent',
    borderWidth:       1.5,
    borderColor:       'transparent',
  },
  catChipActive: {
    backgroundColor: Primary[50],
    borderColor:     Primary[200],
  },
  catDot: {
    width:           6,
    height:          6,
    borderRadius:    3,
    backgroundColor: Primary[500],
    marginLeft:      1,
  },
  catText: { fontSize: 13, fontWeight: '600' },
  list: { padding: Spacing.four, gap: Spacing.three, paddingBottom: BottomTabInset },
  skeletons: { padding: Spacing.four, gap: Spacing.three },
  card: { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  priorityBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  priorityText: { fontSize: 11, fontWeight: '700', color: '#D97706' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.two },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  budget: { fontSize: 16, fontWeight: '700' },
  category: { fontSize: 13 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { fontSize: 13, flex: 1 },
  tagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  tagChip: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              4,
    borderRadius:     100,
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderWidth:      1,
    borderColor:      'transparent',
  },
  tagText: { fontSize: 11, fontWeight: '700' },
  dateText: { fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.two },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center' },
});
