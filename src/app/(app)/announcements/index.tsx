import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getAnnouncements, type Announcement } from '@/api/announcements';
import { Icon, type IconName } from '@/components/icon';
import { CardSkeleton } from '@/components/loading-skeleton';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TYPE_CONFIG: Record<string, { icon: IconName; color: string; bg: string }> = {
  info:    { icon: 'information-circle-outline', color: Status.info,    bg: Status.infoBg },
  warning: { icon: 'warning-outline',            color: Status.warning, bg: Status.warningBg },
  success: { icon: 'checkmark-circle-outline',   color: Status.success, bg: Status.successBg },
  danger:  { icon: 'alert-circle-outline',       color: Status.error,   bg: Status.errorBg },
};

export default function AnnouncementsScreen() {
  const theme  = useTheme();
  const router = useRouter();

  const { data: announcements = [], isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['announcements'],
    queryFn:  getAnnouncements,
    staleTime: 1000 * 60 * 5,
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Announcements</Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </View>
      ) : isError ? (
        <View style={styles.empty}>
          <Icon name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Couldn't load announcements</Text>
          <Pressable onPress={() => refetch()} style={styles.retryRow}>
            <Icon name="refresh-outline" size={14} color={Primary[500]} />
            <Text style={[styles.retryText, { color: Primary[500] }]}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Primary[500]} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="megaphone-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No announcements</Text>
              <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
                Platform updates and announcements will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }: { item: Announcement }) => {
            const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.info;
            return (
              <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
                  <Icon name={cfg.icon} size={22} color={cfg.color} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
                  <Text style={[styles.cardMsg, { color: theme.textSecondary }]}>{item.message}</Text>
                  <Text style={[styles.cardDate, { color: theme.textSecondary }]}>
                    {(() => { const d = new Date(item.createdAt); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(); })()}
                  </Text>
                </View>
              </View>
            );
          }}
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
  skeletons:   { padding: Spacing.four, gap: Spacing.three },
  list:        { padding: Spacing.four, gap: Spacing.two, paddingBottom: BottomTabInset + 16 },
  retryRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  retryText:   { fontSize: 14, fontWeight: '600' },
  card:        { borderRadius: 14, padding: Spacing.three, flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  iconWrap:    { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardTitle:   { fontSize: 15, fontWeight: '700' },
  cardMsg:     { fontSize: 13, lineHeight: 18 },
  cardDate:    { fontSize: 12 },
  empty:       { alignItems: 'center', paddingTop: 60, gap: Spacing.two },
  emptyTitle:  { fontSize: 18, fontWeight: '700' },
  emptyHint:   { fontSize: 14, textAlign: 'center' },
});
