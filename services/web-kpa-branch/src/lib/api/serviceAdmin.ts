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
import type { ApproveResult, BranchRequestStatus } from '../branchRequest';

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

// ── 분회 개설 신청 심사 ────────────────────────────────────────────────────────
// 승인 주체는 kpa-branch:admin 이다(개별 분회 운영자 역할은 전역이라 다른 분회 개설을 승인하게 된다).
// 승인하면 신청자가 첫 분회 운영자가 된다. 주소 충돌·예약어는 승인 시점에 backend 가 다시 검사한다.

export interface BranchCreationRequest {
  id: string;
  requester_user_id: string;
  desired_slug: string;
  name: string;
  parent_id: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  status: BranchRequestStatus;
  reason: string | null;
  created_branch_id: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface PendingBranchRequest extends BranchCreationRequest {
  requester_name: string | null;
  requester_email: string | null;
  /** 예약어 주소 신청 — 승인하면 slug_conflict 로 돌아간다. */
  reserved_slug: boolean;
}

export async function listBranchRequests(): Promise<PendingBranchRequest[]> {
  const data = unwrap<{ requests: PendingBranchRequest[] }>(await api.get(`${BASE}/branch-requests`));
  return data.requests ?? [];
}

export async function approveBranchRequest(requestId: string): Promise<ApproveResult> {
  return unwrap(await api.post(`${BASE}/branch-requests/${encodeURIComponent(requestId)}/approve`));
}

export async function rejectBranchRequest(requestId: string, reason: string): Promise<void> {
  await api.post(`${BASE}/branch-requests/${encodeURIComponent(requestId)}/reject`, { reason });
}

/** 신청자 — 인증만 요구한다(아직 어느 분회에도 속하지 않은 사람이 신청한다). */
export async function submitBranchRequest(input: {
  name: string;
  slug: string;
  description?: string;
  address?: string;
  phone?: string;
}): Promise<BranchCreationRequest> {
  return unwrap(await api.post('/kpa-branch/branch-requests', input));
}

export async function listMyBranchRequests(): Promise<BranchCreationRequest[]> {
  const data = unwrap<{ requests: BranchCreationRequest[] }>(await api.get('/kpa-branch/branch-requests/mine'));
  return data.requests ?? [];
}

/** 백엔드 오류 메시지 추출 — `{ success:false, error, code }` 표준. */
export function errorMessage(e: unknown, fallback: string): string {
  const d = (e as { response?: { data?: { error?: unknown; message?: unknown } } })?.response?.data;
  const msg = typeof d?.error === 'string' ? d.error : typeof d?.message === 'string' ? d.message : null;
  return msg ?? fallback;
}
