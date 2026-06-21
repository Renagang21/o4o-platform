import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function CollectStartScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>상품 정보 수집 안내</Text>
          <Text style={styles.noticeText}>
            상품 정보는 O4O 상품 자산 후보로 제출됩니다. O4O 관리자가 확인 후 상품 자산에
            반영합니다.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/collect/new')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>신규 상품 정보 제출 시작</Text>
        </TouchableOpacity>

        <View style={styles.soonSection}>
          <Text style={styles.soonTitle}>다음 단계에서 지원 예정</Text>
          <View style={styles.soonRow}>
            <Text style={styles.soonEmoji}>🔎</Text>
            <Text style={styles.soonLabel}>바코드 스캔</Text>
            <Text style={styles.soonBadge}>준비 중</Text>
          </View>
          <View style={styles.soonRow}>
            <Text style={styles.soonEmoji}>📷</Text>
            <Text style={styles.soonLabel}>이미지 촬영/업로드</Text>
            <Text style={styles.soonBadge}>준비 중</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/drafts')}>
          <Text style={styles.linkButtonText}>내 제출 목록 보기</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, gap: 20 },
  noticeCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    gap: 6,
  },
  noticeTitle: { fontSize: 15, fontWeight: '700', color: '#1d4ed8' },
  noticeText: { fontSize: 13, color: '#1d4ed8', lineHeight: 19 },
  primaryButton: {
    backgroundColor: '#1976d2',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  soonSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  soonTitle: { fontSize: 14, fontWeight: '600', color: '#475569' },
  soonRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  soonEmoji: { fontSize: 20 },
  soonLabel: { flex: 1, fontSize: 14, color: '#94a3b8' },
  soonBadge: {
    fontSize: 11,
    color: '#94a3b8',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  linkButton: { alignItems: 'center', paddingVertical: 8 },
  linkButtonText: { color: '#1976d2', fontSize: 14, fontWeight: '600' },
});
