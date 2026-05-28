/**
 * UsersManagementPage — Neture 회원 관리 (thin wrapper)
 *
 * WO-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-V1:
 *   917-line 구현을 @o4o/operator-core-ui/modules/members 의 OperatorMembersConsolePage
 *   thin wrapper 로 정합. Neture-specific 분기는 client adapter + slots 으로 흡수:
 *     - registration approve/reject endpoint → client.updateStatus / batchUpdateStatus
 *     - getPrimaryRole + NETURE_ROLE_DISPLAY → getPrimaryRole + roleDisplayMap props
 *     - dashboardAccess column → extraColumn prop
 *     - soft + hard delete 흐름 → renderDeleteFlow slot
 *     - EditUserModal → renderEditModal slot
 *
 * 선행:
 *   - WO-O4O-NETURE-OPERATOR-DASHBOARD-IMPLEMENTATION-V1
 *   - WO-O4O-NETURE-USERS-CANONICAL-APPLY-V1
 *   - WO-O4O-OPERATOR-MEMBERS-DETAIL-SURFACE-CANONICALIZATION-V1 (Hybrid Canonical)
 */

import { useMemo, useState } from 'react';
import {
  OperatorMembersConsolePage,
  type MembersConsoleClient,
  type MembersConsoleListParams,
  type UserData,
} from '@o4o/operator-core-ui/modules/members';
import { toast } from '@o4o/error-handling';
import { api } from '@/lib/apiClient';
import EditUserModal from './EditUserModal';

// ─── Helpers — Neture-specific role/dashboard logic ──────────

// WO-O4O-NETURE-ADMIN-USERS-SCOPE-FIX-V1: Neture membership role 만 사용
function getPrimaryRole(u: UserData): string {
  const m = u.memberships?.find((x) => x.serviceKey === 'neture');
  return m?.role || 'user';
}

// WO-O4O-NETURE-SUPPLIER-DASHBOARD-ENTRY-AND-MEMBER-LIST-CLEANUP-V1
function getDashboardAccessLabels(u: UserData): string[] {
  const tokens = new Set<string>([
    ...(u.roles ?? []),
    ...(u.role ? [u.role] : []),
    ...(u.memberships ?? []).filter((m) => m.serviceKey === 'neture').map((m) => m.role),
  ]);
  const labels: string[] = [];
  if (tokens.has('platform:super_admin') || tokens.has('neture:admin') || tokens.has('admin')) {
    labels.push('관리자 대시보드');
  }
  // WO-O4O-NETURE-ADMIN-OPERATOR-DASHBOARD-AND-MEMBER-TYPE-FIX-V1: "운영 대시보드" → "운영자 대시보드"
  if (tokens.has('neture:operator') || tokens.has('operator')) labels.push('운영자 대시보드');
  if (tokens.has('neture:supplier') || tokens.has('supplier')) labels.push('공급자 대시보드');
  if (tokens.has('neture:partner') || tokens.has('partner')) labels.push('파트너 대시보드');
  return labels;
}

// WO-O4O-NETURE-ADMIN-OPERATOR-DASHBOARD-AND-MEMBER-TYPE-FIX-V1:
// customer → consumer 매핑 제거 — Neture 는 "소비자" 회원 유형을 사용하지 않는다.
// 기존 데이터에 customer role 이 남아 있다면 raw 키 그대로 표시 (정렬 후 데이터 보정 별도).
const NETURE_ROLE_DISPLAY: Record<string, string> = {};

// ─── Client adapter ──────────────────────────────────────────

/**
 * WO-NETURE-MEMBERSHIP-APPROVAL-FLOW-STABILIZATION-V1:
 *   승인/거부 → /neture/operator/registrations/{id}/approve|reject
 *     (service_memberships + role_assignments + neture_suppliers 동시 처리)
 *   정지/활성화 → /operator/members/{membershipId}/approve|reject (Membership Console API)
 */
const netureMembersClient: MembersConsoleClient = {
  async list(params: MembersConsoleListParams) {
    const usp = new URLSearchParams();
    usp.set('page', String(params.page));
    usp.set('limit', String(params.limit));
    // WO-O4O-NETURE-ADMIN-USERS-SCOPE-FIX-V1: serviceKey 강제 전달
    usp.set('serviceKey', 'neture');
    if (params.status) usp.set('status', params.status);
    if (params.search) usp.set('search', params.search);
    const { data } = await api.get(`/operator/members?${usp}`);
    return { users: data.users || [], pagination: data.pagination };
  },
  async listAll() {
    const { data } = await api.get('/operator/members?limit=1000&serviceKey=neture');
    return { users: data.users || [] };
  },
  async stats() {
    const { data } = await api.get('/operator/members/stats?serviceKey=neture');
    return data;
  },
  async updateStatus(userId, status, currentStatus, user) {
    if (status === 'approved' && (currentStatus === 'pending' || currentStatus === 'rejected')) {
      await api.post(`/neture/operator/registrations/${userId}/approve`);
      return;
    }
    if (status === 'rejected') {
      await api.post(`/neture/operator/registrations/${userId}/reject`, { reason: '운영자 거부' });
      return;
    }
    // 정지 / 활성화 → membership console (membership.id 필요)
    const netureMembership = user?.memberships?.find((m) => m.serviceKey === 'neture');
    if (!netureMembership) return;
    const endpoint =
      status === 'suspended'
        ? `/operator/members/${netureMembership.id}/reject`
        : `/operator/members/${netureMembership.id}/approve`;
    await api.patch(endpoint);
  },
  async batchUpdateStatus(ids, status) {
    const r = await api.post('/neture/operator/registrations/batch', {
      ids,
      action: status === 'approved' ? 'approve' : 'reject',
      ...(status === 'rejected' ? { reason: '운영자 일괄 거부' } : {}),
    });
    return r.data;
  },
  async updatePassword(userId, password) {
    await api.put(`/operator/members/${userId}`, { password });
  },
};

// ─── Delete Flow (Neture: soft only for operator) ────────────
// WO-O4O-OPERATOR-MEMBERS-DELETE-ACTION-POLICY-FIX-V1:
// 완전삭제(hard delete)는 admin 전용. operator 화면에서 제거.

function NetureDeleteFlow({
  user,
  onClose,
  onDeleted,
}: {
  user: UserData;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const displayName = useMemo(() => {
    const full = `${user.lastName || ''}${user.firstName || ''}`.trim();
    if (full) return full;
    if (user.name && user.name !== user.email) return user.name;
    return user.email?.split('@')[0] || '사용자';
  }, [user]);

  const handle = async () => {
    setBusy(true);
    try {
      await api.delete(`/operator/members/${user.id}?mode=soft`);
      toast.success('사용자가 비활성화되었습니다.');
      onDeleted();
    } catch (err: any) {
      toast.error(err?.message || '비활성화에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h3 className="text-lg font-bold text-amber-600 mb-2">회원 비활성화 확인</h3>
        <div className="space-y-3 mb-4">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-sm text-slate-500">대상 사용자</p>
            <p className="font-medium text-slate-900">
              {displayName} ({user.email})
            </p>
            <p className="text-xs text-slate-400 mt-0.5">상태: {user.status}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              비활성화하면 로그인이 차단되고 목록에서 제외됩니다. 필요 시 관리자를 통해 재활성화할 수 있습니다.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handle}
            disabled={busy}
            className="flex-1 px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            {busy ? '처리 중...' : '비활성화'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export default function UsersManagementPage() {
  return (
    <OperatorMembersConsolePage
      serviceKey="neture"
      client={netureMembersClient}
      roleTabs={[
        { key: 'supplier', label: '공급자', roleFilter: ['supplier', 'neture:supplier'] },
        { key: 'partner', label: '파트너', roleFilter: ['partner', 'neture:partner'] },
        { key: 'seller', label: '셀러', roleFilter: ['seller', 'neture:seller'] },
      ]}
      statusTabs={[
        { key: 'status-active', label: '활성', status: 'active' },
        { key: 'status-suspended', label: '정지', status: 'suspended' },
        { key: 'status-rejected', label: '거절', status: 'rejected' },
        { key: 'status-withdrawn', label: '탈퇴', status: 'withdrawn' },
      ]}
      getPrimaryRole={getPrimaryRole}
      roleDisplayMap={NETURE_ROLE_DISPLAY}
      extraColumn={{
        key: 'dashboardAccess',
        header: '대시보드 접근',
        width: '200px',
        render: (_v, user) => {
          const labels = getDashboardAccessLabels(user);
          if (labels.length === 0) {
            return <span className="text-xs text-slate-400">접근 불가</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {labels.map((label) => (
                <span key={label} className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                  {label}
                </span>
              ))}
            </div>
          );
        },
      }}
      renderEditModal={({ user, onClose, onSuccess }) => (
        <EditUserModal userId={user.id} onClose={onClose} onSuccess={onSuccess} />
      )}
      renderDeleteFlow={({ user, onClose, onDeleted }) => (
        <NetureDeleteFlow user={user} onClose={onClose} onDeleted={onDeleted} />
      )}
    />
  );
}
