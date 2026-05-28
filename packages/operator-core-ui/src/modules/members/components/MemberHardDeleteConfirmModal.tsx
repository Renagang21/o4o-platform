/**
 * MemberHardDeleteConfirmModal — admin 전용 회원 완전삭제 확인 모달 (공통)
 *
 * WO-O4O-MEMBER-MANAGEMENT-HARD-DELETE-FLOW-COMMONIZATION-V1
 *
 * 4서비스(KPA / GlycoPharm / K-Cosmetics / Neture)의 admin 완전삭제 확인 UI 공통화.
 *
 * 책임 분리:
 *   - 본 컴포넌트: UI / 확인 입력 / 취소·삭제 버튼 / loading 표시 / onConfirm 호출
 *   - 호출부 책임: hard delete API 호출, 성공 후 리스트 갱신, 에러 처리, toast/result modal
 *
 * 서비스별 위험 정보(forum 게시글/댓글 카운트 등)는 optional `children` slot 으로 받는다.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Loader2, ShieldAlert, X } from 'lucide-react';

export type MemberHardDeleteTarget = {
  id: string;
  name?: string | null;
  email?: string | null;
  status?: string | null;
  serviceRole?: string | null;
  memberType?: string | null;
};

export type MemberHardDeleteConfirmModalProps = {
  open: boolean;
  member: MemberHardDeleteTarget | null;
  serviceLabel: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  /** 서비스별 위험 정보 / 활동 경고 등 부가 정보를 받는 optional slot. */
  children?: ReactNode;
};

const CONFIRM_KEYWORD = '완전삭제';

export function MemberHardDeleteConfirmModal({
  open,
  member,
  serviceLabel,
  loading = false,
  onClose,
  onConfirm,
  children,
}: MemberHardDeleteConfirmModalProps) {
  const [confirmInput, setConfirmInput] = useState('');

  useEffect(() => {
    if (!open) setConfirmInput('');
  }, [open]);

  if (!open || !member) return null;

  const canSubmit = confirmInput.trim() === CONFIRM_KEYWORD && !loading;
  const displayName = member.name?.trim() || member.email || '이름 없음';

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-bold text-slate-900">회원 완전삭제</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1 hover:bg-slate-100 rounded disabled:opacity-50"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-700">이 작업은 복구할 수 없습니다.</p>
            <p className="text-xs text-red-600 mt-1">
              계정과 연결된 멤버십·역할 정보가 모두 삭제되며 되돌릴 수 없습니다.
            </p>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>서비스</span>
              <span className="font-medium text-slate-700">{serviceLabel}</span>
            </div>
            <p className="text-sm font-medium text-slate-800 pt-1">{displayName}</p>
            {member.email ? (
              <p className="text-xs text-slate-500">{member.email}</p>
            ) : null}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {member.status ? (
                <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                  {member.status}
                </span>
              ) : null}
              {member.memberType ? (
                <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                  {member.memberType}
                </span>
              ) : null}
              {member.serviceRole ? (
                <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                  {member.serviceRole}
                </span>
              ) : null}
            </div>
          </div>

          {children ? <div>{children}</div> : null}

          <div className="space-y-1.5">
            <label htmlFor="member-hard-delete-confirm" className="text-xs text-slate-600">
              계속하려면 <span className="font-semibold text-red-600">{CONFIRM_KEYWORD}</span> 를 입력하세요.
            </label>
            <input
              id="member-hard-delete-confirm"
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              disabled={loading}
              placeholder={CONFIRM_KEYWORD}
              autoComplete="off"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 disabled:bg-slate-50"
            />
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:bg-red-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? '삭제 중...' : '완전삭제'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 rounded-lg disabled:opacity-50"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
