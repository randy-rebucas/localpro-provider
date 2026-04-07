import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getProviderProfile } from '@/api/auth';
import { addPortfolioItem, removePortfolioItem, type PortfolioItem } from '@/api/provider-profile';
import { Icon } from '@/components/icon';
import { Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const NUM_COLS = 2;

export default function PortfolioScreen() {
  const theme  = useTheme();
  const router = useRouter();
  const qc     = useQueryClient();
  const [title,    setTitle]    = useState('');
  const [desc,     setDesc]     = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Portfolio items are returned inside the main provider profile — no separate documented GET endpoint
  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['provider-profile'],
    queryFn:  getProviderProfile,
    staleTime: 1000 * 60 * 5,
  });
  const items: PortfolioItem[] = Array.isArray(profile?.portfolioItems)
    ? (profile!.portfolioItems as PortfolioItem[])
    : [];

  const addMutation = useMutation({
    mutationFn: () => addPortfolioItem({ title: title.trim(), description: desc.trim() || undefined, photoUri: photoUri! }),
    onSuccess: () => {
      setTitle(''); setDesc(''); setPhotoUri(null);
      qc.invalidateQueries({ queryKey: ['portfolio'] });
      qc.invalidateQueries({ queryKey: ['provider-profile'] });
    },
    onError: () => Alert.alert('Error', 'Could not upload portfolio item.'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removePortfolioItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio'] });
      qc.invalidateQueries({ queryKey: ['provider-profile'] });
    },
  });

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  const canAdd = title.trim().length > 0 && !!photoUri;
  const inputStyle = [styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Portfolio</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        numColumns={NUM_COLS}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={isLoading}
        onRefresh={refetch}
        ListHeaderComponent={
          <>
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              Showcase completed work to attract more clients. Add before/after photos of your jobs.
            </Text>

            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Add Portfolio Item</Text>
              <TextInput style={inputStyle} value={title} onChangeText={setTitle} placeholder="Title *" placeholderTextColor={theme.textSecondary} />
              <TextInput style={[inputStyle, styles.textarea]} value={desc} onChangeText={setDesc} placeholder="Description (optional)" placeholderTextColor={theme.textSecondary} multiline numberOfLines={3} />

              {/* Photo picker */}
              <Pressable style={[styles.photoPicker, { borderColor: Primary[300], backgroundColor: photoUri ? 'transparent' : theme.background }]} onPress={pickPhoto}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                ) : (
                  <>
                    <Icon name="image-outline" size={32} color={Primary[400]} />
                    <Text style={[styles.photoPickerText, { color: theme.textSecondary }]}>Tap to select photo</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[styles.addBtn, { backgroundColor: canAdd ? Primary[500] : theme.backgroundElement, opacity: canAdd ? 1 : 0.5 }]}
                onPress={() => addMutation.mutate()}
                disabled={!canAdd || addMutation.isPending}
              >
                <Icon name="cloud-upload-outline" size={18} color={canAdd ? '#fff' : theme.textSecondary} />
                <Text style={[styles.addBtnText, { color: canAdd ? '#fff' : theme.textSecondary }]}>
                  {addMutation.isPending ? 'Uploading…' : 'Add to Portfolio'}
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Your Work ({items.length})</Text>
          </>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Icon name="images-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No portfolio items yet.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }: { item: PortfolioItem }) => (
          <View style={[styles.gridItem, { backgroundColor: theme.backgroundElement }]}>
            <Image source={{ uri: item.photoUrl }} style={styles.gridImage} />
            <View style={styles.gridMeta}>
              <Text style={[styles.gridTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
              <Pressable
                onPress={() =>
                  Alert.alert('Remove', `Remove "${item.title}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => removeMutation.mutate(item._id) },
                  ])
                }
                hitSlop={8}
              >
                <Icon name="trash-outline" size={16} color={Status.error} />
              </Pressable>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:       { width: 32, alignItems: 'flex-start' },
  headerTitle:   { fontSize: 17, fontWeight: '700' },
  list:          { padding: Spacing.four, gap: Spacing.three, paddingBottom: 40 },
  hint:          { fontSize: 13, lineHeight: 18 },
  card:          { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  cardTitle:     { fontSize: 15, fontWeight: '700' },
  input:         { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textarea:      { minHeight: 80, textAlignVertical: 'top' },
  photoPicker:   { borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 6, overflow: 'hidden' },
  photoPreview:  { width: '100%', height: 140, borderRadius: 10 },
  photoPickerText: { fontSize: 13 },
  addBtn:        { borderRadius: 10, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 },
  addBtnText:    { fontSize: 14, fontWeight: '700' },
  sectionLabel:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  gridRow:       { gap: Spacing.two },
  gridItem:      { flex: 1, borderRadius: 14, overflow: 'hidden' },
  gridImage:     { width: '100%', height: 120 },
  gridMeta:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.two },
  gridTitle:     { fontSize: 13, fontWeight: '600', flex: 1 },
  empty:         { alignItems: 'center', paddingTop: 40, gap: Spacing.two },
  emptyText:     { fontSize: 14 },
});
