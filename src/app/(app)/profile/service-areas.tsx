import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getProviderProfile } from '@/api/auth';
import {
  addServiceArea,
  removeServiceArea,
  type ServiceArea,
} from '@/api/provider-profile';
import { Icon } from '@/components/icon';
import { Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function ServiceAreasScreen() {
  const theme  = useTheme();
  const router = useRouter();
  const qc     = useQueryClient();
  const [label,   setLabel]   = useState('');
  const [address, setAddress] = useState('');

  // Service areas are returned inside the main provider profile — no separate GET endpoint is documented
  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['provider-profile'],
    queryFn:  getProviderProfile,
  });
  const areas: ServiceArea[] = (profile?.serviceAreas as ServiceArea[] | undefined) ?? [];

  const addMutation = useMutation({
    mutationFn: () => addServiceArea({ label: label.trim(), address: address.trim() }),
    onSuccess: () => {
      setLabel('');
      setAddress('');
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

  const canAdd = label.trim().length > 0 && address.trim().length > 0;

  const inputStyle = [styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
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
          refreshing={isLoading}
          onRefresh={refetch}
          ListHeaderComponent={
            <>
              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                Add up to 10 locations where you offer services. Clients search by area to find you.
              </Text>

              {/* Add form */}
              <View style={[styles.addCard, { backgroundColor: theme.backgroundElement }]}>
                <Text style={[styles.addTitle, { color: theme.text }]}>Add New Area</Text>
                <TextInput
                  style={inputStyle}
                  value={label}
                  onChangeText={setLabel}
                  placeholder="Short label (e.g. Makati CBD)"
                  placeholderTextColor={theme.textSecondary}
                />
                <TextInput
                  style={inputStyle}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Full address or city"
                  placeholderTextColor={theme.textSecondary}
                />
                <Pressable
                  style={[styles.addBtn, { backgroundColor: canAdd ? Primary[500] : theme.backgroundElement, opacity: canAdd ? 1 : 0.5 }]}
                  onPress={() => addMutation.mutate()}
                  disabled={!canAdd || addMutation.isPending}
                >
                  <Icon name="add" size={18} color={canAdd ? '#fff' : theme.textSecondary} />
                  <Text style={[styles.addBtnText, { color: canAdd ? '#fff' : theme.textSecondary }]}>
                    {addMutation.isPending ? 'Adding…' : 'Add Area'}
                  </Text>
                </Pressable>
              </View>

              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                Your Areas ({areas.length}/10)
              </Text>
            </>
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.empty}>
                <Icon name="map-outline" size={48} color={theme.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No service areas added yet.</Text>
              </View>
            ) : null
          }
          renderItem={({ item }: { item: ServiceArea }) => (
            <View style={[styles.areaRow, { backgroundColor: theme.backgroundElement }]}>
              <Icon name="location-outline" size={20} color={Primary[500]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.areaLabel, { color: theme.text }]}>{item.label}</Text>
                <Text style={[styles.areaAddress, { color: theme.textSecondary }]} numberOfLines={1}>
                  {item.address}
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  Alert.alert('Remove Area', `Remove "${item.label}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => removeMutation.mutate(item._id) },
                  ])
                }
                hitSlop={8}
              >
                <Icon name="trash-outline" size={20} color={Status.error} />
              </Pressable>
            </View>
          )}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:      { width: 32, alignItems: 'flex-start' },
  headerTitle:  { fontSize: 17, fontWeight: '700' },
  list:         { padding: Spacing.four, gap: Spacing.three, paddingBottom: 40 },
  hint:         { fontSize: 13, lineHeight: 18 },
  addCard:      { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  addTitle:     { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  input:        { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  addBtn:       { borderRadius: 10, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 },
  addBtnText:   { fontSize: 14, fontWeight: '700' },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  areaRow:      { borderRadius: 12, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  areaLabel:    { fontSize: 15, fontWeight: '600' },
  areaAddress:  { fontSize: 13 },
  empty:        { alignItems: 'center', paddingTop: 40, gap: Spacing.two },
  emptyText:    { fontSize: 14 },
});
