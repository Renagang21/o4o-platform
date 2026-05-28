/**
 * MemberDeleteRiskModal — 관리자(admin) 전용 회원 완전삭제 위험도 확인 모달 (KPA wrapper)
 *
 * WO-O4O-KPA-ADMIN-MEMBER-MANAGEMENT-SEPARATION-V1 (원본)
 * WO-O4O-MEMBER-MANAGEMENT-HARD-DELETE-FLOW-COMMONIZATION-V1
 *   확인 UI 를 공통 MemberHardDeleteConfirmModal 로 정합.
 *   delete-risk fetch + 영향 데이터 / 활동 경고는 공통 모달의 children slot 으로 주입.
 *   API 호출(`/members/{id}/delete-risk`, `?mode=hard`)은 본 호출부에서 유지.
 *
 * 기존 정책 보존 (WO-O4O-KPA-MEMBER-HARDDELETE-ADMIN-FOR-MISREGISTRATION-V1):
 *   - admin 은 활동 데이터 있어도 완전삭제 가능 (강한 경고로 보호)
 *   - 면허번호(kpa_members.license_number) + 연결 데이터 cascade 정리
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import {
  MemberHardDeleteConfirmModal,
  type MemberHardDeleteTarget,
} from '@o4o/operator-core-ui/modules/members';
import { apiClient } from '../../../api/client';

interface DeleteRiskData {
  member: {
    id: string;
    userId: string;
    name: string;
    email: string;
    status: string;
    membershipType: string;
    role: string;
  };
  risks: {
    memberServices: number;
    forumPosts: number;
    forumComments: number;
    approvalRequests: number;
    auditLogs: number;
  };
  totalImpact: number;
  /** operator 관점 — 활동/감사로그 0 일 때만 true. admin 화면에서는 표시 참고용으로만 사용 */
  canHardDelete: boolean;
  /** 포럼 게시글/댓글 > 0 시 true. admin 진행은 가능하나 강한 경고 노출 */
  hasActivityData?: boolean;
  message: string;
}

interface Props {
  memberId: string;
  onClose: () => void;
  onDeleted: () => void;
}

const MEMBERSHIP_TYPE_LABEL: Record<string, string> = {
  pharmacist: '약사',
  student: '약대생',
};

export function MemberDeleteRiskModal({ memberId, onClose, onDeleted }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DeleteRiskData | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiClient
      .get<{ data: DeleteRiskData }>(`/members/${memberId}/delete-risk`)
      .then((r) => setData(r.data))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [memberId]);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/members/${memberId}?mode=hard`);
      toast.success('완전 삭제 완료');
      onDeleted();
      onClose();
    } catch (e: any) {
      toast.error(e.message || '삭제 실패');
    } finally {
      setDeleting(false);
    }
  };

  const hasActivity = data
    ? (data.hasActivityData ?? (data.risks.forumPosts > 0 || data.risks.forumComments > 0))
    : false;

  const target: MemberHardDeleteTarget = {
    id: memberId,
    name: data?.member.name ?? null,
    email: data?.member.email ?? null,
    status: data?.member.status ?? null,
    memberType: data?.member.membershipType
      ? MEMBERSHIP_TYPE_LABEL[data.member.membershipType] ?? data.member.membershipType
      : null,
    serviceRole: data?.member.role ?? null,
  };

  const riskBlock = loading ? (
    <div className="flex justify-center py-4">
      <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
    </div>
  ) : data ? (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">삭제 시 영향받는 데이터</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: '서비스 연결', value: data.risks.memberServices },
            { label: '포럼 게시글', value: data.risks.forumPosts },
            { label: '포럼 댓글', value: data.risks.forumComments },
            { label: '승인 요청', value: data.risks.approvalRequests },
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

      {hasActivity ? (
        <div className="flex items-start gap-2 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <div className="text-xs text-red-700 space-y-1">
            <p className="font-semibold">
              실제 활동 데이터 (포럼 게시글 {data.risks.forumPosts}건 / 댓글 {data.risks.forumComments}건) 있음
            </p>
            <p>
              완전삭제 시 게시글/댓글의 작성자 정보가 깨지거나 함께 삭제될 수 있습니다.
              잘못 가입된 회원 / 면허번호 중복 해소가 아니라 활동 이력이 있는 회원이라면 신중하게 진행하세요.
            </p>
          </div>
        </div>
      ) : !data.canHardDelete ? (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            감사 로그 등 부수 데이터가 있습니다. 완전삭제는 가능하지만 진행 전 확인하세요.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-600">
            면허번호가 해제되어 동일 면허번호로 재가입할 수 있게 됩니다.
          </p>
        </div>
      )}
    </div>
  ) : (
    <p className="text-center text-sm text-red-500 py-2">리스크 정보를 불러오지 못했습니다.</p>
  );

  return (
    <MemberHardDeleteConfirmModal
      open
      member={target}
      serviceLabel="KPA-Society"
      loading={deleting}
      onClose={onClose}
      onConfirm={handleConfirm}
    >
      {riskBlock}
    </MemberHardDeleteConfirmModal>
  );
}
