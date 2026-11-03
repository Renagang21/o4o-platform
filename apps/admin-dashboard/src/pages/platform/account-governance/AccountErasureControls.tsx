import { useEffect, useRef, useState } from 'react';
import { api } from '@/api/base';

import type { UserErasureResult as AccountErasureResult } from '@/types/user';
const LABELS: Record<AccountErasureResult['state'], string> = {
  pending: '삭제 중', processing: '삭제 중', review_required: '삭제 미완료 — 확인 필요',
  retry_required: '삭제 실패 — 재시도 가능', completed: '계정·개인자료 삭제 완료',
};

const ERRORS: Record<string, string> = {
  ACCOUNT_ERASURE_ROLLOUT_REQUIRED: '현재 계정 삭제 기능이 비활성화돼 있습니다. 배포 담당자가 활성화 상태를 확인해야 합니다.',
  PERSONAL_FILE_INVENTORY_REVIEW_REQUIRED: '개인 첨부파일 삭제 준비가 완료되지 않았습니다. 배포 담당자의 확인이 필요합니다.',
  ACCOUNT_ERASURE_MIGRATION_REQUIRED: '계정 삭제에 필요한 데이터베이스 준비가 완료되지 않았습니다.',
  ERASURE_SYSTEM_CLASSIFICATION_REQUIRED: '최소 보존 기록의 처리 기준 설정이 필요합니다.',
  FORBIDDEN: '계정·개인자료 삭제는 전체 관리자만 할 수 있습니다.',
  AUTH_REQUIRED: '다시 로그인한 뒤 처리해 주세요.',
  SUPER_ADMIN_PROTECTED: '전체 관리자 계정은 이 화면에서 삭제할 수 없습니다.',
  DEMO_ACCOUNT_FORBIDDEN: '보호된 데모 계정은 삭제할 수 없습니다.',
  PHARMACY_TRANSFER_OR_CLOSURE_REQUIRED: '약국을 매도했다면 경영자 이전을, 폐업했다면 약국 자료 삭제를 먼저 완료해 주세요.',
  COMMUNITY_MANAGEMENT_TRANSFER_REQUIRED: '커뮤니티 관리 권한을 다른 관리자에게 이전해 주세요.',
  COOPERATIVE_MANAGEMENT_TRANSFER_REQUIRED: '협력 모임 관리 권한을 다른 관리자에게 이전해 주세요.',
  PHARMACY_CLOSURE_INCOMPLETE: '폐업한 약국의 자료·파일 삭제가 미완료입니다. 폐업 자료 삭제를 재시도해 주세요.',
  SUPPLIER_OWNER_DISPOSITION_REVIEW_REQUIRED: '공급자 소유 관계가 공동 소유 또는 기존 계정 연결과 충돌합니다. 공급자 업무에서 소유 관계를 정리한 뒤 재시도해 주세요.',
  PERSONAL_FILE_SHARED_USAGE_REVIEW_REQUIRED: '다른 사용자·사업체에서 참조하는 파일이 있습니다. 공유·소유 관계를 확인한 뒤 처리해 주세요.',
  SYSTEM_LOG_RETENTION_ANCHOR_REVIEW_REQUIRED: '최소 보존 기록의 기준 시각을 확인해야 합니다. 원본 기준을 검토한 뒤 재시도해 주세요.',
  SUPPLIER_PRIVATE_FILES_REVIEW_REQUIRED: '공급자 개인 증빙파일 삭제가 필요합니다. 제품·거래 자료와 분리해 처리해 주세요.',
  USER_NOT_FOUND: '이미 삭제됐거나 존재하지 않는 회원입니다. 목록을 새로 조회해 주세요.',
  SERVICE_STOP_REQUIRED: '서비스 이용 상태를 다시 확인해 주세요. 최신 계정 삭제 API에서는 사전 정지가 필요하지 않습니다.',
};
function deletionMessage(code?: string) {
  return code && ERRORS[code] ? ERRORS[code] : '삭제를 완료하지 못했습니다. 다시 시도해 주세요.';
}

/** The server's erased flag is authoritative; accepted/202 is never a deletion success. */
export default function AccountErasureControls({ accountId, userId, onCompleted, onBusyChange, initialResult, executionEnabled=true, onResult }: {
  onResult?:(result:AccountErasureResult)=>void; executionEnabled?:boolean; initialResult?: AccountErasureResult;
  accountId: string; userId: string; onCompleted: () => void; onBusyChange?: (busy: boolean) => void;
}) {
  const [result, setResult] = useState<AccountErasureResult | null>(initialResult ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const epoch = useRef({ generation: 0 });
  useEffect(() => {
    const state=epoch.current;
    ++state.generation;lock.current=false;setResult(initialResult ?? null);setError(null);setBusy(false);
    return () => { ++state.generation; };
  }, [accountId,userId,initialResult]);
  const run = async (action: 'request' | 'status' | 'retry') => {
    if (lock.current || (action!=='status'&&!executionEnabled)) return;
    if (action === 'request' && !window.confirm('계정과 개인 소유 자료·첨부파일을 삭제합니다. 직원이 등록한 사업체 자료와 매도한 약국의 자료, 공급자 제품·거래 자료는 유지됩니다. 이 작업은 되돌릴 수 없습니다. 삭제하시겠습니까?')) return;
    lock.current=true;
    const captured = epoch.current.generation;
    let completed = false;
    onBusyChange?.(true);
    setBusy(true); setError(null);
    try {
      const response = action === 'request' ? await api.delete(`/admin/users/${userId}`)
        : action === 'status' ? await api.get(`/admin/users/erasure-operations/${result!.operationId}`)
          : await api.post(`/admin/users/erasure-operations/${result!.operationId}/retry`);
      if (captured !== epoch.current.generation) return;
      const data = response.data?.data as AccountErasureResult | undefined;
      if (!data || typeof data.erased !== 'boolean' || !Object.prototype.hasOwnProperty.call(LABELS,data.state) || (data.state === 'completed') !== data.erased) throw new Error('INVALID_RESPONSE');
      setResult(data);onResult?.(data);
      completed = data.state === 'completed' && data.erased === true;
    } catch (e) {
      const code = (e as { response?: { data?: { code?: string } } }).response?.data?.code;
      if (captured === epoch.current.generation) setError(deletionMessage(code));
    } finally { if (captured === epoch.current.generation) {
      lock.current=false;setBusy(false); onBusyChange?.(false);
      // Release the parent command lock before its completion refresh can run.
      if (completed) onCompleted();
    } }
  };
  return <div className="space-y-2 text-sm">
    {result ? <>
      <p role="status">{LABELS[result.state]}{result.state !== 'completed' ? ' · 삭제 미완료' : ''}</p>
      {(result.reviewCodes?.length ?? 0) > 0 && <ul className="list-disc pl-5">{result.reviewCodes?.map(code => <li key={code}>{deletionMessage(code)} <span className="text-xs text-slate-500">({code})</span></li>)}</ul>}
      {result.errorCode && <p role="alert">{deletionMessage(result.errorCode)} ({result.errorCode})</p>}
      {typeof result.remainingFileTasks === "number" && <p>남은 파일: {result.remainingFileTasks}건</p>}
      {result.reviewDueAt && <p className="text-xs text-slate-500">검토 기한: {new Date(result.reviewDueAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</p>}
      {!result.erased && <div className="flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => run('status')} className="text-blue-700 disabled:opacity-50">상태 확인</button>
        <button disabled={busy||!executionEnabled} onClick={() => run('retry')} className="text-blue-700 disabled:opacity-50">재시도</button>
      </div>}
    </> : <button disabled={busy||!executionEnabled} onClick={() => run('request')} className="text-rose-700 disabled:opacity-50">계정·개인자료 완전삭제</button>}
    {error && <p role="alert" className="text-rose-700">{error}</p>}
  </div>;
}
