import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { createDraft, submitDraft, type CreateDraftPayload } from '@/api/mobileProductDrafts';

export default function CollectNewScreen() {
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [seller, setSeller] = useState('');
  const [importer, setImporter] = useState('');
  const [spec, setSpec] = useState('');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);

  function buildPayload(): CreateDraftPayload | null {
    const trimmedName = name.trim();
    const trimmedBarcode = barcode.trim();
    if (!trimmedName && !trimmedBarcode) {
      Alert.alert('입력 확인', '상품명 또는 바코드 중 하나는 입력해야 합니다.');
      return null;
    }

    const rawPayload: Record<string, unknown> = { mobileCollectionVersion: 'shell-v1' };
    if (seller.trim()) rawPayload.seller = seller.trim();
    if (importer.trim()) rawPayload.importer = importer.trim();

    return {
      sourceApp: 'mobile_app',
      ...(trimmedBarcode && { identifierType: 'barcode', identifierValue: trimmedBarcode }),
      ...(trimmedName && { capturedName: trimmedName }),
      ...(manufacturer.trim() && { capturedManufacturer: manufacturer.trim() }),
      ...(spec.trim() && { capturedSpec: spec.trim() }),
      ...(memo.trim() && { memo: memo.trim() }),
      rawPayload,
    };
  }

  async function handleSaveOnly() {
    const payload = buildPayload();
    if (!payload) return;
    setLoading(true);
    try {
      await createDraft(payload);
      Alert.alert('임시 저장됨', '작성 중 상태로 저장되었습니다. 내 제출 목록에서 제출할 수 있습니다.', [
        { text: '목록으로', onPress: () => router.replace('/drafts') },
      ]);
    } catch (error) {
      Alert.alert('저장 실패', error instanceof Error ? error.message : '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    const payload = buildPayload();
    if (!payload) return;
    setLoading(true);
    try {
      const draft = await createDraft(payload);
      await submitDraft(draft.id);
      router.replace('/collect/done');
    } catch (error) {
      Alert.alert(
        '제출 실패',
        error instanceof Error ? error.message : '제출에 실패했습니다. 내 제출 목록에서 상태를 확인해주세요.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Field label="상품명" value={name} onChangeText={setName} placeholder="상품명 입력" />
          <Field
            label="바코드"
            value={barcode}
            onChangeText={setBarcode}
            placeholder="바코드 번호 (직접 입력)"
            keyboardType="number-pad"
          />
          <Text style={styles.hint}>상품명 또는 바코드 중 하나는 필수입니다.</Text>

          <Field
            label="제조원"
            value={manufacturer}
            onChangeText={setManufacturer}
            placeholder="제조원 (선택)"
          />
          <Field label="판매원" value={seller} onChangeText={setSeller} placeholder="판매원 (선택)" />
          <Field label="수입원" value={importer} onChangeText={setImporter} placeholder="수입원 (선택)" />
          <Field label="규격/용량" value={spec} onChangeText={setSpec} placeholder="예: 100ml, 30정 (선택)" />
          <Field
            label="메모"
            value={memo}
            onChangeText={setMemo}
            placeholder="현장 메모 (선택)"
            multiline
          />

          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>
              📷 이미지 촬영/업로드는 다음 단계에서 지원됩니다.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>제출하기</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, loading && styles.buttonDisabled]}
            onPress={handleSaveOnly}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>임시 저장</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad';
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
        multiline={multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  flex: { flex: 1 },
  content: { padding: 20, gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  hint: { fontSize: 12, color: '#94a3b8', marginTop: -6 },
  imagePlaceholder: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  imagePlaceholderText: { fontSize: 13, color: '#94a3b8' },
  primaryButton: {
    backgroundColor: '#1976d2',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  secondaryButtonText: { color: '#475569', fontSize: 15, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
});
