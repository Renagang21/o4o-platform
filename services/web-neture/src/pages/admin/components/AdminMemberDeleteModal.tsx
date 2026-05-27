/**
 * AdminMemberDeleteModal — Neture admin 전용 회원 완전삭제 모달
 *
 * WO-O4O-NETURE-ADMIN-MEMBER-HARD-DELETE-V1
 *
 * - delete-risk 조회 후 영향 데이터 표시
 * - 활동 데이터(포럼 등) 있으면 강한 경고
 * - 2중 확인(모달 → Confirm Dialog) 후 hard delete 실행
 * - operator 화면에는 이 모달 노출하지 않음 (admin 전용)
 */

import { useState, useEffect } from 'react';
import { ShieldAlert, X, Loader2, AlertTriangle } from 'lucide-react';
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
  const [data, setData] = useState<DeleteRiskData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [step, setStep] = useState<'risk' | 'confirm'>('risk');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ success: boolean; data: DeleteRiskData }>(`/operator/members/${userId}/delete-risk`)
      .then((r: { data: DeleteRiskData }) => setData(r.data))
      .catch((e: Error) => setError(e.message || '리스크 정보를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [userId]);

  const executeDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/operator/members/${userId}?mode=hard`);
      onDeleted();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '삭제 실패';
      setError(msg);
      setStep('risk');
    } finally {
      setDeleting(false);
    }
  };

  const hasActivity = data
    ? (data.risks.forumPosts > 0 || data.risks.forumComments > 0)
    : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-bold text-slate-900">회원 완전삭제 (admin 전용)</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <div className="text-center text-sm text-red-500 py-4">{error}</div>
        ) : data && step === 'risk' ? (
          <div className="space-y-4">
            {/* 회원 정보 */}
            <div className="bg-slate-50 rounded-lg p-4 space-y-1">
              <p className="text-sm font-medium text-slate-800">{data.user.name || userName}</p>
              <p className="text-xs text-slate-500">{data.user.email}</p>
              <span className="inline-block text-xs px-2 py-0.5 bg-slate-200 rounded mt-1">
                {data.user.status}
              </span>
            </div>

            {/* 영향 데이터 */}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">삭제 시 영향받는 데이터</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '서비스 멤버십', value: data.risks.serviceMemberships },
                  { label: '포럼 게시글',  value: data.risks.forumPosts },
                  { label: '포럼 댓글',    value: data.risks.forumComments },
                  { label: '감사 로그',    value: data.risks.auditLogs },
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

            {/* 경고 */}
            {hasActivity ? (
              <div className="flex items-start gap-2 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <div className="text-xs text-red-700 space-y-1">
                  <p className="font-semibold">
                    실제 활동 데이터 (게시글 {data.risks.forumPosts}건 / 댓글 {data.risks.forumComments}건) 있음
                  </p>
                  <p>완전삭제 시 게시글/댓글의 작성자 정보가 깨지거나 함께 삭제될 수 있습니다. 신중하게 진행하세요.</p>
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
                onClick={() => setStep('confirm')}
                className="w-full px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg"
              >
                완전삭제 진행 →
              </button>
              <button onClick={onClose} className="w-full px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 rounded-lg">
                취소
              </button>
            </div>
          </div>
        ) : data && step === 'confirm' ? (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg space-y-2">
              <p className="text-sm font-bold text-red-700">최종 확인 — 되돌릴 수 없습니다</p>
              <p className="text-xs text-red-600">
                다음 데이터가 완전히 삭제됩니다:
              </p>
              <ul className="text-xs text-red-600 space-y-0.5 pl-4 list-disc">
                <li>service_memberships (서비스 연결)</li>
                <li>role_assignments (역할 정보)</li>
                <li>users 비활성화 (계정 기록 보존, 로그인 불가)</li>
                {hasActivity && (
                  <li className="font-semibold">
                    포럼 게시글 {data.risks.forumPosts}건 / 댓글 {data.risks.forumComments}건 영향
                  </li>
                )}
              </ul>
              <p className="text-xs text-red-600 font-medium">
                대상: <span className="font-bold">{data.user.name || userName}</span> ({data.user.email})
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={executeDelete}
                disabled={deleting}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {deleting ? '삭제 중...' : '완전삭제 확인'}
              </button>
              <button
                onClick={() => setStep('risk')}
                disabled={deleting}
                className="w-full px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 rounded-lg disabled:opacity-40"
              >
                돌아가기
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
