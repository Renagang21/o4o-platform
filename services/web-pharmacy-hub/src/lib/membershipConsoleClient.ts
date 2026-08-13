/**
 * membershipConsoleClient — Pharmacy-Hub 가입 승인 콘솔 API 어댑터
 *
 * WO-O4O-PHARMACY-HUB-OPERATOR-MEMBERSHIP-CONSOLE-COMMON-CORE-ADOPTION-V1
 *
 * 역할:
 *   `@o4o/operator-core-ui` 의 `OperatorMembersConsolePage` 가 요구하는
 *   `MembersConsoleClient` 계약을, Pharmacy-Hub 가 실제로 보유한 4 개 endpoint 로만 구현한다.
 *
 *     GET   /pharmacy-hub/operator/memberships
 *     GET   /pharmacy-hub/operator/memberships/:id
 *     PATCH /pharmacy-hub/operator/memberships/:id/approve
 *     PATCH /pharmacy-hub/operator/memberships/:id/reject   { reason }
 *
 *   그 외(listAll / stats / batchUpdateStatus / updatePassword)는 **구현하지 않는다**.
 *   백엔드에 존재하지 않는 기능이며(PharmacyHubMembershipConsoleController 주석 참조:
 *   공통 /api/v1/operator/members 라우터에 pharmacy-hub:operator 를 의도적으로 넣지 않았다),
 *   공통 콘솔은 선택 메서드 부재를 그대로 "그 기능 없음"으로 해석한다.
 *
 * 식별자 계약 (중요):
 *   본 콘솔의 행 단위는 **user 가 아니라 service_memberships 한 건**이다.
 *   따라서 `UserData.id` 에는 membership id 를 넣는다 — 승인/반려 endpoint 와
 *   상세 deep link(/operator/memberships/:membershipId) 가 모두 이 값을 쓴다.
 *   회원 수정·비밀번호·삭제처럼 user id 를 요구하는 액션은 승인 전용 모드에서
 *   노출되지 않으므로 id 축이 섞이지 않는다.
 */

import type {
  MembersConsoleClient,
  MembersConsoleListParams,
  MembersConsoleListResponse,
  UserData,
} from '@o4o/operator-core-ui/modules/members';
import { api } from './apiClient';
import { SERVICE_KEY } from '../config/service';

/** 백엔드 목록/상세 응답의 membership row */
export interface MembershipRow {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  role: string | null;
  roleType: string | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  appliedAt: string | null;
  updatedAt: string | null;
}

export interface MembershipDetail extends MembershipRow {
  profile: {
    businessName: string | null;
    contactName: string | null;
    managerPhone: string | null;
    businessNumber: string | null;
    businessAddress: string | null;
  };
}

/** membership row → 공통 콘솔의 UserData. 가입 승인 축 정보를 잃지 않게 매핑한다. */
export function toUserData(row: MembershipRow): UserData {
  return {
    id: row.id, // = membership id (위 식별자 계약)
    email: row.email,
    name: row.name ?? undefined,
    phone: row.phone ?? undefined,
    company: row.company ?? undefined,
    status: row.status,
    role: row.role ?? undefined,
    memberships: [
      {
        id: row.id,
        serviceKey: SERVICE_KEY,
        status: row.status,
        role: row.role ?? '',
        createdAt: row.appliedAt ?? '',
      },
    ],
    createdAt: row.appliedAt ?? '',
    updatedAt: row.updatedAt ?? undefined,
  };
}

export async function fetchMembership(membershipId: string): Promise<MembershipDetail | null> {
  const res = await api.get(`/pharmacy-hub/operator/memberships/${membershipId}`);
  return res.data?.data ?? null;
}

export async function approveMembership(membershipId: string): Promise<void> {
  await api.patch(`/pharmacy-hub/operator/memberships/${membershipId}/approve`);
}

export async function rejectMembership(membershipId: string, reason: string): Promise<void> {
  await api.patch(`/pharmacy-hub/operator/memberships/${membershipId}/reject`, { reason });
}

/**
 * 공통 콘솔 client.
 *
 * `list` 와 `updateStatus` 만 구현한다 — 나머지 선택 메서드를 두지 않는 것이
 * "이 서비스에는 그 기능이 없다"를 UI 에 전달하는 방법이다.
 */
export const membershipConsoleClient: MembersConsoleClient = {
  async list(params: MembersConsoleListParams): Promise<MembersConsoleListResponse> {
    const res = await api.get('/pharmacy-hub/operator/memberships', {
      params: {
        // 상태 미지정 탭(전체)은 백엔드 기본값 pending 이 아니라 전체를 의미한다.
        status: params.status ?? 'all',
        search: params.search || undefined,
        page: params.page,
        limit: params.limit,
      },
    });
    const data = res.data?.data;
    const items: MembershipRow[] = data?.items ?? [];
    return {
      users: items.map(toUserData),
      pagination: data?.pagination ?? { page: params.page, limit: params.limit, total: 0, totalPages: 0 },
    };
  },

  /**
   * 승인/반려. 공통 콘솔은 status 를 'approved' | 'rejected' 로 전달하며,
   * Pharmacy-Hub 는 각각 전용 endpoint 로 라우팅한다.
   * 반려 사유는 백엔드 필수값이라 비어 있으면 호출하지 않는다.
   */
  async updateStatus(
    membershipId: string,
    status: string,
    _currentStatus?: string,
    _user?: UserData,
    options?: { reason?: string },
  ): Promise<void> {
    if (status === 'approved' || status === 'active') {
      await approveMembership(membershipId);
      return;
    }
    if (status === 'rejected') {
      const reason = options?.reason?.trim();
      if (!reason) throw new Error('반려 사유를 입력해 주세요.');
      await rejectMembership(membershipId, reason);
      return;
    }
    // 정지/탈퇴 등은 이 콘솔의 업무 범위가 아니다(엔드포인트 없음).
    throw new Error('지원하지 않는 상태 변경입니다.');
  },
};
