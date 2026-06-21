import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function CollectDoneScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.emoji}>✅</Text>
        <Text style={styles.title}>상품 정보가 제출되었습니다.</Text>
        <Text style={styles.subtitle}>O4O 관리자가 확인 후 상품 자산에 반영합니다.</Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/drafts')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>내 제출 목록 보기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace('/collect/new')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>다른 상품 계속 제출</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkButton} onPress={() => router.replace('/(app)')}>
            <Text style={styles.linkButtonText}>홈으로</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  emoji: { fontSize: 56 },
  title: { fontSize: 20, fontWeight: '700', color: '#1e293b', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 16 },
  actions: { width: '100%', gap: 12, marginTop: 8 },
  primaryButton: {
    backgroundColor: '#1976d2',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
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
  linkButton: { alignItems: 'center', paddingVertical: 8 },
  linkButtonText: { color: '#1976d2', fontSize: 14, fontWeight: '600' },
});
