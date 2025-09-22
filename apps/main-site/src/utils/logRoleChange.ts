import { UserRole } from '../contexts/AuthContext';

export async function logRoleChange(adminId: string, targetUserId: string, newRoles: UserRole[]) {
  try {
    await fetch('/api/role-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId, targetUserId, newRoles, timestamp: Date.now() }),
    });
  } catch (e: any) {
    // 에러는 무시 (로그 기록 실패 시에도 UI 영향 없음)
  }
} 