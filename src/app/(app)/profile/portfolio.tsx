/**
 * Portfolio
 * Docs: mobile-provider-profile-api.md §3, §4
 *
 * Add:    POST /api/upload (folder: "portfolio") → get Cloudinary URL
 *         PUT  /api/providers/profile { portfolioItems: [...] }
 * Remove: PUT  /api/providers/profile { portfolioItems: [...without item...] }
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
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
import { updateProviderProfile, uploadFile, type PortfolioItem } from '@/api/provider-profile';
import { Icon } from '@/components/icon';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const NUM_COLS = 2;

export default function PortfolioScreen() {
  const theme  = useTheme();
  const router = useRouter();
  const qc     = useQueryClient();

  const [title,      setTitle]      = useState('');
  const [desc,       setDesc]       = useState('');
  const [photoUri,   setPhotoUri]   = useState<string | null>(null);
  const [photoMime,  setPhotoMime]  = useState('image/jpeg');
  const [uploading,  setUploading]  = useState(false);

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['provider-profile'],
    queryFn:  getProviderProfile,
    staleTime: 1000 * 60 * 5,
  });

  const items: PortfolioItem[] = Array.isArray(profile?.portfolioItems)
    ? (profile!.portfolioItems as PortfolioItem[])
    : [];

  const saveMutation = useMutation({
    mutationFn: (portfolioItems: PortfolioItem[]) =>
      updateProviderProfile({ portfolioItems }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['provider-profile'] }),
    onError:   () => Alert.alert('Error', 'Could not save portfolio.'),
  });

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      setPhotoUri(result.assets[0].uri);
      setPhotoMime(result.assets[0].mimeType ?? 'image/jpeg');
    }
  }

  async function handleAdd() {
    if (!title.trim() || !photoUri) return;
    setUploading(true);
    try {
      const { url } = await uploadFile(photoUri, 'portfolio', photoMime);
      const newItem: PortfolioItem = {
        title:       title.trim(),
        description: desc.trim() || undefined,
        imageUrl:    url,
      };
      await saveMutation.mutateAsync([...items, newItem]);
      setTitle(''); setDesc(''); setPhotoUri(null); setPhotoMime('image/jpeg');
    } catch {
      Alert.alert('Error', 'Could not upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function handleRemove(idx: number) {
    const item = items[idx];
    Alert.alert('Remove Item', `Remove "${item.title}" from your portfolio?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => saveMutation.mutate(items.filter((_, i) => i !== idx)),
      },
    ]);
  }

  const canAdd    = title.trim().length > 0 && !!photoUri && items.length < 10;
  const isBusy    = uploading || saveMutation.isPending;
  const atLimit   = items.length >= 10;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Portfolio</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(_, idx) => String(idx)}
        numColumns={NUM_COLS}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={isLoading}
        onRefresh={refetch}
        ListHeaderComponent={
          <>
            {/* ── Intro banner ─────────────────────────────── */}
            <View style={[styles.banner, { backgroundColor: Primary[50], marginBottom: Spacing.three }]}>
              <View style={[styles.bannerIcon, { backgroundColor: Primary[100] }]}>
                <Icon name="images-outline" size={18} color={Primary[600]} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.bannerTitle, { color: Primary[700] }]}>Showcase Your Work</Text>
                <Text style={[styles.bannerHint, { color: Primary[600] }]}>
                  Upload photos of completed jobs to attract more clients. Up to 10 items.
                </Text>
              </View>
            </View>

            {/* ── Add item card ─────────────────────────────── */}
            {!atLimit ? (
              <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconWrap, { backgroundColor: Primary[50] }]}>
                    <Icon name="add-circle-outline" size={18} color={Primary[500]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Add New Item</Text>
                    <Text style={[styles.cardSub, { color: theme.textSecondary }]}>{items.length}/10 items used</Text>
                  </View>
                </View>

                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Title *"
                  placeholderTextColor={theme.textSecondary}
                  maxLength={100}
                />
                <TextInput
                  style={[styles.input, styles.textarea, { backgroundColor: theme.background, color: theme.text }]}
                  value={desc}
                  onChangeText={setDesc}
                  placeholder="Description (optional)"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                />

                {/* Photo picker */}
                <Pressable
                  style={[
                    styles.photoPicker,
                    { borderColor: photoUri ? Primary[400] : Primary[200], backgroundColor: theme.background },
                  ]}
                  onPress={pickPhoto}
                >
                  {photoUri ? (
                    <>
                      <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                      <View style={styles.photoOverlay}>
                        <Icon name="camera-outline" size={20} color="#fff" />
                        <Text style={styles.photoOverlayText}>Change photo</Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <View style={[styles.photoPlaceholderIcon, { backgroundColor: Primary[50] }]}>
                        <Icon name="image-outline" size={28} color={Primary[400]} />
                      </View>
                      <Text style={[styles.photoPickerText, { color: theme.textSecondary }]}>Tap to select a photo</Text>
                      <Text style={[styles.photoPickerSub, { color: theme.textSecondary }]}>JPG, PNG · max 5MB</Text>
                    </View>
                  )}
                </Pressable>

                {/* Add button */}
                <Pressable
                  style={[styles.addBtn, { backgroundColor: canAdd ? Primary[500] : theme.background, opacity: canAdd ? 1 : 0.5 }]}
                  onPress={handleAdd}
                  disabled={!canAdd || isBusy}
                >
                  {isBusy
                    ? <ActivityIndicator size="small" color={canAdd ? '#fff' : theme.textSecondary} />
                    : <Icon name="cloud-upload-outline" size={18} color={canAdd ? '#fff' : theme.textSecondary} />
                  }
                  <Text style={[styles.addBtnText, { color: canAdd ? '#fff' : theme.textSecondary }]}>
                    {uploading ? 'Uploading…' : saveMutation.isPending ? 'Saving…' : 'Add to Portfolio'}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={[styles.limitCard, { backgroundColor: Status.warningBg }]}>
                <Icon name="checkmark-circle" size={18} color={Status.warning} />
                <Text style={[styles.limitText, { color: Status.warning }]}>
                  Portfolio is full (10/10). Remove an item to add new work.
                </Text>
              </View>
            )}

            {/* ── Grid section label ────────────────────────── */}
            {items.length > 0 && (
              <View style={styles.sectionRow}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>YOUR WORK</Text>
                <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>{items.length}/10</Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={[styles.emptyIconWrap, { backgroundColor: Primary[50] }]}>
                <Icon name="images-outline" size={30} color={Primary[400]} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No work added yet</Text>
              <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
                Photos of your completed jobs help clients choose you over the competition.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item, index }: { item: PortfolioItem; index: number }) => (
          <View style={[styles.gridItem, { backgroundColor: theme.backgroundElement }]}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.gridImage} />
            ) : (
              <View style={[styles.gridImage, { backgroundColor: Primary[50], alignItems: 'center', justifyContent: 'center' }]}>
                <Icon name="image-outline" size={30} color={Primary[300]} />
              </View>
            )}
            <View style={[styles.gridMeta, { borderTopColor: theme.background }]}>
              <Text style={[styles.gridTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
              <Pressable
                onPress={() => handleRemove(index)}
                hitSlop={8}
                style={[styles.gridRemoveBtn, { backgroundColor: Status.errorBg }]}
              >
                <Icon name="trash-outline" size={13} color={Status.error} />
              </Pressable>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:               { flex: 1 },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:            { width: 32, alignItems: 'flex-start' },
  headerTitle:        { fontSize: 17, fontWeight: '700' },
  list:               { padding: Spacing.four, gap: Spacing.three, paddingBottom: BottomTabInset + 24 },

  /* Banner */
  banner:             { borderRadius: 14, padding: Spacing.three, flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  bannerIcon:         { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bannerTitle:        { fontSize: 13, fontWeight: '700' },
  bannerHint:         { fontSize: 13, lineHeight: 18 },

  /* Add card */
  card:               { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  cardHeader:         { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  cardIconWrap:       { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardTitle:          { fontSize: 15, fontWeight: '700' },
  cardSub:            { fontSize: 12, marginTop: 1 },

  /* Inputs */
  input:              { borderRadius: 11, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textarea:           { minHeight: 80, textAlignVertical: 'top' },

  /* Photo picker */
  photoPicker:        { borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', overflow: 'hidden', minHeight: 130 },
  photoPreview:       { width: '100%', height: 150 },
  photoOverlay:       { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 8 },
  photoOverlayText:   { color: '#fff', fontSize: 13, fontWeight: '600' },
  photoPlaceholder:   { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.four, gap: 6 },
  photoPlaceholderIcon:{ width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  photoPickerText:    { fontSize: 13, fontWeight: '600' },
  photoPickerSub:     { fontSize: 11 },

  /* Add button */
  addBtn:             { borderRadius: 11, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addBtnText:         { fontSize: 14, fontWeight: '700' },

  /* Limit card */
  limitCard:          { borderRadius: 12, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  limitText:          { flex: 1, fontSize: 13, fontWeight: '600' },

  /* Section */
  sectionRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 4 },
  sectionLabel:       { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionCount:       { fontSize: 11, fontWeight: '600' },

  /* Grid */
  gridRow:            { gap: Spacing.two },
  gridItem:           { flex: 1, borderRadius: 16, overflow: 'hidden' },
  gridImage:          { width: '100%', height: 130 },
  gridMeta:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.two, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  gridTitle:          { fontSize: 13, fontWeight: '600', flex: 1, marginRight: 6 },
  gridRemoveBtn:      { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  /* Empty */
  emptyCard:          { borderRadius: 16, padding: Spacing.five, alignItems: 'center', gap: Spacing.two },
  emptyIconWrap:      { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:         { fontSize: 16, fontWeight: '700' },
  emptyHint:          { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
