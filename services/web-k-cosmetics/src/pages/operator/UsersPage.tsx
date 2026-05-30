/**
 * Operator Users Page — K-Cosmetics 회원 관리 (thin wrapper)
 *
 * WO-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-V1:
 *   768-line 구현을 @o4o/operator-core-ui/modules/members 의 OperatorMembersConsolePage
 *   thin wrapper 로 정합. K-Cos-specific 분기는 client adapter + slots 으로 흡수:
 *     - 판매자 / 소비자 역할 탭 → roleTabs prop
 *     - simple delete confirm → renderDeleteFlow slot
 *     - EditUserModal → renderEditModal slot
 *
 *   본 WO 로 K-Cos 의 bulk action parity 회복 (ActionBar / useBatchAction / BulkResultModal
 *   wrapper 내장 — 별도 K-Cos UI 추가 없이 자동 활성화).
 *
 * 선행:
 *   - WO-O4O-MEMBERSHIP-CONSOLE-V1 / WO-O4O-KCOS-USERS-TABLE-STANDARDIZE-V1
 *   - WO-O4O-OPERATOR-MEMBERS-DETAIL-SURFACE-CANONICALIZATION-V1 (Hybrid Canonical)
 */

import { useState } from 'react';
import { UserX, UserCheck, UserMinus } from 'lucide-react';
import {
  OperatorMembersConsolePage,
  type MembersConsoleClient,
  type MembersConsoleListParams,
  type UserData,
} from '@o4o/operator-core-ui/modules/members';
import { ConfirmActionDialog } from '@o4o/ui';
import { toast } from '@o4o/error-handling';
import { api } from '../../lib/apiClient';
import EditUserModal from './EditUserModal';

// ─── Role display helpers ────────────────────────────────────
// WO-O4O-GLYCOPHARM-KCOS-MEMBER-LIST-MODAL-PERMISSION-DISPLAY-ALIGNMENT-V1:
//   회원 유형(참여 유형)과 운영 권한을 분리 표시(Neture 패턴 재사용). 동일 token
//   (role_assignments roles[] ∪ user.role ∪ k-cosmetics membership.role)에서 도출. 데이터 미수정.
//   ※ K-Cosmetics 는 role prefix 가 'cosmetics:' / 'k-cosmetics:' 로 혼재되어 양쪽 모두 인식한다.
//   ※ subRole(매장 경영자/근무자)은 cosmetics_members.subRole 의 별도 축으로 모달에서만 다룬다.
function kcosTokens(u: UserData): Set<string> {
  return new Set<string>([
    ...(u.roles ?? []),
    ...(u.role ? [u.role] : []),
    ...(u.memberships ?? []).filter((m) => m.serviceKey === 'k-cosmetics').map((m) => m.role),
  ]);
}

// 운영 권한/미지정 성격의 role — "회원 유형"에서 제외(운영 권한 컬럼이 담당).
const KCOS_OPERATIONAL = new Set([
  'operator', 'admin', 'user',
  'cosmetics:operator', 'cosmetics:admin',
  'k-cosmetics:operator', 'k-cosmetics:admin',
  'platform:super_admin',
]);

// "회원 유형" 컬럼 + roleTabs 필터용. 참여 유형은 그대로 반환해 roleTabs 매칭을 유지하고,
// 운영 권한/미지정 값만 'general'(일반 회원)로 collapse 한다(raw operator/admin 노출 방지).
function getPrimaryRole(u: UserData): string {
  const m = u.memberships?.find((x) => x.serviceKey === 'k-cosmetics');
  const role = m?.role || u.roles?.[0] || '';
  if (!role || KCOS_OPERATIONAL.has(role)) return 'general';
  return role;
}

// 참여 유형 한글 라벨(bare/namespaced 모두). 미매핑 값은 RoleBadge 기본 처리.
// WO-O4O-KCOSMETICS-OPERATOR-VOCABULARY-PHARMACY-CLEANUP-V2:
//   KCOS_ROLE_DISPLAY 에서 pharmacist/supplier (K-Cos 자체 회원 분류) 제거.
//   Tier 5 §4 데이터 검증으로 cosmetics pharmacist=0, cosmetics-membership supplier=0
//   확인됨. lookup 실패 시 raw key fallback 안전.
const KCOS_ROLE_DISPLAY: Record<string, string> = {
  general: '일반 회원',
  'cosmetics:store_owner': '판매자',
  store_owner: '판매자',
  seller: '판매자',
  consumer: '소비자',
  customer: '소비자',
  partner: '파트너',
};

// "운영 권한" 컬럼용. 관리자 > 운영자 우선순위. cosmetics:/k-cosmetics:/bare 모두 인정.
function getOperatorRole(u: UserData): '관리자' | '운영자' | null {
  const t = kcosTokens(u);
  if (t.has('platform:super_admin') || t.has('cosmetics:admin') || t.has('k-cosmetics:admin') || t.has('admin')) {
    return '관리자';
  }
  if (t.has('cosmetics:operator') || t.has('k-cosmetics:operator') || t.has('operator')) return '운영자';
  return null;
}

// ─── Client adapter ──────────────────────────────────────────

const kcosMembersClient: MembersConsoleClient = {
  async list(params: MembersConsoleListParams) {
    const usp = new URLSearchParams();
    usp.set('page', String(params.page));
    usp.set('limit', String(params.limit));
    // WO-O4O-OPERATOR-MEMBERS-FRONTEND-SERVICEKEY-ALIGNMENT-V1: serviceKey 명시
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

// ─── Delete Flow — simple confirm ────────────────────────────

function KcosDeleteFlow({
  user,
  onClose,
  onDeleted,
}: {
  user: UserData;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const displayName =
    user.name || `${user.lastName || ''}${user.firstName || ''}`.trim() || user.email.split('@')[0];

  // WO-O4O-OPERATOR-MEMBERS-DELETE-ACTION-POLICY-FIX-V1:
  // mode 파라미터 없음 → 백엔드 default soft delete.
  // 문구를 실제 동작(비활성화)에 맞게 수정.
  const handle = async () => {
    setLoading(true);
    try {
      await api.delete(`/operator/members/${user.id}?mode=soft`);
      toast.success('탈퇴 처리 완료. 필요 시 관리자를 통해 재활성화할 수 있습니다.');
      onDeleted();
    } catch (err: any) {
      toast.error(err?.message || '탈퇴 처리에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfirmActionDialog
      open
      onClose={onClose}
      onConfirm={handle}
      title="탈퇴 처리 확인"
      message={`${displayName} (${user.email})\n\n이 회원을 탈퇴(비활성화) 처리하시겠습니까?\n탈퇴 처리 후 로그인이 차단되며, 필요 시 관리자를 통해 재활성화할 수 있습니다.`}
      confirmText="탈퇴 처리"
      variant="warning"
      loading={loading}
    />
  );
}

// ─── Main Component ──────────────────────────────────────────

export default function UsersPage() {
  return (
    <OperatorMembersConsolePage
      serviceKey="k-cosmetics"
      client={kcosMembersClient}
      getPrimaryRole={getPrimaryRole}
      roleDisplayMap={KCOS_ROLE_DISPLAY}
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
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${cls}`}>
                {op}
              </span>
            );
          },
        },
      ]}
      roleTabs={[
        { key: 'seller', label: '판매자', roleFilter: ['cosmetics:store_owner', 'seller', 'store_owner'] },
        { key: 'consumer', label: '소비자', roleFilter: ['consumer', 'customer'] },
      ]}
      statusTabs={[
        // WO-O4O-KCOSMETICS-MEMBERSHIP-APPROVAL-FLOW-STABILIZATION-V1: pending 탭 추가
        { key: 'status-pending',   label: '가입 신청', status: 'pending' },
        { key: 'status-active',    label: '활성', status: 'active' },
        { key: 'status-rejected',  label: '거절', status: 'rejected' },
        { key: 'status-suspended', label: '정지', status: 'suspended' },
        { key: 'status-withdrawn', label: '탈퇴', status: 'withdrawn' },
      ]}
      renderEditModal={({ user, onClose, onSuccess }) => (
        <EditUserModal userId={user.id} onClose={onClose} onSuccess={onSuccess} />
      )}
      renderDeleteFlow={({ user, onClose, onDeleted }) => (
        <KcosDeleteFlow user={user} onClose={onClose} onDeleted={onDeleted} />
      )}
      extraRowActions={[
        {
          key: 'suspend',
          label: '정지',
          variant: 'warning',
          icon: <UserX size={14} />,
          divider: true,
          visible: (u) => u.status === 'active' || u.status === 'approved',
          confirm: { title: '정지 확인', message: '이 회원을 정지하시겠습니까?', confirmText: '정지', variant: 'warning' },
          onClick: async (u) => {
            try {
              await kcosMembersClient.updateStatus(u.id, 'suspended');
              toast.success('정지 처리되었습니다.');
            } catch (e: any) {
              toast.error(e?.message || '정지 처리 실패');
            }
          },
        },
        {
          key: 'restore',
          label: '복원',
          variant: 'default',
          icon: <UserCheck size={14} />,
          visible: (u) => u.status === 'suspended',
          onClick: async (u) => {
            try {
              await kcosMembersClient.updateStatus(u.id, 'active');
              toast.success('복원되었습니다.');
            } catch (e: any) {
              toast.error(e?.message || '복원 실패');
            }
          },
        },
      ]}
      extraBulkActions={[
        {
          key: 'bulk-suspend',
          label: (n) => `정지 (${n})`,
          variant: 'danger',
          icon: <UserX size={14} />,
          getTargetIds: (users) =>
            users.filter((u) => u.status === 'active' || u.status === 'approved').map((u) => u.id),
          executeBatch: async (ids) => {
            const { data } = await api.post('/operator/members/batch-status', { ids, status: 'suspended' });
            return { data };
          },
          confirm: { title: '일괄 정지 확인', message: '선택한 회원을 정지 처리합니다.', confirmText: '정지', variant: 'danger' },
        },
        {
          key: 'bulk-restore',
          label: (n) => `복원 (${n})`,
          variant: 'primary',
          icon: <UserCheck size={14} />,
          getTargetIds: (users) => users.filter((u) => u.status === 'suspended').map((u) => u.id),
          executeBatch: async (ids) => {
            const settled = await Promise.allSettled(
              ids.map((id) => api.patch(`/operator/members/${id}/status`, { status: 'active' })),
            );
            return {
              data: {
                results: settled.map((r, i) => ({
                  id: ids[i],
                  status: r.status === 'fulfilled' ? ('success' as const) : ('failed' as const),
                  error: r.status === 'rejected' ? (r.reason as any)?.message || '오류' : undefined,
                })),
              },
            };
          },
        },
        {
          key: 'bulk-withdraw',
          label: (n) => `탈퇴 처리 (${n})`,
          variant: 'danger',
          icon: <UserMinus size={14} />,
          getTargetIds: (users) =>
            users.filter((u) => ['active', 'approved', 'suspended', 'pending'].includes(u.status)).map((u) => u.id),
          executeBatch: async (ids) => {
            const settled = await Promise.allSettled(
              ids.map((id) => api.delete(`/operator/members/${id}?mode=soft`)),
            );
            return {
              data: {
                results: settled.map((r, i) => ({
                  id: ids[i],
                  status: r.status === 'fulfilled' ? ('success' as const) : ('failed' as const),
                  error: r.status === 'rejected' ? (r.reason as any)?.message || '오류' : undefined,
                })),
              },
            };
          },
          confirm: { title: '일괄 탈퇴 처리 확인', message: '선택한 회원을 탈퇴(비활성화) 처리합니다.', confirmText: '탈퇴 처리', variant: 'danger' },
        },
      ]}
    />
  );
}
