import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
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

import { uploadCompletionPhoto } from '@/api/jobs';
import { Icon } from '@/components/icon';
import { BottomTabInset, Primary, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function UploadCompletionScreen() {
  const theme  = useTheme();
  const router = useRouter();
  const qc     = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [caption,  setCaption]  = useState('');
  const [done,     setDone]     = useState(false);

  const mutation = useMutation({
    mutationFn: () => uploadCompletionPhoto(id, photoUri!, caption.trim() || undefined),
    onSuccess: () => {
      setDone(true);
      qc.invalidateQueries({ queryKey: ['job', id] });
      qc.invalidateQueries({ queryKey: ['my-jobs'] });
    },
    onError: () => Alert.alert('Error', 'Could not upload photo. Please try again.'),
  });

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required to select a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      quality: 0.85,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets?.length) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true });
    if (!result.canceled && result.assets?.length) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  if (done) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <View style={[styles.successCircle, { backgroundColor: Status.successBg }]}>
            <Icon name="checkmark-circle" size={64} color={Status.success} />
          </View>
          <Text style={[styles.successTitle, { color: theme.text }]}>Photo Uploaded!</Text>
          <Text style={[styles.successHint, { color: theme.textSecondary }]}>
            The completion photo has been submitted. The client will review it to release payment from escrow.
          </Text>
          <Pressable
            style={[styles.btn, { backgroundColor: Primary[500] }]}
            onPress={() => router.back()}
          >
            <Text style={styles.btnText}>Back to Job</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Upload Completion Photo</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.notice, { backgroundColor: Primary[50] }]}>
            <Icon name="information-circle-outline" size={18} color={Primary[600]} />
            <Text style={[styles.noticeText, { color: Primary[700] }]}>
              Upload a clear "after" photo of the completed work. This photo will be shared with the client to trigger escrow release.
            </Text>
          </View>

          {/* Photo area */}
          {photoUri ? (
            <View>
              <Image source={{ uri: photoUri }} style={styles.preview} />
              <Pressable style={styles.retakeRow} onPress={() => setPhotoUri(null)}>
                <Icon name="refresh-outline" size={16} color={Primary[500]} />
                <Text style={[styles.retakeText, { color: Primary[500] }]}>Choose Different Photo</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.photoOptions}>
              <Pressable
                style={[styles.photoBtn, { backgroundColor: theme.backgroundElement }]}
                onPress={takePhoto}
              >
                <Icon name="camera-outline" size={32} color={Primary[500]} />
                <Text style={[styles.photoBtnText, { color: theme.text }]}>Take Photo</Text>
              </Pressable>
              <Pressable
                style={[styles.photoBtn, { backgroundColor: theme.backgroundElement }]}
                onPress={pickPhoto}
              >
                <Icon name="image-outline" size={32} color={Primary[500]} />
                <Text style={[styles.photoBtnText, { color: theme.text }]}>From Library</Text>
              </Pressable>
            </View>
          )}

          {/* Caption */}
          <View>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Caption (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              value={caption}
              onChangeText={setCaption}
              placeholder="Brief note about the completed work…"
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          <Pressable
            style={[styles.submitBtn, { backgroundColor: photoUri ? Primary[500] : theme.backgroundElement, opacity: photoUri ? 1 : 0.5 }]}
            onPress={() => mutation.mutate()}
            disabled={!photoUri || mutation.isPending}
          >
            <Icon name="cloud-upload-outline" size={20} color={photoUri ? '#fff' : theme.textSecondary} />
            <Text style={[styles.submitText, { color: photoUri ? '#fff' : theme.textSecondary }]}>
              {mutation.isPending ? 'Uploading…' : 'Submit Completion Photo'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:       { width: 32, alignItems: 'flex-start' },
  headerTitle:   { flex: 1, fontSize: 17, fontWeight: '700' },
  scroll:        { padding: Spacing.four, gap: Spacing.three, paddingBottom: BottomTabInset + 24 },
  notice:        { borderRadius: 14, padding: Spacing.three, flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  noticeText:    { flex: 1, fontSize: 13, lineHeight: 18 },
  preview:       { width: '100%', height: 280, borderRadius: 16 },
  retakeRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: Spacing.two },
  retakeText:    { fontSize: 14, fontWeight: '600' },
  photoOptions:  { flexDirection: 'row', gap: Spacing.three },
  photoBtn:      { flex: 1, borderRadius: 16, padding: Spacing.four, alignItems: 'center', gap: Spacing.two },
  photoBtnText:  { fontSize: 14, fontWeight: '600' },
  label:         { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input:         { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, textAlignVertical: 'top', minHeight: 80 },
  submitBtn:     { borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitText:    { fontSize: 15, fontWeight: '700' },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five, gap: Spacing.three },
  successCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  successTitle:  { fontSize: 24, fontWeight: '800' },
  successHint:   { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  btn:           { borderRadius: 14, paddingVertical: 14, paddingHorizontal: Spacing.five, marginTop: Spacing.two },
  btnText:       { color: '#fff', fontSize: 15, fontWeight: '700' },
});
