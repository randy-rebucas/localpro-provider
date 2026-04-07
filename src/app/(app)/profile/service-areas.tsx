import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getProviderProfile } from '@/api/auth';
import { addServiceArea, removeServiceArea, type ServiceArea } from '@/api/provider-profile';
import { Icon } from '@/components/icon';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/* ── Nominatim types ──────────────────────────────────────────── */
interface NominatimResult {
  place_id: number;
  display_name: string;
  address: {
    city?: string;
    town?: string;
    municipality?: string;
    suburb?: string;
    state?: string;
    country?: string;
  };
}

async function searchNominatim(query: string): Promise<NominatimResult[]> {
  if (query.trim().length < 3) return [];
  const params = new URLSearchParams({
    q:              query,
    format:         'json',
    addressdetails: '1',
    limit:          '6',
    countrycodes:   'ph',        // bias results to Philippines
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'LocalProProviderApp/1.0' },
  });
  if (!res.ok) return [];
  return res.json();
}

function shortName(r: NominatimResult) {
  const a = r.address;
  return a.city ?? a.town ?? a.municipality ?? a.suburb ?? r.display_name.split(',')[0];
}

/* ── Component ────────────────────────────────────────────────── */
export default function ServiceAreasScreen() {
  const theme  = useTheme();
  const router = useRouter();
  const qc     = useQueryClient();

  const [label,        setLabel]        = useState('');
  const [address,      setAddress]      = useState('');
  const [suggestions,  setSuggestions]  = useState<NominatimResult[]>([]);
  const [searching,    setSearching]    = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['provider-profile'],
    queryFn:  getProviderProfile,
  });
  const areas: ServiceArea[] = (profile?.serviceAreas as ServiceArea[] | undefined) ?? [];
  const atLimit = areas.length >= 10;

  /* ── Debounced Nominatim search ───────────────────────────── */
  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    try {
      const results = await searchNominatim(q);
      setSuggestions(results);
      setShowDropdown(results.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => runSearch(address), 450);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [address, runSearch]);

  function handleAddressChange(text: string) {
    setAddress(text);
    if (text.trim().length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
    }
  }

  function selectSuggestion(r: NominatimResult) {
    const full  = r.display_name;
    const short = shortName(r);
    setAddress(full);
    if (!label.trim()) setLabel(short);
    setSuggestions([]);
    setShowDropdown(false);
  }

  /* ── Mutations ────────────────────────────────────────────── */
  const addMutation = useMutation({
    mutationFn: () => addServiceArea({ label: label.trim(), address: address.trim() }),
    onSuccess: () => {
      setLabel('');
      setAddress('');
      setSuggestions([]);
      setShowDropdown(false);
      qc.invalidateQueries({ queryKey: ['service-areas'] });
      qc.invalidateQueries({ queryKey: ['provider-profile'] });
    },
    onError: () => Alert.alert('Error', 'Could not add service area. Max 10 allowed.'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeServiceArea(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-areas'] });
      qc.invalidateQueries({ queryKey: ['provider-profile'] });
    },
    onError: () => Alert.alert('Error', 'Could not remove service area.'),
  });

  const canAdd = label.trim().length > 0 && address.trim().length > 0 && !atLimit;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* ── Header ─────────────────────────────────────────── */}
        <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Service Areas</Text>
          <View style={{ width: 32 }} />
        </View>

        <FlatList
          data={areas}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshing={isLoading}
          onRefresh={refetch}
          ListHeaderComponent={
            <>
              {/* ── Info banner ──────────────────────────────── */}
              <View style={[styles.banner, { backgroundColor: Primary[50], marginBottom: Spacing.three }]}>
                <View style={[styles.bannerIcon, { backgroundColor: Primary[100] }]}>
                  <Icon name="map-outline" size={18} color={Primary[600]} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.bannerTitle, { color: Primary[700] }]}>Where do you work?</Text>
                  <Text style={[styles.bannerHint, { color: Primary[600] }]}>
                    Clients search by location to find providers. Add up to 10 areas.
                  </Text>
                </View>
              </View>

              {/* ── Add form card ─────────────────────────────── */}
              {!atLimit ? (
                <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardIconWrap, { backgroundColor: Primary[50] }]}>
                      <Icon name="add-circle-outline" size={18} color={Primary[500]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: theme.text }]}>Add New Area</Text>
                      <Text style={[styles.cardSub, { color: theme.textSecondary }]}>{areas.length}/10 areas added</Text>
                    </View>
                  </View>

                  {/* Label input */}
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                    value={label}
                    onChangeText={setLabel}
                    placeholder="Short label (e.g. Makati CBD)"
                    placeholderTextColor={theme.textSecondary}
                    maxLength={60}
                  />

                  {/* Address input + dropdown wrapper */}
                  <View style={styles.addressWrap}>
                    <View style={[
                      styles.addressInputRow,
                      { backgroundColor: theme.background },
                      showDropdown && styles.addressInputOpen,
                    ]}>
                      <View style={{ marginLeft: 12 }}>
                        <Icon name="search-outline" size={16} color={theme.textSecondary} />
                      </View>
                      <TextInput
                        style={[styles.addressInput, { color: theme.text }]}
                        value={address}
                        onChangeText={handleAddressChange}
                        placeholder="Search address or city…"
                        placeholderTextColor={theme.textSecondary}
                        maxLength={300}
                        returnKeyType="search"
                      />
                      {searching && (
                        <ActivityIndicator size="small" color={Primary[400]} style={{ marginRight: 10 }} />
                      )}
                      {!searching && address.length > 0 && (
                        <Pressable
                          onPress={() => { setAddress(''); setSuggestions([]); setShowDropdown(false); }}
                          hitSlop={8}
                          style={{ marginRight: 10 }}
                        >
                          <Icon name="close-circle" size={16} color={theme.textSecondary} />
                        </Pressable>
                      )}
                    </View>

                    {/* Suggestion dropdown */}
                    {showDropdown && (
                      <View style={[styles.dropdown, { backgroundColor: theme.backgroundElement }]}>
                        <ScrollView
                          keyboardShouldPersistTaps="handled"
                          nestedScrollEnabled
                          showsVerticalScrollIndicator={false}
                          style={{ maxHeight: 220 }}
                        >
                          {suggestions.map((r, i) => (
                            <Pressable
                              key={r.place_id}
                              style={[
                                styles.suggestionRow,
                                i < suggestions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.background },
                              ]}
                              onPress={() => selectSuggestion(r)}
                            >
                              <View style={[styles.suggestionIcon, { backgroundColor: Primary[50] }]}>
                                <Icon name="location-outline" size={14} color={Primary[500]} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.suggestionName, { color: theme.text }]} numberOfLines={1}>
                                  {shortName(r)}
                                </Text>
                                <Text style={[styles.suggestionFull, { color: theme.textSecondary }]} numberOfLines={1}>
                                  {r.display_name}
                                </Text>
                              </View>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Add button */}
                  <Pressable
                    style={[styles.addBtn, { backgroundColor: canAdd ? Primary[500] : theme.background, opacity: canAdd ? 1 : 0.5 }]}
                    onPress={() => addMutation.mutate()}
                    disabled={!canAdd || addMutation.isPending}
                  >
                    {addMutation.isPending
                      ? <ActivityIndicator size="small" color={canAdd ? '#fff' : theme.textSecondary} />
                      : <Icon name="add" size={18} color={canAdd ? '#fff' : theme.textSecondary} />
                    }
                    <Text style={[styles.addBtnText, { color: canAdd ? '#fff' : theme.textSecondary }]}>
                      {addMutation.isPending ? 'Adding…' : 'Add Area'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={[styles.limitCard, { backgroundColor: Status.warningBg }]}>
                  <Icon name="checkmark-circle" size={18} color={Status.warning} />
                  <Text style={[styles.limitText, { color: Status.warning }]}>
                    Maximum 10 areas reached. Remove one to add a new location.
                  </Text>
                </View>
              )}

              {/* ── Section label ─────────────────────────────── */}
              {areas.length > 0 && (
                <View style={[styles.sectionRow, { marginTop: Spacing.three }]}>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>YOUR AREAS</Text>
                  <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>{areas.length}/10</Text>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.backgroundElement }]}>
                <View style={[styles.emptyIconWrap, { backgroundColor: Primary[50] }]}>
                  <Icon name="map-outline" size={30} color={Primary[400]} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No areas added yet</Text>
                <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
                  Add the cities or neighborhoods where you offer your services.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item, index }: { item: ServiceArea; index: number }) => {
            const isLast = index === areas.length - 1;
            return (
              <View
                style={[
                  styles.areaCard,
                  { backgroundColor: theme.backgroundElement },
                  !isLast && styles.areaCardGap,
                ]}
              >
                <View style={[styles.areaIconWrap, { backgroundColor: Primary[50] }]}>
                  <Icon name="location" size={18} color={Primary[500]} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[styles.areaLabel, { color: theme.text }]}>{item.label}</Text>
                  <View style={styles.areaAddrRow}>
                    <Icon name="navigate-outline" size={11} color={theme.textSecondary} />
                    <Text style={[styles.areaAddress, { color: theme.textSecondary }]} numberOfLines={2}>
                      {item.address}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() =>
                    Alert.alert('Remove Area', `Remove "${item.label}"?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => removeMutation.mutate(item._id) },
                    ])
                  }
                  hitSlop={8}
                  style={[styles.removeBtn, { backgroundColor: Status.errorBg }]}
                >
                  <Icon name="trash-outline" size={15} color={Status.error} />
                </Pressable>
              </View>
            );
          }}
        />
      </KeyboardAvoidingView>
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
  input:              { borderRadius: 11, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },

  /* Address search */
  addressWrap:        { zIndex: 10 },
  addressInputRow:    { flexDirection: 'row', alignItems: 'center', borderRadius: 11, overflow: 'hidden' },
  addressInputOpen:   { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  addressInput:       { flex: 1, paddingHorizontal: 10, paddingVertical: 12, fontSize: 15 },

  /* Dropdown */
  dropdown:           { borderBottomLeftRadius: 11, borderBottomRightRadius: 11, overflow: 'hidden' },
  suggestionRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11 },
  suggestionIcon:     { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  suggestionName:     { fontSize: 14, fontWeight: '600' },
  suggestionFull:     { fontSize: 12, marginTop: 1 },

  /* Add button */
  addBtn:             { borderRadius: 11, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addBtnText:         { fontSize: 14, fontWeight: '700' },

  /* Limit */
  limitCard:          { borderRadius: 12, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  limitText:          { flex: 1, fontSize: 13, fontWeight: '600' },

  /* Section */
  sectionRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 4 },
  sectionLabel:       { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionCount:       { fontSize: 11, fontWeight: '600' },

  /* Area cards */
  areaCard:           { borderRadius: 14, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  areaCardGap:        { marginBottom: Spacing.two },
  areaIconWrap:       { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  areaLabel:          { fontSize: 15, fontWeight: '600' },
  areaAddrRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  areaAddress:        { fontSize: 12, flex: 1 },
  removeBtn:          { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  /* Empty */
  emptyCard:          { borderRadius: 16, padding: Spacing.five, alignItems: 'center', gap: Spacing.two },
  emptyIconWrap:      { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:         { fontSize: 16, fontWeight: '700' },
  emptyHint:          { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
