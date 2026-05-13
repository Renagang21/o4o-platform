/**
 * MemberDeleteRiskModal — 관리자(admin) 전용 회원 완전삭제 위험도 확인 모달
 *
 * WO-O4O-KPA-ADMIN-MEMBER-MANAGEMENT-SEPARATION-V1
 *   /operator/members 에서 운영자/관리자 공용으로 쓰던 DeleteRiskModal 을
 *   /admin/members 전용 hard-delete focused 모달로 이전.
 *   - 운영자 분기 / 탈퇴(soft) 버튼 제거 — soft delete 는 /operator/members 에 잔존
 *   - "완전삭제(hard delete)" 단일 액션 + 활동 데이터 경고 + 면허번호 해제 안내
 *
 * 기존 정책 보존 (WO-O4O-KPA-MEMBER-HARDDELETE-ADMIN-FOR-MISREGISTRATION-V1):
 *   - admin 은 활동 데이터 있어도 완전삭제 가능 (강한 경고로 보호)
 *   - 감사 로그만 있는 경우에도 진행 가능
 *   - 면허번호(kpa_members.license_number) + 연결 데이터 cascade 정리
 */

import { useState, useEffect } from 'react';
import { ShieldAlert, X, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { ConfirmActionDialog } from '@o4o/ui';
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

export function MemberDeleteRiskModal({ memberId, onClose, onDeleted }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DeleteRiskData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    apiClient
      .get<{ data: DeleteRiskData }>(`/members/${memberId}/delete-risk`)
      .then((r) => setData(r.data))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [memberId]);

  const executeDelete = async () => {
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
      setConfirmOpen(false);
    }
  };

  const hasActivity = data
    ? (data.hasActivityData ?? (data.risks.forumPosts > 0 || data.risks.forumComments > 0))
    : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-bold text-slate-900">회원 완전삭제 (admin)</h3>
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
            {/* 회원 정보 */}
            <div className="bg-slate-50 rounded-lg p-4 space-y-1">
              <p className="text-sm font-medium text-slate-800">{data.member.name}</p>
              <p className="text-xs text-slate-500">{data.member.email}</p>
              <div className="flex gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 bg-slate-200 rounded">
                  {data.member.membershipType === 'pharmacist' ? '약사' : '약대생'}
                </span>
                <span className="text-xs px-2 py-0.5 bg-slate-200 rounded">{data.member.status}</span>
              </div>
            </div>

            {/* 영향 데이터 */}
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

            {/* 경고 — 활동 데이터 있을 때 빨간색 강조, 감사 로그만 있을 때 노란색 안내 */}
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
            ) : null}

            {/* 액션 */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={deleting}
                className="w-full px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                완전삭제 (되돌릴 수 없음)
              </button>
              <button onClick={onClose} className="w-full px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 rounded-lg">
                취소
              </button>
            </div>

            {/* Confirm Dialog */}
            <ConfirmActionDialog
              open={confirmOpen}
              onClose={() => setConfirmOpen(false)}
              onConfirm={executeDelete}
              title="완전 삭제 확인"
              message={(() => {
                const lines = [
                  '이 회원의 다음 데이터가 완전히 삭제됩니다 (되돌릴 수 없음):',
                  '• users / kpa_members (면허번호 포함)',
                  '• service_memberships / role_assignments',
                  '• kpa_member_services / 약사·약대생·전문가·공급사 프로필',
                ];
                if (hasActivity) {
                  lines.push('');
                  lines.push(`⚠ 활동 데이터: 포럼 게시글 ${data.risks.forumPosts}건, 댓글 ${data.risks.forumComments}건`);
                  lines.push('잘못 가입된 회원 정리가 아니라면 신중하게 진행하세요.');
                } else {
                  lines.push('');
                  lines.push('면허번호가 해제되어 동일 면허번호로 재가입할 수 있게 됩니다.');
                }
                return lines.join('\n');
              })()}
              confirmText="완전 삭제"
              variant="danger"
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
