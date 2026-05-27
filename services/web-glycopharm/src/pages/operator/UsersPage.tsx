/**
 * Operator Users Page — GlycoPharm 회원 관리 (thin wrapper)
 *
 * WO-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-V1:
 *   957-line 구현을 @o4o/operator-core-ui/modules/members 의 OperatorMembersConsolePage
 *   thin wrapper 로 정합. GP-specific 분기는 client adapter + slots 으로 흡수:
 *     - DeleteRiskModal (risk pre-check + soft/hard) → renderDeleteFlow slot
 *     - EditUserModal → renderEditModal slot
 *     - 약국 / 당뇨인 역할 탭 → roleTabs prop
 *
 * 선행:
 *   - WO-O4O-MEMBERSHIP-CONSOLE-V1 / WO-O4O-MEMBER-LIST-STANDARDIZATION-V1
 *   - WO-O4O-OPERATOR-MEMBERS-DETAIL-SURFACE-CANONICALIZATION-V1 (Hybrid Canonical)
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
  const [deleting, setDeleting] = useState(false);
  const [confirmMode, setConfirmMode] = useState<'soft' | 'hard' | null>(null);

  useEffect(() => {
    api
      .get(`/operator/members/${user.id}/delete-risk`)
      .then((r) => setData(r.data?.data ?? r.data))
      .catch((e: any) => toast.error(e?.message || '리스크 조회 실패'))
      .finally(() => setLoading(false));
  }, [user.id]);

  const executeDelete = async () => {
    if (!confirmMode) return;
    setDeleting(true);
    try {
      await api.delete(`/operator/members/${user.id}?mode=${confirmMode}`);
      toast.success(confirmMode === 'soft' ? '탈퇴 처리 완료' : '완전 삭제 완료');
      onDeleted();
    } catch (e: any) {
      toast.error(e?.message || (confirmMode === 'soft' ? '처리 실패' : '삭제 실패'));
    } finally {
      setDeleting(false);
      setConfirmMode(null);
    }
  };

  const userDisplayName = user.name || `${user.lastName || ''}${user.firstName || ''}`.trim() || user.email.split('@')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-bold text-slate-900">회원 삭제 확인</h3>
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

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">삭제 시 영향받는 데이터</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '서비스 연결', value: data.risks.serviceMemberships },
                  { label: '포럼 게시글', value: data.risks.forumPosts },
                  { label: '포럼 댓글', value: data.risks.forumComments },
                  { label: '감사 로그', value: data.risks.auditLogs },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`flex justify-between px-3 py-2 rounded text-sm ${
                      item.value > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="font-medium">{item.value}건</span>
                  </div>
                ))}
              </div>
            </div>

            {!data.canHardDelete && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">
                  포럼 게시글/댓글 또는 감사 로그가 있어 완전삭제가 제한됩니다. 탈퇴(비활성) 처리를 권장합니다.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => setConfirmMode('soft')}
                disabled={deleting}
                className="w-full px-4 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg disabled:opacity-50"
              >
                탈퇴 처리 (비활성화)
              </button>
              <button
                onClick={() => setConfirmMode('hard')}
                disabled={deleting || !data.canHardDelete}
                className="w-full px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {!data.canHardDelete ? '완전삭제 불가 (연결 데이터 존재)' : '완전삭제 (되돌릴 수 없음)'}
              </button>
              <button
                onClick={onClose}
                className="w-full px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 rounded-lg"
              >
                취소
              </button>
            </div>

            {/* Delete Confirm Dialog */}
            <ConfirmActionDialog
              open={!!confirmMode}
              onClose={() => setConfirmMode(null)}
              onConfirm={executeDelete}
              title={confirmMode === 'hard' ? '완전 삭제 확인' : '탈퇴 처리 확인'}
              message={
                confirmMode === 'hard'
                  ? '이 회원 데이터를 완전히 삭제합니다.\n이 작업은 되돌릴 수 없습니다.'
                  : '이 회원을 탈퇴(비활성) 처리하시겠습니까?'
              }
              confirmText={confirmMode === 'hard' ? '완전 삭제' : '탈퇴 처리'}
              variant={confirmMode === 'hard' ? 'danger' : 'warning'}
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
      renderEditModal={({ user, onClose, onSuccess }) => (
        <EditUserModal userId={user.id} onClose={onClose} onSuccess={onSuccess} />
      )}
      renderDeleteFlow={({ user, onClose, onDeleted }) => (
        <GpDeleteRiskFlow user={user} onClose={onClose} onDeleted={onDeleted} />
      )}
    />
  );
}
