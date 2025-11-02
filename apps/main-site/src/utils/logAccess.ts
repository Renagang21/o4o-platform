import { authClient } from '@o4o/auth-client';

export async function logAccess(userId: string, page: string) {
  try {
    await authClient.api.post('/access-log', { userId, page, timestamp: Date.now() });
  } catch (e: any) {
    // 에러는 무시 (로그 기록 실패 시에도 UI 영향 없음)
  }
} 