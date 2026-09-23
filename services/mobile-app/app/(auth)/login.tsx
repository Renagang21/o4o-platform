/**
 * LoginScreen — O4O 운영앱
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
 *   O4O 인증에 비밀번호가 존재하지 않는다(Identity = Google sub → users.id).
 *   모바일 Google 로그인은 네이티브 SDK 의존성이 필요하므로 이 WO 범위 밖이며(의존성 변경 = 중지 조건),
 *   그때까지 앱 로그인 화면은 안내만 한다. 비밀번호 폼은 제거했다.
 */
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const WEB_LOGIN_URL = 'https://neture.co.kr/login';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.inner}>
        <Text style={styles.title}>O4O 운영앱</Text>
        <Text style={styles.subtitle}>운영자 로그인</Text>

        <Text style={styles.notice}>
          O4O 로그인은 Google 계정 하나로 통합되었습니다. 앱의 Google 로그인은 준비 중이며,
          그 전까지는 웹에서 이용해 주세요.
        </Text>

        <TouchableOpacity style={styles.button} onPress={() => { void Linking.openURL(WEB_LOGIN_URL); }}>
          <Text style={styles.buttonText}>웹에서 로그인</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  notice: {
    marginTop: 32,
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#1976d2',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
