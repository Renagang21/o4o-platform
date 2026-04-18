/**
 * useBatchAction — Batch API hook
 *
 * WO-O4O-TABLE-STANDARD-V3
 *
 * API 함수를 주입받아 배치 실행 → BatchResult 파싱 → 재시도 지원
 */

import { useState, useCallback } from 'react';
import type { BatchResult, BatchResultItem } from './batch-types';

/** API function — supports both direct `{ data: { results } }` and axios-style `{ data: { data: { results } } }` */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BatchApiFn = (ids: string[], options?: Record<string, unknown>) => Promise<any>;

export function useBatchAction() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [lastApiFn, setLastApiFn] = useState<BatchApiFn | null>(null);
  const [lastOptions, setLastOptions] = useState<Record<string, unknown> | undefined>();

  const parseBatchResult = (items: BatchResultItem[]): BatchResult => ({
    results: items,
    successCount: items.filter(r => r.status === 'success').length,
    failedCount: items.filter(r => r.status === 'failed').length,
    skippedCount: items.filter(r => r.status === 'skipped').length,
  });

  const executeBatch = useCallback(async (
    apiFn: BatchApiFn,
    ids: string[],
    options?: Record<string, unknown>,
  ): Promise<BatchResult> => {
    setLoading(true);
    setLastApiFn(() => apiFn);
    setLastOptions(options);
    try {
      const res = await apiFn(ids, options);
      // Support both: direct { data: { results } } and axios-style { data: { data: { results } } }
      const items: BatchResultItem[] = res?.data?.results || res?.data?.data?.results || [];
      const parsed = parseBatchResult(items);
      setResult(parsed);
      setShowResult(true);
      return parsed;
    } catch (err: any) {
      // Network/server error — treat all as failed
      const fallback: BatchResult = {
        results: ids.map(id => ({ id, status: 'failed' as const, error: err.message || 'Network error' })),
        successCount: 0,
        failedCount: ids.length,
        skippedCount: 0,
      };
      setResult(fallback);
      setShowResult(true);
      return fallback;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setShowResult(false);
    setResult(null);
  }, []);

  const retryFailed = useCallback(async (apiFn?: BatchApiFn): Promise<BatchResult | null> => {
    if (!result) return null;
    const failedIds = result.results.filter(r => r.status === 'failed').map(r => r.id);
    if (failedIds.length === 0) return null;

    const fn = apiFn || lastApiFn;
    if (!fn) return null;

    return executeBatch(fn, failedIds, lastOptions);
  }, [result, lastApiFn, lastOptions, executeBatch]);

  return {
    loading,
    result,
    showResult,
    executeBatch,
    clearResult,
    retryFailed,
  };
}
