/**
 * GlycoPharmAdminMembersPage — Admin 회원 관리 (완전 삭제 포함)
 *
 * WO-O4O-GLYCOPHARM-OPERATOR-ADMIN-CONSOLE-KPA-ALIGNMENT-V1:
 *   Admin 전용 회원 관리. Operator (/operator/members)는 soft delete(탈퇴처리)만 가능.
 *   Admin (/admin/members)는 soft delete + hard delete(완전삭제) 모두 가능.
 *
 * WO-O4O-MEMBER-MANAGEMENT-ADMIN-ROLETAB-STATUSTAB-ALIGNMENT-V1:
 *   roleTabs/statusTabs/extraColumns/getPrimaryRole를 operator UsersPage 기준과 정렬.
 *
 * WO-O4O-OPERATOR-MEMBERS-DELETE-FLOW-COMMONIZATION-V1:
 *   GpAdminDeleteFlow(인라인) → OperatorMemberDeleteFlow 공통 컴포넌트로 교체.
 *   fetchDeleteRisk/executeDelete adapter 패턴 적용.
 *
 * Hard delete 정책:
 *   - users row 삭제 포함 (service_memberships, role_assignments, glycopharm 관련 데이터)
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

function gpAdminTokens(u: UserData): Set<string> {
  return new Set<string>([
    ...(u.roles ?? []),
    ...(u.role ? [u.role] : []),
    ...(u.memberships ?? []).filter((m) => m.serviceKey === 'glycopharm').map((m) => m.role),
  ]);
}

const GP_ADMIN_OPERATIONAL = new Set([
  'operator', 'admin', 'user',
  'glycopharm:operator', 'glycopharm:admin', 'platform:super_admin',
]);

function gpAdminGetPrimaryRole(u: UserData): string {
  const m = u.memberships?.find((x) => x.serviceKey === 'glycopharm');
  const role = m?.role || u.roles?.[0] || '';
  if (!role || GP_ADMIN_OPERATIONAL.has(role)) return 'general';
  return role;
}

const GP_ADMIN_ROLE_DISPLAY: Record<string, string> = {
  general: '일반 회원',
  'glycopharm:pharmacist': '약사',
  pharmacist: '약사',
  'glycopharm:store_owner': '약국 경영자',
  store_owner: '약국 경영자',
  'glycopharm:pharmacy': '약국',
  pharmacy: '약국',
  'glycopharm:supplier': '공급자',
  supplier: '공급자',
};

function getGpAdminOperatorRole(u: UserData): '관리자' | '운영자' | null {
  const t = gpAdminTokens(u);
  if (t.has('platform:super_admin') || t.has('glycopharm:admin') || t.has('admin')) return '관리자';
  if (t.has('glycopharm:operator') || t.has('operator')) return '운영자';
  return null;
}

// ─── Client adapter ──────────────────────────────────────────

const adminMembersClient: MembersConsoleClient = {
  async list(params: MembersConsoleListParams) {
    const usp = new URLSearchParams();
    usp.set('page', String(params.page));
    usp.set('limit', String(params.limit));
    usp.set('serviceKey', 'glycopharm');
    if (params.status) usp.set('status', params.status);
    if (params.search) usp.set('search', params.search);
    const { data } = await api.get(`/operator/members?${usp}`);
    return { users: data.users || [], pagination: data.pagination };
  },
  async listAll() {
    const { data } = await api.get('/operator/members?limit=1000&serviceKey=glycopharm');
    return { users: data.users || [] };
  },
  async stats() {
    const { data } = await api.get('/operator/members/stats?serviceKey=glycopharm');
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

async function gpFetchDeleteRisk(userId: string): Promise<NormalizedDeleteRisk> {
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

async function gpExecuteDelete(userId: string, mode: 'soft' | 'hard'): Promise<void> {
  await api.delete(`/operator/members/${userId}?mode=${mode}`);
  toast.success(mode === 'hard' ? '완전 삭제 완료' : '탈퇴 처리 완료');
}

// ─── Main Component ──────────────────────────────────────────

export default function GlycoPharmAdminMembersPage() {
  return (
    <OperatorMembersConsolePage
      serviceKey="glycopharm"
      client={adminMembersClient}
      getPrimaryRole={gpAdminGetPrimaryRole}
      roleDisplayMap={GP_ADMIN_ROLE_DISPLAY}
      roleColumnHeader="회원 유형"
      roleTabs={[
        { key: 'pharmacist', label: '약사', roleFilter: ['glycopharm:pharmacist', 'pharmacist', 'pharmacy'] },
        { key: 'store_owner', label: '약국 경영자', roleFilter: ['glycopharm:store_owner', 'store_owner', 'pharmacy_owner'] },
      ]}
      statusTabs={[
        { key: 'status-active',    label: '승인',  status: 'active' },
        { key: 'status-rejected',  label: '반려',  status: 'rejected' },
        { key: 'status-suspended', label: '정지',  status: 'suspended' },
        { key: 'status-withdrawn', label: '탈퇴',  status: 'withdrawn' },
      ]}
      extraColumns={[
        {
          key: 'operatorRole',
          header: '운영 권한',
          width: '120px',
          render: (_v: unknown, user: UserData) => {
            const op = getGpAdminOperatorRole(user);
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
          serviceLabel="GlycoPharm"
          fetchDeleteRisk={gpFetchDeleteRisk}
          executeDelete={gpExecuteDelete}
          onClose={onClose}
          onDeleted={onDeleted}
        />
      )}
      renderEditModal={({ user, onClose, onSuccess }) => (
        <EditUserModal userId={user.id} onClose={onClose} onSuccess={onSuccess} />
      )}
      tableId="glycopharm-admin-members"
    />
  );
}
