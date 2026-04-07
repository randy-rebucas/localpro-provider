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
import { CardSkeleton } from '@/components/loading-skeleton';
import { Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const CATEGORIES = ['All', 'Electrical', 'Plumbing', 'Carpentry', 'Painting', 'Cleaning', 'HVAC', 'Other'];

function TagChip({ tag }: { tag: string }) {
  const color =
    tag === 'PESO'      ? Status.info :
    tag === 'LGU'       ? Status.success :
    tag === 'Emergency' ? Status.error : Status.warning;
  const bg =
    tag === 'PESO'      ? Status.infoBg :
    tag === 'LGU'       ? Status.successBg :
    tag === 'Emergency' ? Status.errorBg : Status.warningBg;
  return (
    <View style={[styles.tagChip, { backgroundColor: bg }]}>
      <Text style={[styles.tagText, { color }]}>{tag}</Text>
    </View>
  );
}

function JobCard({ job, onPress }: { job: Job; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable style={[styles.card, { backgroundColor: theme.backgroundElement }]} onPress={onPress}>
      {job.isPriority && (
        <View style={styles.priorityBadge}>
          <Text style={styles.priorityText}>⭐ Priority</Text>
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
      <Text style={[styles.location, { color: theme.textSecondary }]} numberOfLines={1}>
        📍 {job.location}
      </Text>

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

  const filtered = jobs.filter((j) =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.location.toLowerCase().includes(search.toLowerCase()),
  );

  const sorted = [...filtered].sort((a, b) => (b.isPriority ? 1 : 0) - (a.isPriority ? 1 : 0));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.heading, { color: theme.text }]}>Marketplace</Text>
        <Pressable
          style={[styles.aiToggle, { backgroundColor: aiRank ? Primary[500] : theme.backgroundElement }]}
          onPress={() => setAiRank((v) => !v)}
        >
          <Text style={[styles.aiToggleText, { color: aiRank ? '#fff' : theme.textSecondary }]}>
            ✨ AI Rank
          </Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: theme.backgroundElement }]}>
        <Text style={styles.searchIcon}>🔍</Text>
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
        contentContainerStyle={styles.categories}
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[
              styles.catChip,
              { backgroundColor: cat === category ? Primary[500] : theme.backgroundElement },
            ]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.catText, { color: cat === category ? '#fff' : theme.textSecondary }]}>
              {cat}
            </Text>
          </Pressable>
        ))}
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
              <Text style={styles.emptyEmoji}>📭</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  heading: { fontSize: 24, fontWeight: '700' },
  aiToggle: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  aiToggleText: { fontSize: 13, fontWeight: '600' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.four,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  searchIcon: { fontSize: 16, marginRight: Spacing.two },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: Spacing.two + 2 },
  categories: { paddingHorizontal: Spacing.four, gap: Spacing.two, paddingBottom: Spacing.two },
  catChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  catText: { fontSize: 13, fontWeight: '500' },
  list: { padding: Spacing.four, gap: Spacing.three, paddingBottom: 32 },
  skeletons: { padding: Spacing.four, gap: Spacing.three },
  card: { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  priorityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  priorityText: { fontSize: 11, fontWeight: '700', color: '#D97706' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.two },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  budget: { fontSize: 16, fontWeight: '700' },
  category: { fontSize: 13 },
  location: { fontSize: 13 },
  tagRow: { flexDirection: 'row', gap: Spacing.one, flexWrap: 'wrap' },
  tagChip: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 11, fontWeight: '700' },
  dateText: { fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.two },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center' },
});
