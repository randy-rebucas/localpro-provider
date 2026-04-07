import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getConsultations, type Consultation } from '@/api/consultations';
import { Icon, type IconName } from '@/components/icon';
import { CardSkeleton } from '@/components/loading-skeleton';
import { StatusChip } from '@/components/status-chip';
import { Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TABS = ['all', 'pending', 'accepted', 'completed'] as const;
type TabKey = (typeof TABS)[number];

const TYPE_ICON: Record<string, IconName> = {
  site_inspection: 'location-outline',
  chat:            'chatbubble-outline',
};

export default function ConsultationsScreen() {
  const theme  = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('all');

  const { data = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['consultations', tab],
    queryFn:  () => getConsultations(tab === 'all' ? undefined : { status: tab }),
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Consultations</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Tab strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabStrip}>
        {TABS.map((t) => (
          <Pressable
            key={t}
            style={[styles.tabBtn, t === tab && { borderBottomColor: Primary[500], borderBottomWidth: 2 }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, { color: t === tab ? Primary[500] : theme.textSecondary }]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Primary[500]} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="calendar-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No consultations</Text>
              <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
                Consultation requests from clients will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }: { item: Consultation }) => (
            <Pressable
              style={[styles.card, { backgroundColor: theme.backgroundElement }]}
              onPress={() => router.push(`/(app)/consultations/${item._id}`)}
            >
              <View style={styles.cardTop}>
                <View style={[styles.typeIcon, { backgroundColor: Primary[50] }]}>
                  <Icon name={TYPE_ICON[item.type] ?? 'calendar-outline'} size={20} color={Primary[500]} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                  <Text style={[styles.cardType, { color: theme.textSecondary }]}>
                    {item.type === 'site_inspection' ? 'Site Inspection' : 'Chat Consultation'}
                  </Text>
                </View>
                <StatusChip status={item.status} />
              </View>
              {item.description ? (
                <Text style={[styles.cardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
              <View style={styles.cardMeta}>
                <Text style={[styles.cardDate, { color: theme.textSecondary }]}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
                {item.estimateAmount != null && (
                  <Text style={[styles.cardEstimate, { color: Primary[500] }]}>
                    Est: ₱{item.estimateAmount.toLocaleString()}
                  </Text>
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
  safe:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:     { width: 32, alignItems: 'flex-start' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700' },
  tabStrip:    { paddingHorizontal: Spacing.four, paddingVertical: Spacing.one, gap: Spacing.two },
  tabBtn:      { paddingHorizontal: Spacing.two, paddingVertical: Spacing.two },
  tabText:     { fontSize: 14, fontWeight: '600' },
  skeletons:   { padding: Spacing.four, gap: Spacing.three },
  list:        { padding: Spacing.four, gap: Spacing.two, paddingBottom: 32 },
  card:        { borderRadius: 14, padding: Spacing.three, gap: Spacing.two },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  typeIcon:    { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardTitle:   { fontSize: 15, fontWeight: '700' },
  cardType:    { fontSize: 12 },
  cardDesc:    { fontSize: 13, lineHeight: 18 },
  cardMeta:    { flexDirection: 'row', justifyContent: 'space-between' },
  cardDate:    { fontSize: 12 },
  cardEstimate:{ fontSize: 13, fontWeight: '600' },
  empty:       { alignItems: 'center', paddingTop: 60, gap: Spacing.two },
  emptyTitle:  { fontSize: 18, fontWeight: '700' },
  emptyHint:   { fontSize: 14, textAlign: 'center' },
});
