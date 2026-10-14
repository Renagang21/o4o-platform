import { useCallback, useEffect, useRef, useState } from 'react';
import { canToggleStatus, type AssetPublishStatus, type StoreAssetItem } from '@o4o/store-asset-policy-core';
import { storeAssetControlApi } from '../../../api/assetSnapshot';
import { useStoreOperationScope } from '../../../hooks/useStoreOperationScope';
import { useLatestStoreRequest } from '../hooks/useLatestStoreRequest';

const cycle: AssetPublishStatus[] = ['draft', 'published', 'hidden'];
interface Retry { ids: string[]; status: AssetPublishStatus }

/** Service-local controller; the existing policy gates, panel and transport remain unchanged. */
export function useStorePublishing() {
  const { key, organizationId, isCurrent } = useStoreOperationScope();
  const read = useLatestStoreRequest(key);
  const rows = useRef<StoreAssetItem[]>([]), reading = useRef(true), writing = useRef(false);
  const [items, setItems] = useState<StoreAssetItem[]>([]), [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null), [actionError, setActionError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null), [retry, setRetry] = useState<Retry | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const reload = useCallback(async () => {
    if (writing.current) return;
    if (!organizationId) { setLoading(false); setError('매장을 선택한 뒤 다시 시도해 주세요.'); return; }
    if (!isCurrent()) return;
    const current = read.begin();
    reading.current = true; rows.current = [];
    setLoading(true); setItems([]); setTotal(0); setError(null); setActionError(null); setNotice(null); setRetry(null);
    try {
      const result = await storeAssetControlApi.list({ page: 1, limit: 200 });
      if (!result.success || !result.data || result.data.items.some(item => item.organizationId !== organizationId))
        throw new Error('Unconfirmed publishing list');
      if (!current() || !isCurrent()) return;
      rows.current = result.data.items; setItems(result.data.items); setTotal(result.data.total);
    } catch {
      if (current() && isCurrent()) setError('게시 상태를 불러오지 못했습니다. 다시 시도해 주세요.');
    } finally {
      if (current() && isCurrent()) { reading.current = false; setLoading(false); }
    }
  }, [organizationId, isCurrent, read]);
  useEffect(() => { void reload(); }, [reload]);

  const changeStatus = useCallback(async (ids: string[], status: AssetPublishStatus) => {
    if (!isCurrent() || reading.current || writing.current || !cycle.includes(status)) return;
    const unique = [...new Set(ids)];
    const selected = unique.flatMap(id => {
      const row = rows.current.find(item => item.id === id);
      return row && !row.isForced && canToggleStatus(row) ? [row] : [];
    });
    const blocked = unique.length - selected.length;
    const targets = selected.filter(row => row.publishStatus !== status);
    if (!targets.length) {
      setRetry(null); setNotice(null);
      setActionError(blocked ? '변경할 수 없는 자료가 포함되어 있습니다. 강제노출·정책 제한 자료는 그대로 유지합니다.' : null);
      return;
    }
    writing.current = true; setBusy(true); setUpdatingId(targets.length === 1 ? targets[0].id : null);
    setActionError(null); setNotice(null); setRetry(null);
    try {
      const results = await Promise.allSettled(targets.map(async row => {
        const result = await storeAssetControlApi.updatePublishStatus(row.id, status);
        if (result.success !== true || result.data?.snapshotId !== row.id || result.data.publishStatus !== status)
          throw new Error('Unconfirmed publish change');
        return row.id;
      }));
      if (!isCurrent()) return;
      const succeeded = new Set(results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []));
      const failed = targets.filter(row => !succeeded.has(row.id)).map(row => row.id);
      rows.current = rows.current.map(row => succeeded.has(row.id) ? { ...row, publishStatus: status } : row);
      setItems(rows.current);
      if (failed.length) setRetry({ ids: failed, status });
      if (failed.length || blocked) setActionError(`${succeeded.size}건 변경, ${failed.length}건 실패${blocked ? `, 정책 제한 ${blocked}건 제외` : ''}. 변경되지 않은 자료는 이전 상태를 유지합니다.`);
      else setNotice(`${succeeded.size}건의 게시 설정을 변경했습니다. 기기 적용·재생 여부는 활용 화면에서 확인해 주세요.`);
    } finally {
      writing.current = false;
      if (isCurrent()) { setBusy(false); setUpdatingId(null); }
    }
  }, [isCurrent]);
  const toggle = useCallback(async (id: string) => {
    const row = rows.current.find(item => item.id === id);
    if (!row) return;
    const index = cycle.indexOf(row.publishStatus);
    if (index >= 0) await changeStatus([id], cycle[(index + 1) % cycle.length]);
  }, [changeStatus]);
  const retryFailed = useCallback(async () => {
    if (retry) await changeStatus(retry.ids, retry.status);
  }, [retry, changeStatus]);
  return { items, total, loading, error, busy, updatingId, actionError, notice, retryCount: retry?.ids.length ?? 0,
    reload, toggle, changeStatus, retryFailed };
}
