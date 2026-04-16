import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { deleteQuoteTemplate, getQuoteTemplates, type QuoteTemplate } from '@/api/quote-templates';
import { Icon } from '@/components/icon';
import { CardSkeleton } from '@/components/loading-skeleton';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function QuoteTemplatesScreen() {
  const theme  = useTheme();
  const router = useRouter();
  const qc     = useQueryClient();

  const { data: templates = [], isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['quote-templates'],
    queryFn:  getQuoteTemplates,
    staleTime: 1000 * 60 * 5,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteQuoteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quote-templates'] }),
    onError: () => Alert.alert('Error', 'Could not delete template.'),
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Quote Templates</Text>
        <Pressable onPress={() => router.push('/(app)/quote-templates/new')} hitSlop={8}>
          <Icon name="add-circle-outline" size={26} color={Primary[500]} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={[styles.skeletons, { paddingBottom: BottomTabInset + 16 }]}>
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </View>
      ) : isError ? (
        <View style={styles.errorState}>
          <View style={[styles.errorIconWrap, { backgroundColor: '#fee2e2' }]}>
            <Icon name="alert-circle-outline" size={36} color="#ef4444" />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Couldn't load templates</Text>
          <Pressable style={[styles.createBtn, { backgroundColor: Primary[500] }]} onPress={() => refetch()}>
            <Icon name="refresh-outline" size={18} color="#fff" />
            <Text style={styles.createBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Primary[500]} />}
          ListHeaderComponent={
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              Save reusable quote templates to speed up bidding. Max 20 templates.
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="document-text-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No templates yet</Text>
              <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
                Create reusable quote templates for common job types.
              </Text>
              <Pressable
                style={[styles.createBtn, { backgroundColor: Primary[500] }]}
                onPress={() => router.push('/(app)/quote-templates/new')}
              >
                <Icon name="add" size={18} color="#fff" />
                <Text style={styles.createBtnText}>Create Template</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }: { item: QuoteTemplate }) => (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardName, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[styles.cardTimeline, { color: theme.textSecondary }]}>{item.timeline}</Text>
                </View>
                <Text style={[styles.cardTotal, { color: Primary[500] }]}>
                  ₱{(item.laborCost + item.materialsCost).toLocaleString()}
                </Text>
              </View>

              <View style={styles.costRow}>
                <Text style={[styles.costLabel, { color: theme.textSecondary }]}>Labor: ₱{item.laborCost.toLocaleString()}</Text>
                <Text style={[styles.costLabel, { color: theme.textSecondary }]}>Materials: ₱{item.materialsCost.toLocaleString()}</Text>
              </View>

              {item.notes ? (
                <Text style={[styles.cardNotes, { color: theme.textSecondary }]} numberOfLines={2}>
                  {item.notes}
                </Text>
              ) : null}

              <View style={styles.cardActions}>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: Primary[50] }]}
                  onPress={() => router.push(`/(app)/quote-templates/${item._id}/edit`)}
                >
                  <Icon name="pencil-outline" size={15} color={Primary[600]} />
                  <Text style={[styles.actionText, { color: Primary[600] }]}>Edit</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: Status.errorBg }]}
                  onPress={() =>
                    Alert.alert('Delete Template', `Delete "${item.name}"?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(item._id) },
                    ])
                  }
                >
                  <Icon name="trash-outline" size={15} color={Status.error} />
                  <Text style={[styles.actionText, { color: Status.error }]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:       { width: 32, alignItems: 'flex-start' },
  headerTitle:   { flex: 1, fontSize: 17, fontWeight: '700' },
  skeletons:     { padding: Spacing.four, gap: Spacing.three },
  list:          { padding: Spacing.four, gap: Spacing.three, paddingBottom: BottomTabInset + 16 },
  errorState:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.five },
  errorIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  hint:          { fontSize: 13, lineHeight: 18 },
  card:          { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  cardTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName:      { fontSize: 16, fontWeight: '700' },
  cardTimeline:  { fontSize: 13 },
  cardTotal:     { fontSize: 18, fontWeight: '800' },
  costRow:       { flexDirection: 'row', gap: Spacing.three },
  costLabel:     { fontSize: 13 },
  cardNotes:     { fontSize: 13, lineHeight: 18 },
  cardActions:   { flexDirection: 'row', gap: Spacing.two, marginTop: 4 },
  actionBtn:     { flex: 1, borderRadius: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionText:    { fontSize: 13, fontWeight: '700' },
  empty:         { alignItems: 'center', paddingTop: 60, gap: Spacing.two },
  emptyTitle:    { fontSize: 18, fontWeight: '700' },
  emptyHint:     { fontSize: 14, textAlign: 'center' },
  createBtn:     { borderRadius: 14, paddingVertical: 12, paddingHorizontal: Spacing.four, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.two },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
