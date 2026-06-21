import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
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
            {user?.displayName ?? user?.email ?? '운영자'}님, 환영합니다
          </Text>
        </View>

        {/* 상품 수집 메뉴 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>상품 수집</Text>
          <View style={styles.menuGrid}>
            <MenuCard
              label="상품 수집 시작"
              emoji="📝"
              onPress={() => router.push('/collect')}
            />
            <MenuCard
              label="내 제출 목록"
              emoji="📋"
              onPress={() => router.push('/drafts')}
            />
            <MenuCard label="이미지 촬영/업로드" emoji="📷" disabled />
            <MenuCard label="바코드 스캔" emoji="🔎" disabled />
          </View>
        </View>

        {/* 안내 */}
        <View style={styles.noticeCard}>
          <Text style={styles.noticeText}>
            상품 정보는 O4O 상품 자산 후보로 제출됩니다. O4O 관리자가 확인 후 상품 자산에
            반영합니다.
          </Text>
        </View>

        {/* 시스템 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>시스템 정보</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>API 서버</Text>
            <Text style={styles.infoValue}>연결됨</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>버전</Text>
            <Text style={styles.infoValue}>v0.1.0 (Collection Shell)</Text>
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

function MenuCard({
  label,
  emoji,
  disabled,
  onPress,
}: {
  label: string;
  emoji: string;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuCard, disabled && styles.menuCardDisabled]}
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.menuEmoji}>{emoji}</Text>
      <Text style={[styles.menuLabel, disabled && styles.menuLabelDisabled]}>{label}</Text>
      {disabled && <Text style={styles.comingSoon}>준비 중</Text>}
    </TouchableOpacity>
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
    textAlign: 'center',
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
  noticeCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  noticeText: {
    fontSize: 13,
    color: '#1d4ed8',
    lineHeight: 19,
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
