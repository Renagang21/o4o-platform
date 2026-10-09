/**
 * 커뮤니티 서비스 관리자(`community:admin`) API — WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1
 *
 * Admin은 서비스 Admin/Operator를 지정한다. 그 이후의
 *   - 커뮤니티 개설 신청 심사(`/communities/requests*`)
 *   - 개별 커뮤니티 운영자 지정·해제(`/communities/admin/communities*`) — 그 커뮤니티의 승인된 회원 중에서
 * 는 커뮤니티 서비스 운영자가 이 화면에서 한다. 개설 심사는 서비스 Admin/Operator, 개별 운영자 지정은 서비스 Admin만 허용하며 실제 경계는 backend가 판정한다.
 *
 * 조회 실패를 빈 목록으로 삼키지 않는다: 실패는 throw 하고 화면이 오류 상태를 표시한다.
 */
import { api } from '../apiClient';

const BASE = '/communities';

export interface CommunityCreationRequestRow {
  id: string;
  requesterUserId: string;
  desiredSlug: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
}

export interface CommunityAdminRow {
  id: string;
  slug: string;
  name: string;
  status: string;
  operatorCount: number;
  memberCount: number;
}

export interface CommunityMemberRow {
  membershipId: string;
  userId: string;
  name: string | null;
  email: string | null;
  role: 'operator' | 'member';
  serviceMembershipStatus: string | null;
}

export async function listCreationRequests(): Promise<CommunityCreationRequestRow[]> {
  const res = await api.get(`${BASE}/requests`);
  return res.data?.data?.requests ?? [];
}

export async function approveCreationRequest(
  id: string,
): Promise<{ outcome: 'created' | 'slug_conflict'; slug?: string }> {
  const res = await api.post(`${BASE}/requests/${encodeURIComponent(id)}/approve`);
  return res.data?.data;
}

export async function rejectCreationRequest(id: string, reason: string): Promise<void> {
  await api.post(`${BASE}/requests/${encodeURIComponent(id)}/reject`, { reason });
}

export async function listAdminCommunities(): Promise<CommunityAdminRow[]> {
  const res = await api.get(`${BASE}/admin/communities`);
  return res.data?.data?.communities ?? [];
}

export async function listCommunityMembers(communityId: string): Promise<CommunityMemberRow[]> {
  const res = await api.get(`${BASE}/admin/communities/${encodeURIComponent(communityId)}/members`);
  return res.data?.data?.members ?? [];
}

export async function setCommunityMemberRole(
  communityId: string,
  membershipId: string,
  role: 'operator' | 'member',
): Promise<void> {
  await api.post(
    `${BASE}/admin/communities/${encodeURIComponent(communityId)}/members/${encodeURIComponent(membershipId)}/role`,
    { role },
  );
}

/** 백엔드 오류 메시지 — `{ success:false, error, code }` 표준. */
export function communityAdminErrorMessage(e: unknown, fallback: string): string {
  const d = (e as { response?: { data?: { error?: unknown } } })?.response?.data;
  return typeof d?.error === 'string' ? d.error : fallback;
}
