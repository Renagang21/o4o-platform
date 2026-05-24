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

  const handle = async () => {
    setLoading(true);
    try {
      await api.delete(`/operator/members/${user.id}`);
      toast.success('사용자가 삭제되었습니다.');
      onDeleted();
    } catch (err: any) {
      toast.error(err?.message || '삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfirmActionDialog
      open
      onClose={onClose}
      onConfirm={handle}
      title="회원 삭제 확인"
      message={`${displayName} (${user.email})\n\n이 사용자를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`}
      confirmText="삭제"
      variant="danger"
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
      renderEditModal={({ user, onClose, onSuccess }) => (
        <EditUserModal userId={user.id} onClose={onClose} onSuccess={onSuccess} />
      )}
      renderDeleteFlow={({ user, onClose, onDeleted }) => (
        <KcosDeleteFlow user={user} onClose={onClose} onDeleted={onDeleted} />
      )}
    />
  );
}
