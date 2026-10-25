import { useEffect, useRef, useState } from 'react';
import { productCorrectionApi as api } from '@/api/product-correction.api';
type Queue = Awaited<ReturnType<typeof api.proposalQueue>>;
type Filter = Parameters<typeof api.proposalQueue>[0];
export default function ProductCorrectionProposalQueue() {
  const [result, setResult] = useState<Queue | null>(null);
  const [filter, setFilter] = useState<Filter>('pending');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const serial = useRef(0);
  useEffect(
    () => () => {
      serial.current++;
    },
    [],
  );
  const load = async (nextFilter: Filter, page = 1) => {
    const request = ++serial.current;
    setBusy(true);
    setError('');
    try {
      const data = await api.proposalQueue(nextFilter, page);
      if (request === serial.current) setResult(data);
    } catch (e) {
      if (request === serial.current) {
        setResult(null);
        setError(e instanceof Error ? e.message : '현황 조회 실패');
      }
    } finally {
      if (request === serial.current) setBusy(false);
    }
  };
  return (
    <section className="space-y-2 rounded border p-3" aria-label="상품 변경안 처리 현황">
      <h4 className="font-semibold">변경안 처리 현황</h4>
      <p className="text-sm">
        수동 검토 작업 현황과 별도로 변경안의 승인·반영 상태를 조회합니다. 충돌·실패한 반영은 완료로
        처리되지 않으며 기존 변경안에서 재검토합니다.
      </p>
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="변경안 현황 조건"
          className="rounded border p-2"
          disabled={busy}
          value={filter}
          onChange={(e) => {
            const next = e.target.value as Filter;
            setFilter(next);
            void load(next);
          }}
        >
          <option value="all">전체 변경안</option>
          <option value="pending">검토 대기</option>
          <option value="reviewed">검토 완료·미반영 (반려 포함)</option>
          <option value="applied">반영 완료</option>
          <option value="failed">반영 오류·충돌 이력 (미반영)</option>
        </select>
        <button
          type="button"
          className="rounded border px-3 py-2 disabled:opacity-50"
          disabled={busy}
          onClick={() => void load(filter)}
        >
          변경안 현황 조회·새로고침
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {result && (
        <>
          <p>
            {result.total}개 변경안 · {result.page}페이지
          </p>
          {!result.items.length && <p>해당 조건의 변경안이 없습니다.</p>}
          {result.items.map((p) => (
            <div key={p.id} className="break-words rounded border p-2">
              <strong>{p.productName}</strong> ·{' '}
              {p.appliedAt ? '반영 완료' : p.reviewedAt ? '검토 완료·미반영' : '검토 대기'} ·{' '}
              {new Date(p.createdAt).toLocaleString()}{' '}
              <a
                className="text-blue-700 underline"
                href={`/admin/o4o-product-db/maintenance?batch=${p.batchId}&task=${p.taskId}&proposal=${p.id}`}
              >
                상품 작업·변경안 열기
              </a>
            </div>
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || result.page <= 1}
              onClick={() => void load(filter, result.page - 1)}
            >
              이전 변경안
            </button>
            <button
              type="button"
              disabled={busy || result.page * result.pageSize >= result.total}
              onClick={() => void load(filter, result.page + 1)}
            >
              다음 변경안
            </button>
          </div>
        </>
      )}
    </section>
  );
}
