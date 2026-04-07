/**
 * KYC / Identity Verification
 * Docs: mobile-provider-profile-api.md §10
 *
 * Step 1: POST /api/upload (folder: "kyc") — upload each doc
 * Step 2: POST /api/kyc { documents: [{ type, url }] }
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getMe } from '@/api/auth';
import { submitKyc, uploadFile, type KycDocType } from '@/api/provider-profile';
import { Icon } from '@/components/icon';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface DocSlot {
  type: KycDocType;
  label: string;
  description: string;
  required: boolean;
  uri: string | null;
  uploadedUrl: string | null;
  uploading: boolean;
}

const INITIAL_SLOTS: Omit<DocSlot, 'uri' | 'uploadedUrl' | 'uploading'>[] = [
  { type: 'government_id',     label: 'Government ID',      description: "National ID, passport, or driver's license", required: true },
  { type: 'selfie_with_id',    label: 'Selfie with ID',     description: 'Clear photo of you holding your government ID', required: true },
  { type: 'tesda_certificate', label: 'TESDA Certificate',  description: 'NC I / NC II certificate (optional)', required: false },
  { type: 'business_permit',   label: 'Business Permit',    description: "DTI or Mayor's permit (optional)", required: false },
];

const STATUS_CONFIG = {
  none:     { icon: 'shield-outline',       color: Status.warning, bg: Status.warningBg,  label: 'Not Verified',  hint: 'Submit your documents to get a verified badge on your profile.' },
  pending:  { icon: 'time-outline',         color: Status.info,    bg: Status.infoBg,     label: 'Under Review',  hint: 'Your documents have been submitted and are being reviewed.' },
  approved: { icon: 'shield-checkmark',     color: Status.success, bg: Status.successBg,  label: 'Verified',      hint: 'Your identity has been verified. Your profile shows a verified badge.' },
  rejected: { icon: 'close-circle-outline', color: Status.error,   bg: Status.errorBg,    label: 'Rejected',      hint: 'Your verification was rejected. Please resubmit with clear, valid documents.' },
} as const;

const BENEFITS = [
  { icon: 'ribbon',          text: 'Verified badge on your public profile' },
  { icon: 'trending-up',     text: 'Rank higher in search results' },
  { icon: 'people',          text: 'Build client trust and earn more jobs' },
];

export default function KycScreen() {
  const theme  = useTheme();
  const router = useRouter();
  const qc     = useQueryClient();

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe, staleTime: 1000 * 60 * 5 });
  const kycStatus = (me?.kycStatus ?? 'none') as keyof typeof STATUS_CONFIG;
  const cfg = STATUS_CONFIG[kycStatus];

  const [slots, setSlots] = useState<DocSlot[]>(
    INITIAL_SLOTS.map((s) => ({ ...s, uri: null, uploadedUrl: null, uploading: false })),
  );

  async function pickAndUpload(idx: number) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const uri   = asset.uri;

    setSlots((prev) => prev.map((s, i) => i === idx ? { ...s, uri, uploading: true } : s));
    try {
      const { url } = await uploadFile(uri, 'kyc', asset.mimeType ?? 'image/jpeg');
      setSlots((prev) => prev.map((s, i) => i === idx ? { ...s, uploadedUrl: url, uploading: false } : s));
    } catch {
      setSlots((prev) => prev.map((s, i) => i === idx ? { ...s, uri: null, uploading: false } : s));
      Alert.alert('Upload Error', 'Could not upload document. Please try again.');
    }
  }

  const submitMutation = useMutation({
    mutationFn: () => {
      const docs = slots
        .filter((s) => s.uploadedUrl)
        .map((s) => ({ type: s.type, url: s.uploadedUrl! }));
      if (docs.length === 0) throw new Error('Please upload at least one document.');
      const requiredUploaded = slots.filter((s) => s.required).every((s) => !!s.uploadedUrl);
      if (!requiredUploaded) throw new Error('Please upload both required documents.');
      return submitKyc(docs);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      Alert.alert('Submitted!', 'Your documents have been submitted and are under review.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message ?? 'Could not submit documents.'),
  });

  const canSubmit  = slots.filter((s) => s.required).every((s) => !!s.uploadedUrl);
  const isEditable = kycStatus === 'none' || kycStatus === 'rejected';
  const uploadedCount = slots.filter((s) => s.uploadedUrl).length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Identity Verification</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Status hero ──────────────────────────────────── */}
        <View style={[styles.statusHero, { backgroundColor: cfg.bg }]}>
          <View style={styles.statusHeroBubble} />
          <View style={[styles.statusIconWrap, { backgroundColor: cfg.color + '22' }]}>
            <Icon name={cfg.icon as any} size={32} color={cfg.color} />
          </View>
          <View style={styles.statusHeroText}>
            <Text style={[styles.statusTitle, { color: cfg.color }]}>{cfg.label}</Text>
            <Text style={[styles.statusHint,  { color: cfg.color + 'cc' }]}>{cfg.hint}</Text>
          </View>
        </View>

        {/* ── Benefits card ────────────────────────────────── */}
        {isEditable && (
          <View style={[styles.benefitsCard, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.benefitsTitle, { color: theme.text }]}>Why get verified?</Text>
            <View style={styles.benefitsGrid}>
              {BENEFITS.map((b) => (
                <View key={b.text} style={[styles.benefitTile, { backgroundColor: theme.background }]}>
                  <View style={[styles.benefitIcon, { backgroundColor: Primary[50] }]}>
                    <Icon name={b.icon as any} size={18} color={Primary[500]} />
                  </View>
                  <Text style={[styles.benefitText, { color: theme.text }]}>{b.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Document upload ──────────────────────────────── */}
        {isEditable && (
          <>
            {/* Progress bar */}
            <View style={[styles.progressCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.progressTop}>
                <Text style={[styles.progressLabel, { color: theme.text }]}>Documents uploaded</Text>
                <Text style={[styles.progressCount, { color: Primary[600] }]}>{uploadedCount} / {slots.length}</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: theme.background }]}>
                <View style={[styles.progressFill, { width: `${(uploadedCount / slots.length) * 100}%` as any, backgroundColor: Primary[500] }]} />
              </View>
              <Text style={[styles.progressHint, { color: theme.textSecondary }]}>
                2 required · 2 optional
              </Text>
            </View>

            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>REQUIRED DOCUMENTS</Text>
            {slots.filter((s) => s.required).map((slot) => {
              const idx = slots.indexOf(slot);
              return <DocSlotCard key={slot.type} slot={slot} onPress={() => !slot.uploading && pickAndUpload(idx)} theme={theme} />;
            })}

            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>OPTIONAL DOCUMENTS</Text>
            {slots.filter((s) => !s.required).map((slot) => {
              const idx = slots.indexOf(slot);
              return <DocSlotCard key={slot.type} slot={slot} onPress={() => !slot.uploading && pickAndUpload(idx)} theme={theme} />;
            })}

            <Pressable
              style={[styles.submitBtn, { backgroundColor: canSubmit ? Primary[500] : theme.backgroundElement }]}
              onPress={() => submitMutation.mutate()}
              disabled={!canSubmit || submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="send-outline" size={18} color={canSubmit ? '#fff' : theme.textSecondary} />
              )}
              <Text style={[styles.submitBtnText, { color: canSubmit ? '#fff' : theme.textSecondary }]}>
                {submitMutation.isPending ? 'Submitting…' : 'Submit for Verification'}
              </Text>
            </Pressable>
          </>
        )}

        {/* ── Approved / Pending info ──────────────────────── */}
        {!isEditable && (
          <View style={[styles.infoCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={[styles.infoIconWrap, { backgroundColor: cfg.color + '18' }]}>
              <Icon name="information-circle-outline" size={22} color={cfg.color} />
            </View>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              {kycStatus === 'pending'
                ? "We typically review documents within 1–3 business days. You'll receive a notification once done."
                : 'Your identity is verified. Clients can now see your verified badge.'}
            </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Slot card sub-component ──────────────────────────────────── */
function DocSlotCard({ slot, onPress, theme }: { slot: DocSlot; onPress: () => void; theme: ReturnType<typeof useTheme> }) {
  const uploaded = !!slot.uploadedUrl;
  return (
    <Pressable
      style={[
        styles.docSlot,
        { backgroundColor: theme.backgroundElement },
        uploaded && { borderColor: Status.success + '80', borderWidth: 1.5 },
      ]}
      onPress={onPress}
    >
      <View style={styles.docThumbWrap}>
        {slot.uri ? (
          <Image source={{ uri: slot.uri }} style={styles.docThumb} />
        ) : (
          <View style={[styles.docIcon, { backgroundColor: slot.required ? Primary[50] : theme.background }]}>
            <Icon
              name={uploaded ? 'checkmark-circle' : 'document-outline'}
              size={22}
              color={uploaded ? Status.success : slot.required ? Primary[500] : theme.textSecondary}
            />
          </View>
        )}
      </View>

      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.docLabelRow}>
          <Text style={[styles.docLabel, { color: theme.text }]}>{slot.label}</Text>
          {slot.required && (
            <View style={[styles.reqBadge, { backgroundColor: Status.errorBg }]}>
              <Text style={[styles.reqText, { color: Status.error }]}>Required</Text>
            </View>
          )}
        </View>
        <Text style={[styles.docDesc, { color: theme.textSecondary }]}>{slot.description}</Text>
        {uploaded && (
          <Text style={[styles.uploadedText, { color: Status.success }]}>Uploaded successfully</Text>
        )}
      </View>

      <View style={[styles.docAction, { backgroundColor: uploaded ? Status.successBg : Primary[50] }]}>
        {slot.uploading
          ? <ActivityIndicator size="small" color={Primary[500]} />
          : <Icon
              name={uploaded ? 'checkmark' : 'cloud-upload-outline'}
              size={18}
              color={uploaded ? Status.success : Primary[500]}
            />
        }
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:        { width: 32, alignItems: 'flex-start' },
  headerTitle:    { fontSize: 17, fontWeight: '700' },
  scroll:         { padding: Spacing.four, gap: Spacing.three, paddingBottom: BottomTabInset + 24 },

  /* Status hero */
  statusHero:       { borderRadius: 20, padding: Spacing.four, overflow: 'hidden', gap: Spacing.two },
  statusHeroBubble: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(0,0,0,0.04)', top: -50, right: -30 },
  statusIconWrap:   { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statusHeroText:   { gap: 4 },
  statusTitle:      { fontSize: 18, fontWeight: '800' },
  statusHint:       { fontSize: 13, lineHeight: 19 },

  /* Benefits */
  benefitsCard:   { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  benefitsTitle:  { fontSize: 14, fontWeight: '700' },
  benefitsGrid:   { gap: Spacing.two },
  benefitTile:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: 12, padding: Spacing.two },
  benefitIcon:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  benefitText:    { flex: 1, fontSize: 13, lineHeight: 19 },

  /* Progress */
  progressCard:   { borderRadius: 14, padding: Spacing.three, gap: 8 },
  progressTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressLabel:  { fontSize: 13, fontWeight: '600' },
  progressCount:  { fontSize: 13, fontWeight: '800' },
  progressTrack:  { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:   { height: 6, borderRadius: 3 },
  progressHint:   { fontSize: 11 },

  /* Section label */
  sectionLabel:   { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 4, marginBottom: 4 },

  /* Doc slot */
  docSlot:        { borderRadius: 14, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderWidth: 1.5, borderColor: 'transparent' },
  docThumbWrap:   { width: 50, height: 50 },
  docIcon:        { width: 50, height: 50, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  docThumb:       { width: 50, height: 50, borderRadius: 13 },
  docLabelRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  docLabel:       { fontSize: 14, fontWeight: '600' },
  reqBadge:       { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  reqText:        { fontSize: 10, fontWeight: '700' },
  docDesc:        { fontSize: 12 },
  uploadedText:   { fontSize: 12, fontWeight: '600' },
  docAction:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  /* Submit */
  submitBtn:      { borderRadius: 14, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitBtnText:  { fontSize: 15, fontWeight: '700' },

  /* Info card (approved/pending) */
  infoCard:       { borderRadius: 14, padding: Spacing.three, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  infoIconWrap:   { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  infoText:       { flex: 1, fontSize: 13, lineHeight: 20, paddingTop: 2 },
});
