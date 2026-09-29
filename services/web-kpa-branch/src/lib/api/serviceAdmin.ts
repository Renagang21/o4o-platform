/**
 * 분회 서비스 관리자(`kpa-branch:admin`) API 클라이언트
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 (권한 경계 정리)
 *
 * Admin 은 서비스 운영자(`kpa-branch:admin`)만 지정한다. 그 이후의
 *   - 분회 서비스 가입 승인·반려
 *   - 개별 분회 운영자(`kpa-branch:operator`) 지정·해제 — 대상 분회 소속자에 한정
 * 는 분회 서비스 관리자가 이 서비스 화면에서 한다. 실제 경계는 backend
 * `requireKpaBranchScope('kpa-branch:admin')` 와 분회 소속 확인이 강제한다.
 *
 * 조회 실패를 빈 목록으로 삼키지 않는다: 실패는 throw 하고 화면이 오류 상태를 표시한다.
 */
import { api } from '../apiClient';

const BASE = '/kpa-branch/admin';

function unwrap<T>(res: { data: { success: boolean; data: T } }): T {
  return res.data.data;
}

export type ServiceMemberStatus = 'pending' | 'active' | 'rejected';

export interface ServiceMemberRow {
  id: string;
  userId: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  status: string;
  role: string | null;
  rejectionReason: string | null;
  appliedAt: string | null;
  approvedAt: string | null;
  updatedAt: string | null;
}

export async function listServiceMembers(status: ServiceMemberStatus): Promise<ServiceMemberRow[]> {
  const data = unwrap<{ items: ServiceMemberRow[] }>(
    await api.get(`${BASE}/service-members`, { params: { status, limit: 100 } }),
  );
  return data.items ?? [];
}

export async function approveServiceMember(id: string): Promise<void> {
  await api.patch(`${BASE}/service-members/${encodeURIComponent(id)}/approve`);
}

export async function rejectServiceMember(id: string, reason: string): Promise<void> {
  await api.patch(`${BASE}/service-members/${encodeURIComponent(id)}/reject`, { reason });
}

export interface BranchOperatorCandidate {
  userId: string;
  name: string | null;
  email: string | null;
  serviceMembershipStatus: string | null;
  isOperator: boolean;
}

export async function listBranchOperators(
  branchId: string,
): Promise<{ branch: { id: string; name: string }; members: BranchOperatorCandidate[] }> {
  return unwrap(await api.get(`${BASE}/branches/${encodeURIComponent(branchId)}/operators`));
}

export async function designateBranchOperator(branchId: string, userId: string): Promise<{ assigned: boolean }> {
  return unwrap(await api.post(`${BASE}/branches/${encodeURIComponent(branchId)}/operators`, { userId }));
}

export async function releaseBranchOperator(branchId: string, userId: string): Promise<{ removed: boolean }> {
  return unwrap(
    await api.delete(`${BASE}/branches/${encodeURIComponent(branchId)}/operators/${encodeURIComponent(userId)}`),
  );
}

/** 백엔드 오류 메시지 추출 — `{ success:false, error, code }` 표준. */
export function errorMessage(e: unknown, fallback: string): string {
  const d = (e as { response?: { data?: { error?: unknown; message?: unknown } } })?.response?.data;
  const msg = typeof d?.error === 'string' ? d.error : typeof d?.message === 'string' ? d.message : null;
  return msg ?? fallback;
}
