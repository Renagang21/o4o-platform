import { UserRole } from '../contexts/AuthContext';
import { authClient } from '@o4o/auth-client';

export async function logRoleChange(adminId: string, targetUserId: string, newRoles: UserRole[]) {
  try {
    await authClient.api.post('/role-history', { adminId, targetUserId, newRoles, timestamp: Date.now() });
  } catch (e: any) {
    // 에러는 무시 (로그 기록 실패 시에도 UI 영향 없음)
  }
} 