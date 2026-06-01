/**
 * OperatorMemberDeleteFlow — admin 회원 삭제 플로우 공통 컴포넌트
 *
 * WO-O4O-OPERATOR-MEMBERS-DELETE-FLOW-COMMONIZATION-V1
 *
 * GlycoPharm / K-Cosmetics admin 페이지의 동일한 인라인 Delete Flow(GpAdminDeleteFlow /
 * KCosAdminDeleteFlow)를 단일 추출. soft delete + hard delete 선택 → 확인 → 실행.
 *
 * 책임 분리:
 *   - 본 컴포넌트: 위험도 표시, 삭제 모드 선택, 확인 UI, 실행 호출
 *   - 호출부: fetchDeleteRisk / executeDelete 함수 주입, toast / list refresh
 *
 * 이미 공통 패턴 완료된 서비스 (hard-delete-only):
 *   - KPA: MemberDeleteRiskModal (thin wrapper around MemberHardDeleteConfirmModal) → 유지
 *   - Neture: AdminMemberDeleteModal (thin wrapper) → 유지
 *
 * 이번 WO 대상 (soft+hard):
 *   - GlycoPharm: GpAdminDeleteFlow (inline) → 본 컴포넌트로 교체
 *   - K-Cosmetics: KCosAdminDeleteFlow (inline) → 본 컴포넌트로 교체
 */

import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, AlertTriangle, Loader2, ShieldAlert, Trash2, X } from 'lucide-react';
import { ConfirmActionDialog } from '@o4o/ui';
import { MemberHardDeleteConfirmModal, type MemberHardDeleteTarget } from './components/MemberHardDeleteConfirmModal';
import type { UserData } from './types';

// ─── Normalized risk type ─────────────────────────────────────

export interface DeleteFlowRiskItem {
  label: string;
  count: number;
}

export interface NormalizedDeleteRisk {
  /** backend canHardDelete (activity=0 + audit=0). admin 진행 여부는 별도 정책. */
  canHardDelete: boolean;
  /** 삭제 영향 데이터 목록 (label + count). 서비스별 정규화 후 전달. */
  riskItems: DeleteFlowRiskItem[];
  /** forum posts/comments > 0 — 강한 경고 표시 트리거 */
  hasActivityData: boolean;
  /** 회원 상태 (표시용) */
  memberStatus: string;
}

// ─── Props ────────────────────────────────────────────────────

export interface OperatorMemberDeleteFlowProps {
  user: UserData;
  /** 서비스 표시명 (예: 'GlycoPharm', 'K-Cosmetics') */
  serviceLabel: string;
  /**
   * 소프트 삭제 옵션 표시 여부. default: true.
   * false 이면 hard delete 단일 경로만 표시 (KPA/Neture 패턴과 유사).
   */
  showSoftDelete?: boolean;
  /** 삭제 위험도 조회. userId를 받아 NormalizedDeleteRisk 반환. */
  fetchDeleteRisk: (userId: string) => Promise<NormalizedDeleteRisk>;
  /** 삭제 실행. soft|hard mode 와 userId 전달. toast / refresh는 호출부 책임. */
  executeDelete: (userId: string, mode: 'soft' | 'hard') => Promise<void>;
  onClose: () => void;
  onDeleted: () => void;
  /** optional: hard delete children slot (추가 경고 블록 등). riskBlock 하단에 삽입. */
  hardDeleteChildren?: ReactNode;
}

// ─── Component ────────────────────────────────────────────────

export function OperatorMemberDeleteFlow({
  user,
  serviceLabel,
  showSoftDelete = true,
  fetchDeleteRisk,
  executeDelete,
  onClose,
  onDeleted,
  hardDeleteChildren,
}: OperatorMemberDeleteFlowProps) {
  const [loading, setLoading] = useState(true);
  const [riskData, setRiskData] = useState<NormalizedDeleteRisk | null>(null);
  const [selectedMode, setSelectedMode] = useState<'soft' | 'hard' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const displayName =
    user.name ||
    `${user.lastName || ''}${user.firstName || ''}`.trim() ||
    user.email?.split('@')[0] ||
    '사용자';

  useEffect(() => {
    fetchDeleteRisk(user.id)
      .then(setRiskData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const execute = async () => {
    if (!selectedMode) return;
    setDeleting(true);
    try {
      await executeDelete(user.id, selectedMode);
      onDeleted();
    } catch {
      // toast는 호출부 executeDelete 내부에서 처리
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  const softConfirmMessage = `"${displayName}" 회원을 탈퇴(비활성화) 처리하시겠습니까?`;
  const hardTarget: MemberHardDeleteTarget = {
    id: user.id,
    name: displayName,
    email: user.email ?? null,
    status: riskData?.memberStatus ?? user.status ?? null,
  };

  // ─── Risk block (children for MemberHardDeleteConfirmModal) ──

  const riskBlock = loading ? (
    <div className="flex justify-center py-4">
      <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
    </div>
  ) : riskData ? (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">삭제 시 영향받는 데이터</p>
        <div className="grid grid-cols-2 gap-2">
          {riskData.riskItems.map((item) => (
            <div
              key={item.label}
              className={`flex justify-between px-3 py-2 rounded text-sm ${
                item.count > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500'
              }`}
            >
              <span>{item.label}</span>
              <span className="font-medium">{item.count}건</span>
            </div>
          ))}
        </div>
      </div>

      {riskData.hasActivityData ? (
        <div className="flex items-start gap-2 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <div className="text-xs text-red-700 space-y-1">
            <p className="font-semibold">
              실제 활동 데이터 (
              {riskData.riskItems.find((r) => r.label.includes('게시글'))?.count ?? 0}건 게시글 /
              {' '}{riskData.riskItems.find((r) => r.label.includes('댓글'))?.count ?? 0}건 댓글) 있음
            </p>
            <p>완전삭제 시 관련 데이터가 소실됩니다.</p>
          </div>
        </div>
      ) : null}

      {hardDeleteChildren ?? null}
    </div>
  ) : (
    <p className="text-center text-sm text-red-500 py-2">리스크 정보를 불러오지 못했습니다.</p>
  );

  // ─── Render ───────────────────────────────────────────────────

  return (
    <>
      {/* 삭제 방식 선택 모달 */}
      {!confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
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
                <div className="bg-slate-50 rounded-lg p-4 space-y-1">
                  <p className="text-sm font-medium text-slate-800">{displayName}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                  <span className="inline-block text-xs px-2 py-0.5 bg-slate-200 rounded mt-1">
                    {riskData.memberStatus}
                  </span>
                </div>

                <div className={`border rounded-lg p-3 ${riskData.canHardDelete ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200'}`}>
                  <p className="text-xs font-medium text-slate-700 mb-2">삭제 영향 분석</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                    {riskData.riskItems.map((item) => (
                      <div key={item.label} className="flex justify-between">
                        <span className="text-slate-500">{item.label}</span>
                        <span className={`font-medium ${item.count > 0 ? 'text-red-600' : ''}`}>{item.count}건</span>
                      </div>
                    ))}
                  </div>
                  {riskData.hasActivityData && (
                    <p className="mt-2 text-xs text-red-700 font-medium">
                      ⚠ 포럼 활동 데이터가 있습니다. 완전 삭제 시 관련 데이터가 소실됩니다.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-600">처리 방식 선택</p>

                  {showSoftDelete && (
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
                  )}

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
                        {riskData.hasActivityData && ' — 포럼 데이터 소실 위험'}
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
              </div>
            ) : (
              <p className="text-center text-sm text-red-500 py-4">리스크 정보를 불러오지 못했습니다.</p>
            )}
          </div>
        </div>
      )}

      {/* Soft delete 확인 */}
      {confirming && selectedMode === 'soft' && (
        <ConfirmActionDialog
          open
          onClose={() => { setConfirming(false); setSelectedMode(null); }}
          onConfirm={execute}
          title="탈퇴 처리 확인"
          message={softConfirmMessage}
          confirmText="탈퇴 처리"
          variant="warning"
          loading={deleting}
        />
      )}

      {/* Hard delete 확인 */}
      {confirming && selectedMode === 'hard' && (
        <MemberHardDeleteConfirmModal
          open
          member={hardTarget}
          serviceLabel={serviceLabel}
          loading={deleting}
          onClose={() => { if (!deleting) { setConfirming(false); setSelectedMode(null); } }}
          onConfirm={execute}
        >
          {riskBlock}
        </MemberHardDeleteConfirmModal>
      )}
    </>
  );
}
