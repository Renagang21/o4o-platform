import { communityMemberPage, type CommunityMemberListOptions, type CommunityMemberPage } from './communityMemberList';
/**
 * 개별 커뮤니티 운영자 — 가입 신청 심사 API
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1
 *
 * 커뮤니티 서비스 관리자(`community:admin`)가 아니라 **그 커뮤니티의 운영자**
 * (`community_memberships.role IN ('admin','operator')` · active)가 자기 커뮤니티의 가입 신청만 심사한다.
 * 실제 경계는 backend `resolveCommunity` → `requireCommunityScope('operator')` 다
 * (개체 일치 · 개체 가입 active · 운영자 역할 · 커뮤니티 서비스 가입 active).
 *
 * 조회 실패를 빈 목록으로 삼키지 않는다: 실패는 throw 하고 화면이 오류 상태를 표시한다.
 */
import { api } from '../apiClient';

const BASE = '/communities';

export interface OperatedCommunity {
  id: string;
  slug: string;
  name: string;
  pendingCount: number;
  canRestrictMembers: boolean;
}

export type JoinRequestStatus = 'pending' | 'active' | 'rejected' | 'suspended' | 'withdrawn';

export interface JoinRequestRow {
  id: string;
  userId: string;
  role: 'admin' | 'operator' | 'member';
  status: JoinRequestStatus;
  createdAt: string;
  name: string | null;
  /** 앞 2자만 남긴 이메일 — 원문은 내려오지 않는다. */
  emailMasked: string | null;
  serviceMembershipStatus: string | null;
}

export async function listOperatedCommunities(): Promise<OperatedCommunity[]> {
  const res = await api.get(`${BASE}/operating`);
  return res.data?.data?.communities ?? [];
}

export async function listJoinRequests(slug: string, status: JoinRequestStatus = 'pending', options: CommunityMemberListOptions = {}): Promise<CommunityMemberPage<JoinRequestRow>> {
  const res = await api.get(`${BASE}/${encodeURIComponent(slug)}/memberships`, { params: { ...options, status } });
  return communityMemberPage<JoinRequestRow>(res.data?.data?.memberships ?? [], res.data?.data?.pagination);
}

export async function approveJoinRequest(slug: string, membershipId: string): Promise<void> {
  await api.post(`${BASE}/${encodeURIComponent(slug)}/memberships/${encodeURIComponent(membershipId)}/approve`);
}

export async function rejectJoinRequest(slug: string, membershipId: string, reason: string | null): Promise<void> {
  await api.post(`${BASE}/${encodeURIComponent(slug)}/memberships/${encodeURIComponent(membershipId)}/reject`, {
    reason,
  });
}

/** 심사 대상 행에서 승인 버튼을 열어도 되는가 — 판정은 backend, 이것은 안내용. */
export function canApproveJoin(row: Pick<JoinRequestRow, 'status' | 'serviceMembershipStatus'>): boolean {
  return row.status === 'pending' && (row.serviceMembershipStatus === null || row.serviceMembershipStatus === 'active');
}

/** 백엔드 오류 메시지 — `{ success:false, error, code }` 표준. */
export function communityOperatorErrorMessage(e: unknown, fallback: string): string {
  const d = (e as { response?: { data?: { error?: unknown } } })?.response?.data;
  return typeof d?.error === 'string' ? d.error : fallback;
}

export async function changeCommunityMember(slug: string, membershipId: string, action: 'suspend' | 'restore' | 'withdraw', reason: string): Promise<void> {
  await api.post(`${BASE}/${encodeURIComponent(slug)}/memberships/${encodeURIComponent(membershipId)}/${action}`, { reason });
}

export interface CommunityMembershipChange {
  id: string; action: string; before_role: string | null; after_role: string;
  before_status: string | null; after_status: string; reason: string | null;
  created_at: string; actor_name: string | null;
}
export async function listCommunityMemberHistory(slug: string, membershipId: string): Promise<CommunityMembershipChange[]> {
  const res = await api.get(`${BASE}/${encodeURIComponent(slug)}/memberships/${encodeURIComponent(membershipId)}/history`);
  return res.data?.data?.changes ?? [];
}
