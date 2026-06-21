import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  getDraft,
  submitDraft,
  DRAFT_STATUS_LABEL,
  type MobileProductDraft,
} from '@/api/mobileProductDrafts';

export default function DraftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [draft, setDraft] = useState<MobileProductDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setDraft(await getDraft(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : '상세를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleSubmit() {
    if (!draft) return;
    setSubmitting(true);
    try {
      const updated = await submitDraft(draft.id);
      setDraft(updated);
      Alert.alert('제출됨', '상품 정보가 제출되었습니다. O4O 관리자가 확인 후 반영합니다.');
    } catch (e) {
      Alert.alert('제출 실패', e instanceof Error ? e.message : '제출에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['bottom']}>
        <ActivityIndicator color="#1976d2" />
      </SafeAreaView>
    );
  }

  if (error || !draft) {
    return (
      <SafeAreaView style={styles.centered} edges={['bottom']}>
        <Text style={styles.errorText}>{error ?? '항목을 찾을 수 없습니다.'}</Text>
      </SafeAreaView>
    );
  }

  const seller = readRaw(draft.rawPayload, 'seller');
  const importer = readRaw(draft.rawPayload, 'importer');

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>상태</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {DRAFT_STATUS_LABEL[draft.draftStatus] ?? draft.draftStatus}
            </Text>
          </View>
        </View>

        <Row label="상품명" value={draft.capturedName} />
        <Row label="바코드" value={draft.identifierValue} />
        <Row label="제조원" value={draft.capturedManufacturer} />
        <Row label="판매원" value={seller} />
        <Row label="수입원" value={importer} />
        <Row label="규격/용량" value={draft.capturedSpec ?? draft.capturedUnit} />
        <Row label="메모" value={draft.memo} />
        <Row label="제출일" value={draft.submittedAt?.slice(0, 10)} />
        <Row label="등록일" value={draft.createdAt?.slice(0, 10)} />

        {draft.draftStatus === 'draft' && (
          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>제출하기</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value && value.length > 0 ? value : '—'}</Text>
    </View>
  );
}

function readRaw(raw: Record<string, unknown> | null | undefined, key: string): string | null {
  const v = raw?.[key];
  return typeof v === 'string' ? v : null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  errorText: { fontSize: 15, color: '#64748b' },
  content: { padding: 20, gap: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  badge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#dbeafe' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#1d4ed8' },
  row: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  rowLabel: { fontSize: 12, color: '#94a3b8' },
  rowValue: { fontSize: 15, color: '#1e293b' },
  primaryButton: {
    backgroundColor: '#1976d2',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
});
