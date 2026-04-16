/**
 * Saved Addresses + Phone Number
 * Docs: mobile-provider-profile-api.md §5, §6
 *
 * Addresses: POST/PATCH/DELETE /api/auth/me/addresses
 * Phone:     PUT /api/auth/me { phone }
 */
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

/* ── Nominatim ────────────────────────────────────────────────── */
interface NominatimResult {
  place_id: number;
  display_name: string;
  address: {
    city?: string;
    town?: string;
    municipality?: string;
    suburb?: string;
  };
}

async function searchNominatim(query: string): Promise<NominatimResult[]> {
  if (query.trim().length < 3) return [];
  const params = new URLSearchParams({
    q: query, format: 'json', addressdetails: '1', limit: '6', countrycodes: 'ph',
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

import { getMe } from '@/api/auth';
import { addAddress, deleteAddress, updateAddress, updateMe, type Address } from '@/api/provider-profile';
import { Icon } from '@/components/icon';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function AddressesScreen() {
  const theme  = useTheme();
  const router = useRouter();
  const qc     = useQueryClient();

  const [label,        setLabel]        = useState('');
  const [address,      setAddress]      = useState('');
  const [phone,        setPhone]        = useState('');
  const [phoneErr,     setPhoneErr]     = useState('');
  const [editingPhone, setEditingPhone] = useState(false);

  const [suggestions,  setSuggestions]  = useState<NominatimResult[]>([]);
  const [searching,    setSearching]    = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: me, isLoading, refetch } = useQuery({
    queryKey: ['me'],
    queryFn:  getMe,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (me?.phone) setPhone(me.phone);
  }, [me?.phone]);

  const addresses: Address[] = (me?.addresses ?? []) as Address[];

  /* ── Nominatim autosuggest ───────────────────────────────── */
  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 3) { setSuggestions([]); setShowDropdown(false); return; }
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
    if (text.trim().length < 3) { setSuggestions([]); setShowDropdown(false); }
  }

  function selectSuggestion(r: NominatimResult) {
    setAddress(r.display_name);
    if (!label.trim()) setLabel(shortName(r));
    setSuggestions([]);
    setShowDropdown(false);
  }

  /* ── Phone ───────────────────────────────────────────────── */
  const phoneMutation = useMutation({
    mutationFn: () => updateMe({ phone: phone.trim() || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      setEditingPhone(false);
    },
    onError: () => Alert.alert('Error', 'Could not save phone number.'),
  });

  function handleSavePhone() {
    const cleaned = phone.trim();
    if (cleaned && !/^\+?\d{7,15}$/.test(cleaned)) {
      setPhoneErr('Enter a valid phone number (e.g. +639171234567)');
      return;
    }
    setPhoneErr('');
    phoneMutation.mutate();
  }

  /* ── Add address ─────────────────────────────────────────── */
  const addMutation = useMutation({
    mutationFn: () => addAddress({ label: label.trim(), address: address.trim() }),
    onSuccess: (updated) => {
      setLabel(''); setAddress(''); setSuggestions([]); setShowDropdown(false);
      qc.setQueryData(['me'], (prev: any) => prev ? { ...prev, addresses: updated } : prev);
      qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: () => Alert.alert('Error', 'Could not add address. Max 10 allowed.'),
  });

  /* ── Set default ─────────────────────────────────────────── */
  const defaultMutation = useMutation({
    mutationFn: (id: string) => updateAddress(id, { isDefault: true }),
    onSuccess: (updated) => {
      qc.setQueryData(['me'], (prev: any) => prev ? { ...prev, addresses: updated } : prev);
    },
    onError: () => Alert.alert('Error', 'Could not update address.'),
  });

  /* ── Delete ──────────────────────────────────────────────── */
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAddress(id),
    onSuccess: (updated) => {
      qc.setQueryData(['me'], (prev: any) => prev ? { ...prev, addresses: updated } : prev);
    },
    onError: () => Alert.alert('Error', 'Could not remove address.'),
  });

  const canAdd = label.trim().length > 0 && address.trim().length >= 3;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* ── Header ─────────────────────────────────────────── */}
        <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Addresses & Phone</Text>
          <View style={{ width: 32 }} />
        </View>

        <FlatList
          data={addresses}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshing={isLoading}
          onRefresh={refetch}
          ListHeaderComponent={
            <>
              {/* ── Phone card ─────────────────────────────────── */}
              <View style={[styles.card, { backgroundColor: theme.backgroundElement, marginBottom: Spacing.three }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconWrap, { backgroundColor: Primary[50] }]}>
                    <Icon name="call-outline" size={18} color={Primary[500]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Phone Number</Text>
                    <Text style={[styles.cardSub, { color: theme.textSecondary }]}>Used for job notifications & client contact</Text>
                  </View>
                </View>

                <View style={styles.phoneRow}>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: theme.background, color: theme.text, flex: 1 },
                      editingPhone && { borderWidth: 1.5, borderColor: Primary[300] },
                    ]}
                    value={phone}
                    onChangeText={(v) => { setPhone(v); setPhoneErr(''); }}
                    placeholder="+639171234567"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="phone-pad"
                    editable={editingPhone}
                  />
                  {editingPhone ? (
                    <Pressable
                      style={[styles.phoneBtn, { backgroundColor: Primary[500] }]}
                      onPress={handleSavePhone}
                      disabled={phoneMutation.isPending}
                    >
                      {phoneMutation.isPending
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={[styles.phoneBtnText, { color: '#fff' }]}>Save</Text>
                      }
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[styles.phoneBtn, { backgroundColor: theme.background, borderWidth: 1.5, borderColor: Primary[200] }]}
                      onPress={() => setEditingPhone(true)}
                    >
                      <Icon name="create-outline" size={15} color={Primary[500]} />
                      <Text style={[styles.phoneBtnText, { color: Primary[600] }]}>Edit</Text>
                    </Pressable>
                  )}
                </View>
                {!!phoneErr && (
                  <View style={styles.errRow}>
                    <Icon name="alert-circle-outline" size={14} color={Status.error} />
                    <Text style={[styles.errText, { color: Status.error }]}>{phoneErr}</Text>
                  </View>
                )}
              </View>

              {/* ── Add address card ───────────────────────────── */}
              <View style={[styles.card, { backgroundColor: theme.backgroundElement, marginBottom: Spacing.three }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconWrap, { backgroundColor: Primary[50] }]}>
                    <Icon name="add-circle-outline" size={18} color={Primary[500]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Add Address</Text>
                    <Text style={[styles.cardSub, { color: theme.textSecondary }]}>Save up to 10 locations</Text>
                  </View>
                </View>

                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                  value={label}
                  onChangeText={setLabel}
                  placeholder="Label (e.g. Home, Office)"
                  placeholderTextColor={theme.textSecondary}
                  maxLength={50}
                />
                {/* Address autosuggest */}
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
                      placeholder="Search full address…"
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
                    {addMutation.isPending ? 'Adding…' : 'Add Address'}
                  </Text>
                </Pressable>
              </View>

              {/* ── Section label ──────────────────────────────── */}
              {addresses.length > 0 && (
                <View style={[styles.sectionRow, { marginTop: Spacing.three }]}>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                    SAVED ADDRESSES
                  </Text>
                  <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>
                    {addresses.length}/10
                  </Text>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.backgroundElement }]}>
                <View style={[styles.emptyIconWrap, { backgroundColor: theme.background }]}>
                  <Icon name="location-outline" size={30} color={theme.textSecondary} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No addresses yet</Text>
                <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
                  Add an address above to save your home, office, or service locations.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }: { item: Address }) => (
            <View
              style={[
                styles.addrCard,
                { backgroundColor: theme.backgroundElement },
                item.isDefault && { borderWidth: 1.5, borderColor: Primary[300] },
              ]}
            >
              {/* Left icon */}
              <View style={[styles.addrIconWrap, { backgroundColor: item.isDefault ? Primary[50] : theme.background }]}>
                <Icon
                  name={item.isDefault ? 'home' : 'location-outline'}
                  size={20}
                  color={item.isDefault ? Primary[500] : theme.textSecondary}
                />
              </View>

              {/* Content */}
              <View style={{ flex: 1, gap: 3 }}>
                <View style={styles.addrLabelRow}>
                  <Text style={[styles.addrLabel, { color: theme.text }]}>{item.label}</Text>
                  {item.isDefault && (
                    <View style={[styles.defaultBadge, { backgroundColor: Primary[100] }]}>
                      <Icon name="star" size={10} color={Primary[600]} />
                      <Text style={[styles.defaultText, { color: Primary[600] }]}>Default</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.addrAddress, { color: theme.textSecondary }]} numberOfLines={2}>
                  {item.address}
                </Text>
              </View>

              {/* Actions */}
              <View style={styles.addrActions}>
                {!item.isDefault && (
                  <Pressable
                    onPress={() => defaultMutation.mutate(item._id)}
                    hitSlop={8}
                    style={[styles.actionBtn, { backgroundColor: Primary[50] }]}
                  >
                    <Icon name="star-outline" size={15} color={Primary[500]} />
                  </Pressable>
                )}
                <Pressable
                  onPress={() =>
                    Alert.alert('Remove Address', `Remove "${item.label}"?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(item._id) },
                    ])
                  }
                  hitSlop={8}
                  style={[styles.actionBtn, { backgroundColor: Status.errorBg }]}
                >
                  <Icon name="trash-outline" size={15} color={Status.error} />
                </Pressable>
              </View>
            </View>
          )}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:        { width: 32, alignItems: 'flex-start' },
  headerTitle:    { fontSize: 17, fontWeight: '700' },
  list:           { padding: Spacing.four, gap: Spacing.three, paddingBottom: BottomTabInset + 24 },

  /* Cards */
  card:           { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  cardHeader:     { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  cardIconWrap:   { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardTitle:      { fontSize: 15, fontWeight: '700' },
  cardSub:        { fontSize: 12, marginTop: 1 },

  /* Phone */
  phoneRow:       { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  phoneBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11 },
  phoneBtnText:   { fontWeight: '700', fontSize: 14 },

  /* Inputs */
  input:              { borderRadius: 11, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 0 },

  /* Address autosuggest */
  addressWrap:        { zIndex: 10 },
  addressInputRow:    { flexDirection: 'row', alignItems: 'center', borderRadius: 11, overflow: 'hidden' },
  addressInputOpen:   { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  addressInput:       { flex: 1, paddingHorizontal: 10, paddingVertical: 12, fontSize: 15 },
  dropdown:           { borderBottomLeftRadius: 11, borderBottomRightRadius: 11, overflow: 'hidden' },
  suggestionRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11 },
  suggestionIcon:     { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  suggestionName:     { fontSize: 14, fontWeight: '600' },
  suggestionFull:     { fontSize: 12, marginTop: 1 },

  /* Add button */
  addBtn:         { borderRadius: 11, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addBtnText:     { fontSize: 14, fontWeight: '700' },

  /* Error */
  errRow:         { flexDirection: 'row', alignItems: 'center', gap: 5 },
  errText:        { fontSize: 12 },

  /* Section header */
  sectionRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 4 },
  sectionLabel:   { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionCount:   { fontSize: 11, fontWeight: '600' },

  /* Address cards */
  addrCard:       { borderRadius: 14, padding: Spacing.three, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, borderWidth: 1.5, borderColor: 'transparent' },
  addrIconWrap:   { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  addrLabelRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  addrLabel:      { fontSize: 15, fontWeight: '600' },
  addrAddress:    { fontSize: 13, lineHeight: 18 },
  defaultBadge:   { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  defaultText:    { fontSize: 11, fontWeight: '700' },
  addrActions:    { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 2 },
  actionBtn:      { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  /* Empty */
  emptyCard:      { borderRadius: 16, padding: Spacing.five, alignItems: 'center', gap: Spacing.two },
  emptyIconWrap:  { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:     { fontSize: 16, fontWeight: '700' },
  emptyHint:      { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
