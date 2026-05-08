import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/contexts/AuthContext';

export default function HomeScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>O4O 운영앱</Text>
          <Text style={styles.welcome}>
            {user?.email ?? '운영자'}님, 환영합니다
          </Text>
        </View>

        {/* 메뉴 placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>빠른 메뉴</Text>
          <View style={styles.menuGrid}>
            <MenuCard label="상품 관리" emoji="📦" disabled />
            <MenuCard label="주문 현황" emoji="🛒" disabled />
            <MenuCard label="사이니지" emoji="📺" disabled />
            <MenuCard label="카메라/업로드" emoji="📷" disabled />
          </View>
        </View>

        {/* API 상태 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>시스템 정보</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>API 서버</Text>
            <Text style={styles.infoValue}>연결됨</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>버전</Text>
            <Text style={styles.infoValue}>v0.1.0 (Foundation)</Text>
          </View>
        </View>

        {/* 로그아웃 */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuCard({ label, emoji, disabled }: { label: string; emoji: string; disabled?: boolean }) {
  return (
    <View style={[styles.menuCard, disabled && styles.menuCardDisabled]}>
      <Text style={styles.menuEmoji}>{emoji}</Text>
      <Text style={[styles.menuLabel, disabled && styles.menuLabelDisabled]}>{label}</Text>
      {disabled && <Text style={styles.comingSoon}>준비 중</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    gap: 24,
  },
  header: {
    paddingVertical: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  welcome: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  menuCardDisabled: {
    opacity: 0.6,
  },
  menuEmoji: {
    fontSize: 28,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  menuLabelDisabled: {
    color: '#94a3b8',
  },
  comingSoon: {
    fontSize: 11,
    color: '#94a3b8',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  logoutButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: '#dc2626',
    fontSize: 15,
    fontWeight: '600',
  },
});
