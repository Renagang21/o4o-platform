/**
 * MembersPage — Pharmacy-Hub 회원 관리 (thin wrapper)
 *
 * WO-O4O-PHARMACYHUB-OPERATOR-COMMUNITY-AND-COMMON-CAPABILITY-FULL-ADOPTION-V1
 *
 * 공통 `@o4o/operator-core-ui/modules/members` + 공통 backend `/api/v1/operator/members`
 * (serviceScope 로 pharmacy-hub 격리). 이전에는 allowlist 에 pharmacy-hub 가 없어
 * 이 콘솔을 쓸 수 없었고 승인 전용 콘솔만 있었다 — 본 WO 에서 allowlist 한 줄만 추가해 채택한다.
 *
 * 가입 신청 관리(/operator/memberships) 와의 축 구분:
 *   - 가입 신청 관리 = service_memberships **한 건** 단위 승인/반려 (행 = membership)
 *   - 회원 관리(본 화면) = **user** 단위 회원 목록·상태·권한 조회 (행 = user)
 *
 * 파괴적 액션(비밀번호 변경 / 회원 삭제 / 회원 정보 수정)은 주입하지 않는다 —
 * 공통 콘솔은 선택 메서드/슬롯 부재를 그대로 "그 기능 없음"으로 해석한다.
 */

import {
  OperatorMembersConsolePage,
  type MembersConsoleClient,
  type MembersConsoleListParams,
  type UserData,
} from '@o4o/operator-core-ui/modules/members';
import { api } from '../../lib/apiClient';
import { SERVICE_KEY } from '../../config/service';

// ─── Role display ────────────────────────────────────────────
// 참여 유형(매장/공급자)과 운영 권한(운영자/관리자)을 분리 표시한다.

const OPERATIONAL_ROLES = new Set([
  'pharmacy-hub:operator',
  'pharmacy-hub:admin',
  'platform:super_admin',
  'operator',
  'admin',
  'user',
]);

const ROLE_DISPLAY: Record<string, string> = {
  general: '일반 회원',
  'pharmacy-hub:store_owner': '매장(약국)',
  store_owner: '매장(약국)',
};

function phTokens(u: UserData): Set<string> {
  return new Set<string>([
    ...(u.roles ?? []),
    ...(u.role ? [u.role] : []),
    ...(u.memberships ?? []).filter((m) => m.serviceKey === SERVICE_KEY).map((m) => m.role),
  ]);
}

function getPrimaryRole(u: UserData): string {
  const m = u.memberships?.find((x) => x.serviceKey === SERVICE_KEY);
  const role = m?.role || u.roles?.[0] || '';
  if (!role || OPERATIONAL_ROLES.has(role)) return 'general';
  return role;
}

function getOperatorRole(u: UserData): '관리자' | '운영자' | null {
  const t = phTokens(u);
  if (t.has('platform:super_admin') || t.has('pharmacy-hub:admin')) return '관리자';
  if (t.has('pharmacy-hub:operator')) return '운영자';
  return null;
}

// ─── Client adapter ──────────────────────────────────────────

const membersClient: MembersConsoleClient = {
  async list(params: MembersConsoleListParams) {
    const usp = new URLSearchParams();
    usp.set('page', String(params.page));
    usp.set('limit', String(params.limit));
    usp.set('serviceKey', SERVICE_KEY);
    if (params.status) usp.set('status', params.status);
    if (params.search) usp.set('search', params.search);
    if (params.sortBy) usp.set('sortBy', params.sortBy);
    if (params.sortOrder) usp.set('sortOrder', params.sortOrder);
    const { data } = await api.get(`/operator/members?${usp}`);
    return { users: data.users || [], pagination: data.pagination };
  },
  async listAll() {
    const { data } = await api.get(`/operator/members?limit=1000&serviceKey=${SERVICE_KEY}`);
    return { users: data.users || [] };
  },
  async stats() {
    const { data } = await api.get(`/operator/members/stats?serviceKey=${SERVICE_KEY}`);
    return data;
  },
  async updateStatus(userId, status) {
    // WO-O4O-OPERATOR-CROSSSERVICE-MEMBER-DETAIL-ID-AND-STATUS-CONTRACT-CLOSURE-V1:
    //   lifecycle write 는 대상 serviceKey 의 membership 에만 적용된다 (타 서비스 fan-out 차단).
    await api.patch(`/operator/members/${userId}/status`, { status, serviceKey: SERVICE_KEY });
  },
};

export default function MembersPage() {
  return (
    <OperatorMembersConsolePage
      serviceKey={SERVICE_KEY}
      client={membersClient}
      // WO-O4O-OPERATOR-CROSSSERVICE-MEMBER-DETAIL-ID-AND-STATUS-CONTRACT-CLOSURE-V1:
      //   drawer → 전체 상세 deep link. `u.id` = users.id (공통 콘솔 canonical 축).
      fullDetailHref={(u) => `/operator/members/${u.id}`}
      serverSort
      getPrimaryRole={getPrimaryRole}
      roleDisplayMap={ROLE_DISPLAY}
      roleColumnHeader="회원 유형"
      extraColumns={[
        {
          key: 'operatorRole',
          header: '운영 권한',
          width: '120px',
          render: (_v, user) => {
            const op = getOperatorRole(user);
            if (!op) return <span className="text-xs text-slate-400">일반 회원</span>;
            const cls =
              op === '관리자'
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-violet-50 border-violet-200 text-violet-700';
            return (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${cls}`}
              >
                {op}
              </span>
            );
          },
        },
      ]}
      roleTabs={[
        { key: 'store_owner', label: '매장(약국)', roleFilter: ['pharmacy-hub:store_owner', 'store_owner'] },
      ]}
      // 공통 콘솔이 마지막에 built-in `pending`(가입 신청) 탭을 항상 덧붙인다.
      // 여기서 pending 을 또 선언하면 "가입 신청" 탭이 2개로 중복 렌더된다.
      statusTabs={[
        { key: 'status-active', label: '활성', status: 'active' },
        { key: 'status-rejected', label: '반려', status: 'rejected' },
      ]}
    />
  );
}
