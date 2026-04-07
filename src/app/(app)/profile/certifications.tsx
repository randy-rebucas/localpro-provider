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
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
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

function formatDate(raw?: string) {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isExpired(raw?: string) {
  if (!raw) return false;
  return new Date(raw).getTime() < Date.now();
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

  const validCerts   = certs.filter((c) => !isExpired(c.expiresAt ?? c.expiryDate));
  const expiredCerts = certs.filter((c) =>  isExpired(c.expiresAt ?? c.expiryDate));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Certifications</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={[...validCerts, ...expiredCerts]}
        keyExtractor={(item, idx) => item._id ?? String(idx)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Primary[500]} />
        }
        ListHeaderComponent={
          <>
            {isLoading && (
              <View style={{ gap: Spacing.two }}>
                {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
              </View>
            )}

            {/* ── PESO notice ──────────────────────────────── */}
            <View style={[styles.noticeCard, { backgroundColor: Primary[50] }]}>
              <View style={[styles.noticeIconWrap, { backgroundColor: Primary[100] }]}>
                <Icon name="business-outline" size={18} color={Primary[600]} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[styles.noticeTitle, { color: Primary[700] }]}>Managed by PESO Offices</Text>
                <Text style={[styles.noticeText, { color: Primary[600] }]}>
                  Contact your local PESO Employment Office to have your trade certificates (e.g. TESDA NC II) recorded on your profile.
                </Text>
              </View>
            </View>

            {/* ── Count summary ────────────────────────────── */}
            {certs.length > 0 && (
              <View style={styles.summaryRow}>
                <View style={[styles.summaryChip, { backgroundColor: Status.successBg }]}>
                  <Icon name="ribbon" size={14} color={Status.success} />
                  <Text style={[styles.summaryText, { color: Status.success }]}>
                    {validCerts.length} active
                  </Text>
                </View>
                {expiredCerts.length > 0 && (
                  <View style={[styles.summaryChip, { backgroundColor: theme.backgroundElement }]}>
                    <Icon name="time-outline" size={14} color={theme.textSecondary} />
                    <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
                      {expiredCerts.length} expired
                    </Text>
                  </View>
                )}
              </View>
            )}

            {validCerts.length > 0 && (
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>ACTIVE</Text>
            )}
          </>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={[styles.emptyIconWrap, { backgroundColor: Primary[50] }]}>
                <Icon name="ribbon-outline" size={32} color={Primary[400]} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No certifications yet</Text>
              <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
                Visit your local PESO office to register your trade certifications. Verified certs improve your profile ranking and client trust.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item, index }: { item: Certification; index: number }) => {
          const expired    = isExpired(item.expiresAt ?? item.expiryDate);
          const expiredAt  = item.expiresAt ?? item.expiryDate;
          const issuedAt   = item.issuedAt  ?? item.issueDate;
          const org        = item.issuer    ?? item.issuingOrg ?? '';
          const name       = item.title     ?? item.name ?? 'Certification';

          // Insert "EXPIRED" label before the first expired cert
          const prevItem = index > 0 ? [...validCerts, ...expiredCerts][index - 1] : null;
          const prevExpired = prevItem ? isExpired(prevItem.expiresAt ?? prevItem.expiryDate) : false;
          const showExpiredLabel = expired && !prevExpired && expiredCerts.length > 0;

          return (
            <>
              {showExpiredLabel && (
                <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: Spacing.two }]}>EXPIRED</Text>
              )}
              <View
                style={[
                  styles.certCard,
                  { backgroundColor: theme.backgroundElement },
                  expired && { opacity: 0.65 },
                ]}
              >
                {/* Accent bar */}
                <View style={[styles.certAccent, { backgroundColor: expired ? theme.textSecondary : Primary[500] }]} />

                <View style={styles.certBody}>
                  {/* Icon + verified */}
                  <View style={styles.certLeft}>
                    <View style={[styles.certIconWrap, { backgroundColor: expired ? theme.background : Primary[50] }]}>
                      <Icon name="ribbon" size={22} color={expired ? theme.textSecondary : Primary[500]} />
                    </View>
                  </View>

                  {/* Text */}
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[styles.certName, { color: theme.text }]}>{name}</Text>
                    {!!org && (
                      <View style={styles.certOrgRow}>
                        <Icon name="business-outline" size={12} color={theme.textSecondary} />
                        <Text style={[styles.certOrg, { color: theme.textSecondary }]}>{org}</Text>
                      </View>
                    )}
                    <View style={styles.certDates}>
                      {!!issuedAt && (
                        <View style={styles.certDateItem}>
                          <Text style={[styles.certDateLabel, { color: theme.textSecondary }]}>Issued</Text>
                          <Text style={[styles.certDateVal, { color: theme.text }]}>{formatDate(issuedAt)}</Text>
                        </View>
                      )}
                      {!!expiredAt && (
                        <View style={styles.certDateItem}>
                          <Text style={[styles.certDateLabel, { color: theme.textSecondary }]}>
                            {expired ? 'Expired' : 'Expires'}
                          </Text>
                          <Text style={[styles.certDateVal, { color: expired ? Status.error : theme.text }]}>
                            {formatDate(expiredAt)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Badge */}
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: expired ? theme.background : Status.successBg },
                  ]}>
                    <Icon
                      name={expired ? 'time-outline' : 'checkmark-circle'}
                      size={13}
                      color={expired ? theme.textSecondary : Status.success}
                    />
                    <Text style={[styles.statusBadgeText, { color: expired ? theme.textSecondary : Status.success }]}>
                      {expired ? 'Expired' : 'Verified'}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1 },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:          { width: 32, alignItems: 'flex-start' },
  headerTitle:      { fontSize: 17, fontWeight: '700' },
  list:             { padding: Spacing.four, gap: Spacing.three, paddingBottom: BottomTabInset + 24 },

  /* PESO notice */
  noticeCard:       { borderRadius: 16, padding: Spacing.three, flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  noticeIconWrap:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  noticeTitle:      { fontSize: 13, fontWeight: '700' },
  noticeText:       { fontSize: 13, lineHeight: 18 },

  /* Summary chips */
  summaryRow:       { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  summaryChip:      { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  summaryText:      { fontSize: 13, fontWeight: '700' },

  /* Section label */
  sectionLabel:     { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 4, marginBottom: 4 },

  /* Cert card */
  certCard:         { borderRadius: 16, overflow: 'hidden' },
  certAccent:       { height: 4 },
  certBody:         { padding: Spacing.three, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  certLeft:         { gap: 6 },
  certIconWrap:     { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  certName:         { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  certOrgRow:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  certOrg:          { fontSize: 12 },
  certDates:        { flexDirection: 'row', gap: Spacing.three, marginTop: 4 },
  certDateItem:     { gap: 1 },
  certDateLabel:    { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  certDateVal:      { fontSize: 12, fontWeight: '600' },
  statusBadge:      { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  statusBadgeText:  { fontSize: 11, fontWeight: '700' },

  /* Empty */
  emptyCard:        { borderRadius: 18, padding: Spacing.five, alignItems: 'center', gap: Spacing.three },
  emptyIconWrap:    { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:       { fontSize: 18, fontWeight: '700' },
  emptyHint:        { fontSize: 14, textAlign: 'center', lineHeight: 21 },
});
