import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function AppLayout() {
  const { token } = useAuth();

  // 로그인 안 된 경우 로그인 화면으로 리다이렉트
  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1976d2' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="collect/index" options={{ title: '상품 수집' }} />
      <Stack.Screen name="collect/new" options={{ title: '상품 정보 입력' }} />
      <Stack.Screen name="collect/done" options={{ title: '제출 완료', headerBackVisible: false }} />
      <Stack.Screen name="drafts/index" options={{ title: '내 제출 목록' }} />
      <Stack.Screen name="drafts/[id]" options={{ title: '제출 상세' }} />
    </Stack>
  );
}
