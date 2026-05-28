/**
 * Operator Members Page — GlycoPharm 회원 관리 (thin wrapper)
 *
 * WO-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-V1:
 *   OperatorMembersConsolePage thin wrapper. GP-specific 분기는 client adapter + slots:
 *     - GpDeleteRiskFlow (soft delete only) → renderDeleteFlow slot
 *     - EditUserModal → renderEditModal slot
 *     - 약사 / 약국 경영자 역할 탭 → roleTabs prop
 *
 * Route: /operator/members (canonical, WO-O4O-GLYCOPHARM-OPERATOR-ROUTE-CANONICALIZATION-V1)
 */

import { useState, useEffect } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { ConfirmActionDialog } from '@o4o/ui';
import {
  OperatorMembersConsolePage,
  type MembersConsoleClient,
  type MembersConsoleListParams,
  type UserData,
} from '@o4o/operator-core-ui/modules/members';
import { toast } from '@o4o/error-handling';
import { api } from '../../lib/apiClient';
import EditUserModal from './EditUserModal';

// ─── Client adapter ──────────────────────────────────────────

const gpMembersClient: MembersConsoleClient = {
  async list(params: MembersConsoleListParams) {
    const usp = new URLSearchParams();
    usp.set('page', String(params.page));
    usp.set('limit', String(params.limit));
    // WO-O4O-OPERATOR-MEMBERS-FRONTEND-SERVICEKEY-ALIGNMENT-V1: serviceKey 명시
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

// ─── Delete Flow — DeleteRiskModal (GP-specific) ─────────────
// WO-O4O-OPERATOR-MEMBER-DELETE-RISK-AND-SAFE-DELETE-V1

interface DeleteRiskData {
  user: { id: string; email: string; name: string; status: string };
  risks: { serviceMemberships: number; forumPosts: number; forumComments: number; auditLogs: number };
  totalImpact: number;
  canHardDelete: boolean;
}

// WO-O4O-OPERATOR-MEMBERS-DELETE-ACTION-POLICY-FIX-V1:
// 완전삭제(hard delete)는 admin 전용. operator 화면에서 탈퇴 처리만 표시.
function GpDeleteRiskFlow({
  user,
  onClose,
  onDeleted,
}: {
  user: UserData;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DeleteRiskData | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .get(`/operator/members/${user.id}/delete-risk`)
      .then((r) => setData(r.data?.data ?? r.data))
      .catch((e: any) => toast.error(e?.message || '리스크 조회 실패'))
      .finally(() => setLoading(false));
  }, [user.id]);

  const executeSoftDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/operator/members/${user.id}?mode=soft`);
      toast.success('탈퇴 처리 완료');
      onDeleted();
    } catch (e: any) {
      toast.error(e?.message || '처리 실패');
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  const userDisplayName = user.name || `${user.lastName || ''}${user.firstName || ''}`.trim() || user.email.split('@')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-slate-900">탈퇴 처리 확인</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 space-y-1">
              <p className="text-sm font-medium text-slate-800">{userDisplayName}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
              <span className="inline-block text-xs px-2 py-0.5 bg-slate-200 rounded mt-1">
                {data.user.status}
              </span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                탈퇴 처리하면 로그인이 차단되고 목록에서 제외됩니다. 필요 시 관리자를 통해 재활성화할 수 있습니다.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => setConfirming(true)}
                disabled={deleting}
                className="w-full px-4 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg disabled:opacity-50"
              >
                탈퇴 처리 (비활성화)
              </button>
              <button
                onClick={onClose}
                className="w-full px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 rounded-lg"
              >
                취소
              </button>
            </div>

            <ConfirmActionDialog
              open={confirming}
              onClose={() => setConfirming(false)}
              onConfirm={executeSoftDelete}
              title="탈퇴 처리 확인"
              message="이 회원을 탈퇴(비활성) 처리하시겠습니까?"
              confirmText="탈퇴 처리"
              variant="warning"
              loading={deleting}
            />
          </div>
        ) : (
          <p className="text-center text-sm text-red-500 py-4">리스크 정보를 불러오지 못했습니다.</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export default function UsersPage() {
  return (
    <OperatorMembersConsolePage
      serviceKey="glycopharm"
      client={gpMembersClient}
      roleTabs={[
        { key: 'pharmacist', label: '약사', roleFilter: ['glycopharm:pharmacist'] },
        { key: 'store_owner', label: '약국 경영자', roleFilter: ['glycopharm:store_owner'] },
      ]}
      statusTabs={[
        { key: 'suspended', label: '정지', status: 'suspended' },
        { key: 'withdrawn', label: '탈퇴', status: 'withdrawn' },
      ]}
      renderEditModal={({ user, onClose, onSuccess }) => (
        <EditUserModal userId={user.id} onClose={onClose} onSuccess={onSuccess} />
      )}
      renderDeleteFlow={({ user, onClose, onDeleted }) => (
        <GpDeleteRiskFlow user={user} onClose={onClose} onDeleted={onDeleted} />
      )}
    />
  );
}
