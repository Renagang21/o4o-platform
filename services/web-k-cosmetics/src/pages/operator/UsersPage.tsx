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
      roleTabs={[
        { key: 'seller', label: '판매자', roleFilter: ['cosmetics:store_owner'] },
        { key: 'consumer', label: '소비자', roleFilter: ['consumer', 'customer'] },
      ]}
      statusTabs={[
        { key: 'status-active', label: '활성', status: 'active' },
        { key: 'suspended', label: '정지', status: 'suspended' },
        { key: 'withdrawn', label: '탈퇴', status: 'withdrawn' },
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
