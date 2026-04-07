/**
 * Certifications screen — read-only for providers.
 * Certifications are managed exclusively by PESO offices via /api/peso/providers/[id]/certifications.
 * Providers read their certifications from GET /api/providers/profile.
 */
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getProviderProfile } from '@/api/auth';
import { Icon } from '@/components/icon';
import { CardSkeleton } from '@/components/loading-skeleton';
import { Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Certification {
  _id?: string;
  title?: string;
  name?: string;
  issuer?: string;
  issuingOrg?: string;
  issuedAt?: string;
  issueDate?: string;
  expiresAt?: string;
  expiryDate?: string;
}

export default function CertificationsScreen() {
  const theme  = useTheme();
  const router = useRouter();

  const { data: profile, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['provider-profile'],
    queryFn:  getProviderProfile,
    staleTime: 1000 * 60 * 5,
  });

  const certs: Certification[] = Array.isArray(profile?.certifications)
    ? (profile!.certifications as Certification[])
    : [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Certifications</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={certs}
        keyExtractor={(item, idx) => item._id ?? String(idx)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Primary[500]} />}
        ListHeaderComponent={
          <>
            {isLoading && (
              <View style={{ gap: Spacing.two }}>
                {[0, 1].map((i) => <CardSkeleton key={i} />)}
              </View>
            )}
            {/* Info notice */}
            <View style={[styles.notice, { backgroundColor: Primary[50] }]}>
              <Icon name="information-circle-outline" size={18} color={Primary[600]} />
              <Text style={[styles.noticeText, { color: Primary[700] }]}>
                Certifications are verified and added by PESO Employment Offices. Contact your local PESO office
                to have your trade certificates (e.g. TESDA NCII) recorded on your profile.
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Icon name="ribbon-outline" size={56} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No certifications yet</Text>
              <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
                Visit your local PESO office to register your trade certifications.
                Verified certifications improve your profile ranking and client trust.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }: { item: Certification }) => (
          <View style={[styles.certRow, { backgroundColor: theme.backgroundElement }]}>
            <View style={[styles.certIcon, { backgroundColor: Primary[50] }]}>
              <Icon name="ribbon-outline" size={24} color={Primary[500]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.certName, { color: theme.text }]}>
                {item.title ?? item.name ?? 'Certification'}
              </Text>
              <Text style={[styles.certOrg, { color: theme.textSecondary }]}>
                {item.issuer ?? item.issuingOrg ?? ''}
              </Text>
              {(item.issuedAt ?? item.issueDate) && (
                <Text style={[styles.certDate, { color: theme.textSecondary }]}>
                  Issued: {item.issuedAt ?? item.issueDate}
                </Text>
              )}
              {(item.expiresAt ?? item.expiryDate) && (
                <Text style={[styles.certDate, { color: theme.textSecondary }]}>
                  Expires: {item.expiresAt ?? item.expiryDate}
                </Text>
              )}
            </View>
            <View style={[styles.verifiedBadge, { backgroundColor: Status.successBg }]}>
              <Icon name="checkmark-circle" size={14} color={Status.success} />
              <Text style={[styles.verifiedText, { color: Status.success }]}>Verified</Text>
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
  notice:        { borderRadius: 14, padding: Spacing.three, flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  noticeText:    { flex: 1, fontSize: 13, lineHeight: 18 },
  certRow:       { borderRadius: 14, padding: Spacing.three, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  certIcon:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  certName:      { fontSize: 15, fontWeight: '700' },
  certOrg:       { fontSize: 13, marginTop: 2 },
  certDate:      { fontSize: 12, marginTop: 1 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  verifiedText:  { fontSize: 11, fontWeight: '700' },
  empty:         { alignItems: 'center', paddingTop: 40, gap: Spacing.two, paddingHorizontal: Spacing.two },
  emptyTitle:    { fontSize: 20, fontWeight: '700' },
  emptyHint:     { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
