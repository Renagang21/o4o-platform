/**
 * GlycoPharmAdminMembersPage — Admin 회원 관리 (완전 삭제 포함)
 *
 * WO-O4O-GLYCOPHARM-OPERATOR-ADMIN-CONSOLE-KPA-ALIGNMENT-V1:
 *   Admin 전용 회원 관리. Operator (/operator/members)는 soft delete(탈퇴처리)만 가능.
 *   Admin (/admin/members)는 soft delete + hard delete(완전삭제) 모두 가능.
 *
 * Hard delete 정책:
 *   - users row 삭제 포함 (service_memberships, role_assignments, glycopharm 관련 데이터)
 *   - 포럼 활동(게시글/댓글) 있으면 경고 표시
 *   - 되돌릴 수 없음 — 2단계 확인 필요
 *   - single member 단건 처리 (batch hard delete 금지)
 */

import { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, Loader2, ShieldAlert, Trash2, X } from 'lucide-react';
import { ConfirmActionDialog } from '@o4o/ui';
import {
  OperatorMembersConsolePage,
  type MembersConsoleClient,
  type MembersConsoleListParams,
  type UserData,
  MemberHardDeleteConfirmModal,
  type MemberHardDeleteTarget,
} from '@o4o/operator-core-ui/modules/members';
import { toast } from '@o4o/error-handling';
import { api } from '../../lib/apiClient';
import EditUserModal from '../operator/EditUserModal';

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

// ─── Delete Risk ─────────────────────────────────────────────

interface DeleteRiskData {
  user: { id: string; email: string; name: string; status: string };
  risks: {
    serviceMemberships: number;
    forumPosts: number;
    forumComments: number;
    auditLogs: number;
  };
  totalImpact: number;
  canHardDelete: boolean;
}

type DeleteMode = 'soft' | 'hard';

// ─── Admin Delete Flow (soft + hard 선택) ────────────────────

function GpAdminDeleteFlow({
  user,
  onClose,
  onDeleted,
}: {
  user: UserData;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [riskData, setRiskData] = useState<DeleteRiskData | null>(null);
  const [selectedMode, setSelectedMode] = useState<DeleteMode | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .get(`/operator/members/${user.id}/delete-risk`)
      .then((r: any) => setRiskData(r.data?.data ?? r.data))
      .catch((e: any) => toast.error(e?.message || '리스크 조회 실패'))
      .finally(() => setLoading(false));
  }, [user.id]);

  const displayName =
    user.name ||
    `${user.lastName || ''}${user.firstName || ''}`.trim() ||
    user.email.split('@')[0];

  const execute = async () => {
    if (!selectedMode) return;
    setDeleting(true);
    try {
      await api.delete(`/operator/members/${user.id}?mode=${selectedMode}`);
      toast.success(selectedMode === 'hard' ? '완전 삭제 완료' : '탈퇴 처리 완료');
      onDeleted();
    } catch (e: any) {
      toast.error(e?.message || '처리 실패');
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  const confirmMessage =
    selectedMode === 'hard'
      ? `"${displayName}" 회원을 완전히 삭제합니다. 이 작업은 되돌릴 수 없습니다.`
      : `"${displayName}" 회원을 탈퇴(비활성) 처리하시겠습니까?`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-bold text-slate-900">회원 관리 — Admin</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : riskData ? (
          <div className="space-y-4">
            {/* Member info */}
            <div className="bg-slate-50 rounded-lg p-4 space-y-1">
              <p className="text-sm font-medium text-slate-800">{displayName}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
              <span className="inline-block text-xs px-2 py-0.5 bg-slate-200 rounded mt-1">
                {riskData.user.status}
              </span>
            </div>

            {/* Risk summary */}
            <div className={`border rounded-lg p-3 ${riskData.canHardDelete ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-xs font-medium text-slate-700 mb-2">삭제 영향 분석</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">서비스 멤버십</span>
                  <span className="font-medium">{riskData.risks.serviceMemberships}건</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">포럼 게시글</span>
                  <span className={`font-medium ${riskData.risks.forumPosts > 0 ? 'text-red-600' : ''}`}>
                    {riskData.risks.forumPosts}건
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">포럼 댓글</span>
                  <span className={`font-medium ${riskData.risks.forumComments > 0 ? 'text-red-600' : ''}`}>
                    {riskData.risks.forumComments}건
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">감사 로그</span>
                  <span className="font-medium">{riskData.risks.auditLogs}건</span>
                </div>
              </div>
              {!riskData.canHardDelete && (
                <p className="mt-2 text-xs text-red-700 font-medium">
                  ⚠ 포럼 활동 데이터가 있습니다. 완전 삭제 시 관련 데이터가 소실됩니다.
                </p>
              )}
            </div>

            {/* Action choice */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-600">처리 방식 선택</p>

              {/* Soft delete */}
              <button
                onClick={() => { setSelectedMode('soft'); setConfirming(true); }}
                disabled={deleting}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-lg disabled:opacity-50"
              >
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <p className="font-medium text-amber-800">탈퇴 처리 (비활성화)</p>
                  <p className="text-xs text-amber-700 mt-0.5">로그인 차단, 재활성화 가능</p>
                </div>
              </button>

              {/* Hard delete */}
              <button
                onClick={() => { setSelectedMode('hard'); setConfirming(true); }}
                disabled={deleting}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
                <div>
                  <p className="font-medium text-red-800">완전 삭제 (되돌릴 수 없음)</p>
                  <p className="text-xs text-red-700 mt-0.5">
                    users 레코드, 멤버십, 역할 전체 삭제
                    {!riskData.canHardDelete && ' — 포럼 데이터 소실 위험'}
                  </p>
                </div>
              </button>

              <button
                onClick={onClose}
                className="w-full px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 rounded-lg"
              >
                취소
              </button>
            </div>

            <ConfirmActionDialog
              open={confirming && selectedMode === 'soft'}
              onClose={() => { setConfirming(false); setSelectedMode(null); }}
              onConfirm={execute}
              title="탈퇴 처리 확인"
              message={confirmMessage}
              confirmText="탈퇴 처리"
              variant="warning"
              loading={deleting}
            />

            <MemberHardDeleteConfirmModal
              open={confirming && selectedMode === 'hard'}
              member={
                {
                  id: user.id,
                  name: displayName,
                  email: user.email,
                  status: riskData.user.status,
                } as MemberHardDeleteTarget
              }
              serviceLabel="GlycoPharm"
              loading={deleting}
              onClose={() => { if (!deleting) { setConfirming(false); setSelectedMode(null); } }}
              onConfirm={execute}
            >
              {!riskData.canHardDelete ? (
                <div className="flex items-start gap-2 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  <div className="text-xs text-red-700 space-y-1">
                    <p className="font-semibold">
                      활동 데이터 (게시글 {riskData.risks.forumPosts}건 / 댓글 {riskData.risks.forumComments}건) 있음
                    </p>
                    <p>완전삭제 시 작성자 정보가 깨지거나 함께 삭제될 수 있습니다.</p>
                  </div>
                </div>
              ) : null}
            </MemberHardDeleteConfirmModal>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-500 py-4 justify-center text-sm">
            <AlertTriangle className="w-4 h-4" />
            리스크 정보를 불러오지 못했습니다.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export default function GlycoPharmAdminMembersPage() {
  return (
    <OperatorMembersConsolePage
      serviceKey="glycopharm"
      client={adminMembersClient}
      roleTabs={[
        { key: 'pharmacist', label: '약사', roleFilter: ['pharmacist', 'pharmacy'] },
        { key: 'pharmacy_owner', label: '약국 경영자', roleFilter: ['pharmacy_owner'] },
      ]}
      renderDeleteFlow={({ user, onClose, onDeleted }) => (
        <GpAdminDeleteFlow user={user} onClose={onClose} onDeleted={onDeleted} />
      )}
      renderEditModal={({ user, onClose, onSuccess }) => (
        <EditUserModal userId={user.id} onClose={onClose} onSuccess={onSuccess} />
      )}
      tableId="glycopharm-admin-members"
    />
  );
}
