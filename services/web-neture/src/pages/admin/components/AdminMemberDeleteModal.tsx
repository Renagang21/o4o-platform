/**
 * AdminMemberDeleteModal — Neture admin 전용 회원 완전삭제 모달
 *
 * WO-O4O-NETURE-ADMIN-MEMBER-HARD-DELETE-V1 (원본)
 * WO-O4O-MEMBER-MANAGEMENT-HARD-DELETE-FLOW-COMMONIZATION-V1
 *   확인 UI 를 공통 MemberHardDeleteConfirmModal 로 정합.
 *   delete-risk 정보 + 활동 경고는 공통 모달의 children slot 으로 주입.
 *   API 호출(`/operator/members/{id}/delete-risk`, `?mode=hard`)은 호출부에서 유지.
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  MemberHardDeleteConfirmModal,
  type MemberHardDeleteTarget,
} from '@o4o/operator-core-ui/modules/members';
import { api } from '../../../lib/apiClient';

interface DeleteRiskData {
  user: {
    id: string;
    email: string;
    name: string;
    status: string;
  };
  risks: {
    serviceMemberships: number;
    forumPosts: number;
    forumComments: number;
    auditLogs: number;
  };
  totalImpact: number;
  canHardDelete: boolean;
}

interface Props {
  userId: string;
  userName: string;
  onClose: () => void;
  onDeleted: () => void;
}

export function AdminMemberDeleteModal({ userId, userName, onClose, onDeleted }: Props) {
  const [loading, setLoading] = useState(true);
  const [riskData, setRiskData] = useState<DeleteRiskData | null>(null);
  const [riskError, setRiskError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ success: boolean; data: DeleteRiskData }>(`/operator/members/${userId}/delete-risk`)
      .then((r: { data: DeleteRiskData }) => setRiskData(r.data))
      .catch((e: Error) => setRiskError(e.message || '리스크 정보를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleConfirm = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/operator/members/${userId}?mode=hard`);
      onDeleted();
      onClose();
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : '삭제 실패');
    } finally {
      setDeleting(false);
    }
  };

  const target: MemberHardDeleteTarget = {
    id: userId,
    name: riskData?.user.name || userName,
    email: riskData?.user.email ?? null,
    status: riskData?.user.status ?? null,
  };

  const hasActivity = riskData
    ? riskData.risks.forumPosts > 0 || riskData.risks.forumComments > 0
    : false;

  const riskBlock = loading ? (
    <div className="flex justify-center py-4">
      <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
    </div>
  ) : riskError ? (
    <div className="text-center text-sm text-red-500 py-2">{riskError}</div>
  ) : riskData ? (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">삭제 시 영향받는 데이터</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: '서비스 멤버십', value: riskData.risks.serviceMemberships },
            { label: '포럼 게시글', value: riskData.risks.forumPosts },
            { label: '포럼 댓글', value: riskData.risks.forumComments },
            { label: '감사 로그', value: riskData.risks.auditLogs },
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

      {hasActivity ? (
        <div className="flex items-start gap-2 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <div className="text-xs text-red-700 space-y-1">
            <p className="font-semibold">
              실제 활동 데이터 (게시글 {riskData.risks.forumPosts}건 / 댓글 {riskData.risks.forumComments}건) 있음
            </p>
            <p>완전삭제 시 게시글/댓글의 작성자 정보가 깨지거나 함께 삭제될 수 있습니다. 신중하게 진행하세요.</p>
          </div>
        </div>
      ) : !riskData.canHardDelete ? (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            감사 로그 등 부수 데이터가 있습니다. 완전삭제는 가능하지만 진행 전 확인하세요.
          </p>
        </div>
      ) : null}

      {deleteError ? (
        <div className="p-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded">
          {deleteError}
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <MemberHardDeleteConfirmModal
      open
      member={target}
      serviceLabel="Neture"
      loading={deleting}
      onClose={onClose}
      onConfirm={handleConfirm}
    >
      {riskBlock}
    </MemberHardDeleteConfirmModal>
  );
}
