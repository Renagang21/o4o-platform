import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  listDrafts,
  DRAFT_STATUS_LABEL,
  type MobileProductDraft,
} from '@/api/mobileProductDrafts';

export default function DraftListScreen() {
  const [items, setItems] = useState<MobileProductDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await listDrafts({ limit: 50 });
      setItems(result.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : '목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['bottom']}>
        <ActivityIndicator color="#1976d2" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#1976d2" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {error ?? '제출한 상품 정보가 없습니다.'}
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/collect/new')}>
              <Text style={styles.emptyButtonText}>상품 정보 제출 시작</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push(`/drafts/${item.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.capturedName || item.identifierValue || '(이름 없음)'}
              </Text>
              {!!item.capturedManufacturer && (
                <Text style={styles.rowSub} numberOfLines={1}>
                  {item.capturedManufacturer}
                </Text>
              )}
              <Text style={styles.rowDate}>{formatDate(item.createdAt)}</Text>
            </View>
            <StatusBadge status={item.draftStatus} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

function StatusBadge({ status }: { status: MobileProductDraft['draftStatus'] }) {
  return (
    <View style={[styles.badge, badgeStyleFor(status)]}>
      <Text style={styles.badgeText}>{DRAFT_STATUS_LABEL[status] ?? status}</Text>
    </View>
  );
}

function badgeStyleFor(status: MobileProductDraft['draftStatus']) {
  switch (status) {
    case 'submitted':
    case 'candidate_created':
    case 'reviewed':
      return { backgroundColor: '#dbeafe' };
    case 'rejected':
      return { backgroundColor: '#fee2e2' };
    case 'archived':
      return { backgroundColor: '#f1f5f9' };
    default:
      return { backgroundColor: '#fef9c3' };
  }
}

function formatDate(iso: string): string {
  // ISO 문자열에서 날짜 부분만 (런타임 Date 의존 최소화)
  return iso?.slice(0, 10) ?? '';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  listContent: { padding: 16, gap: 10 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', padding: 24, gap: 16 },
  emptyText: { fontSize: 15, color: '#64748b', textAlign: 'center' },
  emptyButton: {
    backgroundColor: '#1976d2',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  emptyButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  row: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  rowSub: { fontSize: 13, color: '#64748b' },
  rowDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  badge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#334155' },
});
