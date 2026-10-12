import { useEffect, useRef, useState } from 'react';
import { api } from '@/api/base';

import type { UserErasureResult as AccountErasureResult } from '@/types/user';
const LABELS: Record<AccountErasureResult['state'], string> = {
  pending: '제거 처리 대기', processing: '제거 처리 중', review_required: '자료 분류 검토 필요',
  retry_required: '처리 미완료 — 재시도 필요', completed: '계정·일반 개인정보 제거 완료',
};

/** The server's erased flag is authoritative; accepted/202 is never a deletion success. */
export default function AccountErasureControls({ accountId, userId, onCompleted }: {
  accountId: string; userId: string; onCompleted: () => void;
}) {
  const [result, setResult] = useState<AccountErasureResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const epoch = useRef({ generation: 0 });
  useEffect(() => {
    const state=epoch.current;
    ++state.generation;setResult(null);setError(null);setBusy(false);
    return () => { ++state.generation; };
  }, [accountId,userId]);
  const run = async (action: 'request' | 'status' | 'retry') => {
    if (action === 'request' && !window.confirm('해당 서비스의 사용중지 절차를 확인한 뒤 전체 계정·일반 개인정보 완전 제거를 요청합니다. 진행하시겠습니까?')) return;
    const captured = epoch.current.generation;
    setBusy(true); setError(null);
    try {
      const response = action === 'request' ? await api.delete(`/admin/users/${userId}`)
        : action === 'status' ? await api.get(`/admin/users/erasure-operations/${result!.operationId}`)
          : await api.post(`/admin/users/erasure-operations/${result!.operationId}/retry`);
      if (captured !== epoch.current.generation) return;
      const data = response.data?.data as AccountErasureResult | undefined;
      if (!data || typeof data.erased !== 'boolean' || !Object.prototype.hasOwnProperty.call(LABELS,data.state) || (data.state === 'completed') !== data.erased) throw new Error('INVALID_RESPONSE');
      setResult(data);
      if (data.state === 'completed' && data.erased === true) onCompleted();
    } catch (e) {
      const code = (e as { response?: { data?: { code?: string } } }).response?.data?.code;
      if (captured === epoch.current.generation) setError(code === 'SERVICE_STOP_REQUIRED'
        ? '이용 중인 서비스의 Operator가 먼저 해당 서비스 사용중지를 처리해야 합니다.'
        : '요청을 완료하지 못했습니다. 제거 완료로 처리되지 않았습니다. 관리자에게 처리 상태를 확인하세요.');
    } finally { if (captured === epoch.current.generation) setBusy(false); }
  };
  return <div className="space-y-2 text-sm">
    {result ? <>
      <p role="status">{LABELS[result.state]}{result.state !== 'completed' ? ' · 제거 미완료' : ''}</p>
      {result.reviewDueAt && <p className="text-xs text-slate-500">검토 기한: {new Date(result.reviewDueAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</p>}
      {!result.erased && <div className="flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => run('status')} className="text-blue-700 disabled:opacity-50">상태 확인</button>
        <button disabled={busy} onClick={() => run('retry')} className="text-blue-700 disabled:opacity-50">재시도</button>
      </div>}
    </> : <button disabled={busy} onClick={() => run('request')} className="text-rose-700 disabled:opacity-50">완전 제거 요청</button>}
    {error && <p role="alert" className="text-rose-700">{error}</p>}
  </div>;
}
