/**
 * KCosmeticsAdminMembersPage — Admin 회원 관리 (완전 삭제 포함)
 *
 * WO-O4O-KCOSMETICS-ADMIN-MEMBER-HARD-DELETE-V1:
 *   Admin 전용 회원 관리. Operator (/operator/members)는 soft delete(탈퇴처리)만 가능.
 *   Admin (/admin/members)는 soft delete + hard delete(완전삭제) 모두 가능.
 *
 * WO-O4O-MEMBER-MANAGEMENT-ADMIN-ROLETAB-STATUSTAB-ALIGNMENT-V1:
 *   roleTabs/statusTabs/extraColumns/getPrimaryRole를 operator UsersPage 기준과 정렬.
 *   roleFilter: cosmetics:store_owner/store_owner/customer 추가, buyer key → consumer.
 *   statusTabs: pending(가입 신청) 탭 추가.
 *   extraColumns: 운영 권한 컬럼 추가.
 *   ※ pharmacist/supplier K-Cos 자체 회원 분류 재도입 금지 (WO-O4O-KCOSMETICS-OPERATOR-VOCABULARY-PHARMACY-CLEANUP-V2)
 *
 * Hard delete 정책:
 *   - users row 삭제 포함 (service_memberships, role_assignments, cosmetics 관련 데이터)
 *   - 포럼 활동(게시글/댓글) 있으면 경고 표시
 *   - 되돌릴 수 없음 — 2단계 확인 필요
 *   - single member 단건 처리 (batch hard delete 금지)
 */

import {
  OperatorMembersConsolePage,
  type MembersConsoleClient,
  type MembersConsoleListParams,
  type UserData,
  OperatorMemberDeleteFlow,
  type NormalizedDeleteRisk,
} from '@o4o/operator-core-ui/modules/members';
import { toast } from '@o4o/error-handling';
import { api } from '../../lib/apiClient';
import EditUserModal from '../operator/EditUserModal';

// ─── Role display helpers (operator UsersPage 기준 정렬) ──────
// WO-O4O-MEMBER-MANAGEMENT-ADMIN-ROLETAB-STATUSTAB-ALIGNMENT-V1

function kcosAdminTokens(u: UserData): Set<string> {
  return new Set<string>([
    ...(u.roles ?? []),
    ...(u.role ? [u.role] : []),
    ...(u.memberships ?? []).filter((m) => m.serviceKey === 'k-cosmetics').map((m) => m.role),
  ]);
}

const KCOS_ADMIN_OPERATIONAL = new Set([
  'operator', 'admin', 'user',
  'cosmetics:operator', 'cosmetics:admin',
  'k-cosmetics:operator', 'k-cosmetics:admin',
  'platform:super_admin',
]);

function kcosAdminGetPrimaryRole(u: UserData): string {
  const m = u.memberships?.find((x) => x.serviceKey === 'k-cosmetics');
  const role = m?.role || u.roles?.[0] || '';
  if (!role || KCOS_ADMIN_OPERATIONAL.has(role)) return 'general';
  return role;
}

// ※ pharmacist/supplier K-Cos 자체 회원 분류 미포함 (WO-O4O-KCOSMETICS-OPERATOR-VOCABULARY-PHARMACY-CLEANUP-V2)
const KCOS_ADMIN_ROLE_DISPLAY: Record<string, string> = {
  general: '일반 회원',
  'cosmetics:store_owner': '판매자',
  store_owner: '판매자',
  seller: '판매자',
  consumer: '소비자',
  customer: '소비자',
  partner: '파트너',
};

function getKcosAdminOperatorRole(u: UserData): '관리자' | '운영자' | null {
  const t = kcosAdminTokens(u);
  if (t.has('platform:super_admin') || t.has('cosmetics:admin') || t.has('k-cosmetics:admin') || t.has('admin')) {
    return '관리자';
  }
  if (t.has('cosmetics:operator') || t.has('k-cosmetics:operator') || t.has('operator')) return '운영자';
  return null;
}

// ─── Client adapter ──────────────────────────────────────────

const adminMembersClient: MembersConsoleClient = {
  async list(params: MembersConsoleListParams) {
    const usp = new URLSearchParams();
    usp.set('page', String(params.page));
    usp.set('limit', String(params.limit));
    usp.set('serviceKey', 'k-cosmetics');
    if (params.status) usp.set('status', params.status);
    if (params.search) usp.set('search', params.search);
    const { data } = await api.get(`/operator/members?${usp}`);
    return { users: data.users || [], pagination: data.pagination };
  },
  async listAll() {
    const { data } = await api.get('/operator/members?limit=1000&serviceKey=k-cosmetics');
    return { users: data.users || [] };
  },
  async stats() {
    const { data } = await api.get('/operator/members/stats?serviceKey=k-cosmetics');
    return data;
  },
  async updateStatus(userId, status) {
    await api.patch(`/operator/members/${userId}/status`, { status });
  },
  async batchUpdateStatus(ids, status) {
    const { data } = await api.post('/operator/members/batch-status', { ids, status });
    return data;
  },
  async updatePassword(userId, password) {
    await api.put(`/operator/members/${userId}`, { password });
  },
};

// ─── Delete Flow adapters (OperatorMemberDeleteFlow용) ────────
// WO-O4O-OPERATOR-MEMBERS-DELETE-FLOW-COMMONIZATION-V1

async function kcosFetchDeleteRisk(userId: string): Promise<NormalizedDeleteRisk> {
  const { data } = await api.get(`/operator/members/${userId}/delete-risk`);
  const r = data?.data ?? data;
  return {
    canHardDelete: r.canHardDelete,
    riskItems: [
      { label: '서비스 멤버십', count: r.risks.serviceMemberships },
      { label: '포럼 게시글',   count: r.risks.forumPosts },
      { label: '포럼 댓글',     count: r.risks.forumComments },
      { label: '감사 로그',     count: r.risks.auditLogs },
    ],
    hasActivityData: r.risks.forumPosts > 0 || r.risks.forumComments > 0,
    memberStatus: r.user?.status ?? '',
  };
}

async function kcosExecuteDelete(userId: string, mode: 'soft' | 'hard'): Promise<void> {
  await api.delete(`/operator/members/${userId}?mode=${mode}`);
  toast.success(mode === 'hard' ? '완전 삭제 완료' : '탈퇴 처리 완료');
}


// ─── Main Component ──────────────────────────────────────────

export default function KCosmeticsAdminMembersPage() {
  return (
    <OperatorMembersConsolePage
      serviceKey="k-cosmetics"
      client={adminMembersClient}
      getPrimaryRole={kcosAdminGetPrimaryRole}
      roleDisplayMap={KCOS_ADMIN_ROLE_DISPLAY}
      roleColumnHeader="회원 유형"
      roleTabs={[
        // WO-O4O-MEMBER-MANAGEMENT-ADMIN-ROLETAB-STATUSTAB-ALIGNMENT-V1:
        //   cosmetics:store_owner/store_owner 추가, buyer key → consumer (operator 기준 정렬)
        //   ※ pharmacist/supplier K-Cos 자체 회원 분류 미도입 (WO-O4O-KCOSMETICS-OPERATOR-VOCABULARY-PHARMACY-CLEANUP-V2)
        { key: 'seller', label: '판매자', roleFilter: ['cosmetics:store_owner', 'seller', 'store_owner'] },
        { key: 'consumer', label: '소비자', roleFilter: ['consumer', 'customer'] },
      ]}
      statusTabs={[
        // pending 탭 추가 — operator 기준 정렬
        { key: 'status-pending',   label: '가입 신청', status: 'pending' },
        { key: 'status-active',    label: '활성', status: 'active' },
        { key: 'status-rejected',  label: '거절', status: 'rejected' },
        { key: 'status-suspended', label: '정지', status: 'suspended' },
        { key: 'status-withdrawn', label: '탈퇴', status: 'withdrawn' },
      ]}
      extraColumns={[
        {
          key: 'operatorRole',
          header: '운영 권한',
          width: '120px',
          render: (_v: unknown, user: UserData) => {
            const op = getKcosAdminOperatorRole(user);
            if (!op) return <span className="text-xs text-slate-400">일반 회원</span>;
            const cls =
              op === '관리자'
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-violet-50 border-violet-200 text-violet-700';
            return (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${cls}`}>
                {op}
              </span>
            );
          },
        },
      ]}
      renderDeleteFlow={({ user, onClose, onDeleted }) => (
        <OperatorMemberDeleteFlow
          user={user}
          serviceLabel="K-Cosmetics"
          fetchDeleteRisk={kcosFetchDeleteRisk}
          executeDelete={kcosExecuteDelete}
          onClose={onClose}
          onDeleted={onDeleted}
        />
      )}
      renderEditModal={({ user, onClose, onSuccess }) => (
        <EditUserModal userId={user.id} onClose={onClose} onSuccess={onSuccess} />
      )}
      tableId="kcos-admin-members"
    />
  );
}
