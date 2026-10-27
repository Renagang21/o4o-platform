import { useEffect, useRef, useState } from 'react';
import { contributeProductDescription } from '../../api/productDescriptionResources';
import { useStoreOperationScope } from '../../hooks/useStoreOperationScope';
export function ProductDescriptionContribution({ id, revision, disabled = false }: Readonly<{ id: string; revision: string; disabled?: boolean }>) {
  const scope = useStoreOperationScope(), generation = useRef(0);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  useEffect(() => { generation.current++; setMessage(''); setBusy(false); return () => { generation.current++; }; }, [id, revision, scope.key]);
  const submit = async () => {
    const key = ++generation.current; setBusy(true); setMessage('');
    try { const result = await contributeProductDescription(id, revision);
      if (key === generation.current && scope.isCurrent()) setMessage(result.replayed ? '같은 저장본이 이미 검토 대기에 있습니다.' : '관리자 검토 대기로 제출했습니다.');
    } catch { if (key === generation.current && scope.isCurrent()) setMessage('제출하지 못했습니다. 최신 저장본·상품 연결·소유자 권한을 확인해 주세요.'); }
    finally { if (key === generation.current) setBusy(false); }
  };
  return <section className="mb-4 rounded border border-blue-200 bg-blue-50 p-3 text-sm space-y-2">
    <p>저장한 상담 본문과 입력 근거를 공통 상품 설명 개선안으로 제출할 수 있습니다. 관리자 승인 후 공통 설명에 반영되며, 내 매장 원본은 유지됩니다.</p>
    <button className="rounded border border-blue-400 px-3 py-2 disabled:opacity-40" disabled={disabled || busy || !revision} onClick={() => void submit()}>{busy ? '제출 중…' : '저장한 설명을 관리자에게 제안'}</button>
    <output className="block">{message}</output>
  </section>;
}
