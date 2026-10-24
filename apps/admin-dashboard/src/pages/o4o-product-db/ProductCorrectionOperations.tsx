import { useEffect, useRef, useState } from 'react';
import type {
  ProductCorrectionOperationFilter,
  ProductCorrectionOperations,
  ProductCorrectionRunSummary,
} from '@o4o/types';
import { productCorrectionApi as api } from '@/api/product-correction.api';
const filters: Record<ProductCorrectionOperationFilter, string> = {
  all: '전체 최신 기록',
  open: '미완료',
  due: '정기 점검 도래',
  followup: '재확인 도래',
  reviewed: '검토 완료',
  outdated: '기준 변경 재점검',
};
const states: Record<string, string> = {
  pending: '대기',
  in_progress: '작업 중',
  needs_source: '근거 대기',
  review_ready: '검토 대기',
  deferred: '보류',
  no_change: '수정 불필요',
  reviewed: '변경안 검토 완료 (미적용)',
  excluded: '대상 제외',
};
const date = (value?: string | null) => (value ? new Date(value).toLocaleString() : '없음');
const button = 'rounded border px-3 py-2 text-sm disabled:opacity-40';
export default function ProductCorrectionOperations({
  refresh = 0,
  onOpen,
}: {
  refresh?: number;
  onOpen?: (batchId: string, taskId: string) => void;
}) {
  const [filter, setFilter] = useState<ProductCorrectionOperationFilter>('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ProductCorrectionOperations | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    api
      .operations(filter, page)
      .then((value) => {
        if (live) setData(value);
      })
      .catch(() => {
        if (live) {
          setData(null);
          setError('정기 관리 현황을 불러오지 못했습니다.');
        }
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [refresh, filter, page, reload]);
  return (
    <section aria-label="수동 정기 관리 현황" className="space-y-3 rounded border bg-white p-4">
      <h3 className="font-semibold">수동 정기 관리 현황</h3>
      <button className={button} disabled={loading} onClick={() => setReload((v) => v + 1)}>
        현황 새로고침
      </button>
      <p className="text-xs text-gray-500">
        사용 중인 기준의 상품별 최신 검토 기록입니다. 상품 원문 변경 여부는 다시 점검할 때 확인합니다. 현황
        조건 간에는 중복이 있을 수 있습니다.
      </p>
      {error && <p role="alert">{error}</p>}
      {data && (
        <p className="text-sm">
          기록 {data.counts.total}건 · 상품 {data.counts.products}개 · 미완료 {data.counts.open}건 · 정기 도래{' '}
          {data.counts.due}건 · 재확인 도래 {data.counts.followup}건 · 기준 변경 {data.counts.outdated}건
        </p>
      )}
      <label className="block text-sm">
        관리 현황 조건
        <select
          aria-label="관리 현황 조건"
          className="ml-2 max-w-full rounded border p-2"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as ProductCorrectionOperationFilter);
            setPage(1);
          }}
        >
          {Object.entries(filters).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {loading ? (
        <p>현황 확인 중…</p>
      ) : (
        data && (
          <>
            <ul className="space-y-2">
              {data.items.map((item) => (
                <li key={`${item.batchId}:${item.taskId}`} className="rounded border p-3 text-sm">
                  <p>
                    {item.productName} · {item.ruleTitle} v{item.ruleRevision} · {states[item.state]}
                    {item.outdated ? ' · 기준 변경 재점검 필요' : ''}
                  </p>
                  <p className="text-xs text-gray-500">
                    검토 완료: {date(item.reviewedAt)} · 다음 점검: {date(item.nextReviewAt)} · 재확인:{' '}
                    {date(item.followUpAt)}
                  </p>
                  {onOpen ? (
                    <button className={button} onClick={() => onOpen(item.batchId, item.taskId)}>
                      이 작업 열기
                    </button>
                  ) : (
                    <a
                      className="text-blue-700 underline"
                      href={`/admin/o4o-product-db/maintenance?batch=${item.batchId}&task=${item.taskId}`}
                    >
                      이 작업 열기
                    </a>
                  )}
                </li>
              ))}
            </ul>
            {!data.items.length && <p className="text-sm">해당 조건의 작업 기록이 없습니다.</p>}
            <div className="flex gap-2">
              <button className={button} disabled={page <= 1} onClick={() => setPage(page - 1)}>
                이전 현황
              </button>
              <span className="p-2 text-sm">
                {page}페이지 · {data.total}건
              </span>
              <button className={button} disabled={page * 10 >= data.total} onClick={() => setPage(page + 1)}>
                다음 현황
              </button>
            </div>
          </>
        )
      )}
    </section>
  );
}
export function ProductCorrectionRuns({
  refresh,
  onRetry,
  canWrite,
}: {
  refresh: number;
  onRetry: () => void;
  canWrite: boolean;
}) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: ProductCorrectionRunSummary[]; total: number } | null>(null);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);
  const lock = useRef(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let live = true;
    api
      .runs(page)
      .then((result) => {
        if (live) {
          setData(result);
          setError('');
        }
      })
      .catch(() => {
        if (live) {
          setError('실행 이력을 불러오지 못했습니다.');
          setData(null);
        }
      });
    return () => {
      live = false;
    };
  }, [refresh, page, reload]);
  return (
    <section aria-label="점검 실행 이력" className="space-y-2 border-t pt-4">
      <h4 className="font-semibold">점검 실행 이력</h4>
      <button className={button} onClick={() => setReload((v) => v + 1)}>
        실행 이력 새로고침
      </button>
      <p className="text-xs text-gray-500">
        실행 범위는 검색 결과 한 페이지(최대 25개)입니다. 후보 수는 검토 완료 수가 아닙니다. 재실행은 새
        이력으로 남습니다.
      </p>
      {error && <p role="alert">{error}</p>}
      {data?.items.map((run) => (
        <div key={run.id} className="rounded border p-3 text-sm">
          <p>
            {run.ruleTitle} v{run.ruleRevision} ·{' '}
            {run.status === 'completed'
              ? '조회 점검 완료'
              : run.status === 'failed'
                ? '점검 실패'
                : '실행 중'}{' '}
            · {date(run.startedAt)}
          </p>
          <p>
            검색: {run.scope.search || '전체'} · {run.scope.page}페이지 · 후보{' '}
            {run.totalCandidates === null ? '확인 실패' : `${run.totalCandidates}개`} · 표시{' '}
            {run.returnedCount}개{run.retryOf ? ' · 실패 실행의 재시도' : ''}
          </p>
          {(run.status === 'failed' ||
            (run.status === 'running' && Date.now() - new Date(run.startedAt).getTime() >= 300000)) && (
            <button
              className={button}
              disabled={retrying || !canWrite}
              onClick={async () => {
                if (lock.current) return;
                lock.current = true;
                setRetrying(true);
                try {
                  const result = await api.retryRun(run.id);
                  setError(
                    result.status === 'failed'
                      ? '재실행이 실패했습니다. 상품 원본은 변경되지 않았습니다.'
                      : '',
                  );
                  setReload((v) => v + 1);
                  onRetry();
                } catch (e) {
                  setError(e instanceof Error ? e.message : '재실행 실패');
                } finally {
                  lock.current = false;
                  setRetrying(false);
                }
              }}
            >
              {run.status === 'running' ? '중단 실행 복구·재실행' : '실패 범위 다시 실행'}
            </button>
          )}
        </div>
      ))}
      {data && !data.items.length && <p>점검 실행 기록이 없습니다.</p>}
      <div className="flex gap-2">
        <button className={button} disabled={page <= 1} onClick={() => setPage(page - 1)}>
          이전 실행
        </button>
        <button
          className={button}
          disabled={!data || page * 10 >= data.total}
          onClick={() => setPage(page + 1)}
        >
          다음 실행
        </button>
      </div>
    </section>
  );
}
