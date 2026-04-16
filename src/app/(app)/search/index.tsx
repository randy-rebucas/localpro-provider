import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api/client';
import { type Job } from '@/api/jobs';
import { AppHeader } from '@/components/app-header';
import { Icon } from '@/components/icon';
import { CardSkeleton } from '@/components/loading-skeleton';
import { Primary, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface SearchResult { type: 'job' | 'user' | 'provider'; [key: string]: any }

async function searchJobs(q: string): Promise<Job[]> {
  const { data } = await api.get<{ results: SearchResult[] }>('/api/search', { params: { q } });
  return (data.results ?? []).filter((r) => r.type === 'job') as unknown as Job[];
}

export default function SearchScreen() {
  const theme  = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const trimmed = query.trim();
  const { data: results, isLoading } = useQuery({
    queryKey: ['search', trimmed],
    queryFn:  () => searchJobs(trimmed),
    staleTime: 1000 * 60,
    enabled: trimmed.length >= 2,
  });

  const filtered: Job[] = results ?? [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <AppHeader title="Search" />

      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: theme.backgroundElement }]}>
        <Icon name="search-outline" size={18} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          value={query}
          onChangeText={setQuery}
          placeholder="Search jobs, categories, locations…"
          placeholderTextColor={theme.textSecondary}
          autoFocus
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Icon name="close-circle" size={18} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>

      {trimmed.length < 2 ? (
        <View style={styles.empty}>
          <Icon name="search-outline" size={48} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Search LocalPro</Text>
          <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
            Type at least 2 characters to search jobs, providers, and more.
          </Text>
        </View>
      ) : isLoading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.resultCount, { color: theme.textSecondary }]}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{trimmed}"
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="search-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No results found</Text>
              <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
                Try a different keyword or category.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, { backgroundColor: theme.backgroundElement }]}
              onPress={() => router.push(`/(app)/marketplace/${item._id}`)}
            >
              <View style={styles.cardTop}>
                <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={[styles.cardBudget, { color: Primary[500] }]}>
                  ₱{item.budget.toLocaleString()}
                </Text>
              </View>
              <Text style={[styles.cardCat, { color: theme.textSecondary }]}>{item.category}</Text>
              <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                  <Icon name="location-outline" size={13} color={theme.textSecondary} />
                  <Text style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.location}
                  </Text>
                </View>
                {item.isPriority && (
                  <View style={[styles.priorityBadge, { backgroundColor: '#FEF3C7' }]}>
                    <Icon name="star" size={11} color="#D97706" />
                    <Text style={styles.priorityText}>Priority</Text>
                  </View>
                )}
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  searchBar:     { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.four, marginVertical: Spacing.two, borderRadius: 12, paddingHorizontal: 14, gap: Spacing.two },
  searchInput:   { flex: 1, fontSize: 15, paddingVertical: 12 },
  skeletons:     { padding: Spacing.four, gap: Spacing.three },
  list:          { padding: Spacing.four, gap: Spacing.two, paddingBottom: 32 },
  resultCount:   { fontSize: 13, marginBottom: Spacing.two },
  card:          { borderRadius: 14, padding: Spacing.three, gap: Spacing.one },
  cardTop:       { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  cardTitle:     { flex: 1, fontSize: 15, fontWeight: '700' },
  cardBudget:    { fontSize: 15, fontWeight: '700' },
  cardCat:       { fontSize: 13 },
  cardMeta:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  metaItem:      { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  metaText:      { fontSize: 13 },
  priorityBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 3 },
  priorityText:  { fontSize: 11, fontWeight: '700', color: '#D97706' },
  empty:         { alignItems: 'center', paddingTop: 60, gap: Spacing.two },
  emptyTitle:    { fontSize: 18, fontWeight: '700' },
  emptyHint:     { fontSize: 14, textAlign: 'center' },
});
