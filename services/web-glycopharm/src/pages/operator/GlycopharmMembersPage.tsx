/**
 * GlycopharmMembersPage — GlycoPharm operator 회원 관리 (공통 wrapper)
 *
 * WO-O4O-MEMBER-MANAGEMENT-STATUS-TABS-CANONICALIZATION-V1
 *
 * 선행: 독립 구현(dropdown 필터) → OperatorMembersConsolePage wrapper 전환.
 * Operator 권한: 승인/반려/정지/복원/탈퇴처리 가능, hard delete 불가 (admin 전용).
 *
 * 상태 탭: 승인(active) / 반려 / 정지 / 탈퇴 + 가입 신청(pending, wrapper 자동 추가)
 *
 * approved ↔ active 매핑:
 *   - service_memberships.status 기준 조회 → 승인 탭은 status=active 사용
 *   - approve 액션 → wrapper가 status='approved' 전달 → backend에서 active 변환 처리
 */

import { useState } from 'react';
import { UserCheck, UserX, UserMinus } from 'lucide-react';
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

// ─── Client adapter ──────────────────────────────────────────

const gpOperatorClient: MembersConsoleClient = {
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

// ─── Soft delete flow (operator only — hard delete는 admin 전용) ──

function GpOperatorDeleteFlow({
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

export default function GlycopharmMembersPage() {
  return (
    <OperatorMembersConsolePage
      serviceKey="glycopharm"
      client={gpOperatorClient}
      title="약사 회원 관리"
      description="약사 회원 신청을 검토하고 승인/거절 처리합니다."
      roleTabs={[
        { key: 'pharmacist', label: '약사', roleFilter: ['pharmacist', 'pharmacy'] },
      ]}
      statusTabs={[
        { key: 'status-active',    label: '승인',  status: 'active' },
        { key: 'status-rejected',  label: '반려',  status: 'rejected' },
        { key: 'status-suspended', label: '정지',  status: 'suspended' },
        { key: 'status-withdrawn', label: '탈퇴',  status: 'withdrawn' },
      ]}
      renderEditModal={({ user, onClose, onSuccess }) => (
        <EditUserModal userId={user.id} onClose={onClose} onSuccess={onSuccess} />
      )}
      renderDeleteFlow={({ user, onClose, onDeleted }) => (
        <GpOperatorDeleteFlow user={user} onClose={onClose} onDeleted={onDeleted} />
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
              await gpOperatorClient.updateStatus(u.id, 'suspended');
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
              await gpOperatorClient.updateStatus(u.id, 'approved');
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
              ids.map((id) => api.patch(`/operator/members/${id}/status`, { status: 'approved' })),
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
            users
              .filter((u) => ['active', 'approved', 'suspended', 'pending'].includes(u.status))
              .map((u) => u.id),
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
      tableId="glycopharm-operator-members"
    />
  );
}
