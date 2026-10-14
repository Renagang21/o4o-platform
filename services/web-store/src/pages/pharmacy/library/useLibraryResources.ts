import { useCallback, useEffect, useRef, useState } from 'react';
import { getStoreExecutionAssets, deleteStoreExecutionAsset } from '../../../api/storeExecutionAssets';
import { assetSnapshotApi } from '../../../api/assetSnapshot';
import { libraryToUnified, snapshotToUnified, type SourceKind, type UnifiedResourceRow } from './libraryResources';
import { useLibraryScope } from './useLibraryScope';

const LIMIT = 50;
const kinds: SourceKind[] = ['library', 'snapshot'];
const labels = { library: '직접 등록 자료', snapshot: '가져온 자료' };
type SourceState = { rows: UnifiedResourceRow[]; next: number; more: boolean; error: boolean };
const emptySource = (): SourceState => ({ rows: [], next: 1, more: true, error: false });

export function useLibraryResources() {
  const { organizationId, isCurrent } = useLibraryScope();
  const sources = useRef({ library: emptySource(), snapshot: emptySource() });
  const revision = useRef(0), readBusy = useRef(false), writeBusy = useRef(false);
  const [items, setItems] = useState<UnifiedResourceRow[]>([]);
  const [loading, setLoading] = useState(true), [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]), [hasMore, setHasMore] = useState(false);
  const publish = useCallback(() => {
    setItems(kinds.flatMap(k => sources.current[k].rows).sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    setErrors(kinds.filter(k => sources.current[k].error).map(k => `${labels[k]}를 불러오지 못했습니다.`));
    setHasMore(kinds.some(k => sources.current[k].more && !sources.current[k].error));
  }, []);
  const load = useCallback(async (reset: boolean, failedOnly = false) => {
    if (!organizationId) { setLoading(false); setErrors(['매장을 선택한 뒤 다시 시도해 주세요.']); return; }
    if (!isCurrent() || writeBusy.current || (!reset && readBusy.current)) return;
    const run = ++revision.current;
    readBusy.current = true; setLoading(true);
    if (reset) {
      sources.current = { library: emptySource(), snapshot: emptySource() };
      setItems([]); setErrors([]); setHasMore(false);
    }
    const targets = kinds.filter(k => failedOnly ? sources.current[k].error : sources.current[k].more || sources.current[k].error);
    await Promise.all(targets.map(async kind => {
      const previous = sources.current[kind], page = previous.next;
      try {
        const result = kind === 'library'
          ? await getStoreExecutionAssets({ page, limit: LIMIT })
          : await assetSnapshotApi.list({ type: 'resource', page, limit: LIMIT });
        if (!result.success || !result.data || result.data.items.some(row => row.organizationId !== organizationId))
          throw new Error('Unconfirmed library response');
        if (!isCurrent() || run !== revision.current) return;
        const rows = kind === 'library'
          ? (result.data.items as Parameters<typeof libraryToUnified>[0][]).map(libraryToUnified)
          : (result.data.items as Parameters<typeof snapshotToUnified>[0][]).map(snapshotToUnified);
        const merged = new Map(previous.rows.map(row => [row.id, row]));
        rows.forEach(row => merged.set(row.id, row));
        sources.current[kind] = { rows: [...merged.values()], next: page + 1,
          more: page * result.data.limit < result.data.total, error: false };
      } catch {
        if (isCurrent() && run === revision.current)
          sources.current[kind] = { ...previous, error: true };
      }
    }));
    if (!isCurrent() || run !== revision.current) return;
    publish(); readBusy.current = false; setLoading(false);
  }, [isCurrent, organizationId, publish]);
  const cancel = useCallback(() => { revision.current++; }, []);
  useEffect(() => { void load(true); return cancel; }, [load, cancel]);
  const remove = useCallback(async (rows: UnifiedResourceRow[]) => {
    if (!isCurrent() || readBusy.current || writeBusy.current || rows.length === 0) return null;
    writeBusy.current = true; setDeleting(true);
    try {
      const results = await Promise.allSettled(rows.map(async row => {
        if (row.kind === 'snapshot') {
          const result = await assetSnapshotApi.remove(row.rawId);
          if (!result.success || !result.data?.deleted || result.data.id !== row.rawId) throw new Error('Not removed');
        } else {
          const result = await deleteStoreExecutionAsset(row.rawId);
          if (!result.success) throw new Error('Not removed');
        }
        return row.id;
      }));
      if (!isCurrent()) return null;
      const removed = new Set(results.flatMap(r => r.status === 'fulfilled' ? [r.value] : []));
      for (const kind of kinds) {
        const source = sources.current[kind];
        const affected = source.rows.some(row => removed.has(row.id));
        source.rows = source.rows.filter(row => !removed.has(row.id));
        // Offset pages shift after deletion. Revisit this source before appending unseen rows.
        if (affected && source.more) source.next = 1;
      }
      publish();
      return { removed, failed: rows.length - removed.size };
    } finally {
      writeBusy.current = false;
      if (isCurrent()) setDeleting(false);
    }
  }, [isCurrent, publish]);
  return { items, loading, deleting, errors, hasMore, remove,
    reload: useCallback(() => load(true), [load]), loadMore: useCallback(() => load(false), [load]),
    retryFailed: useCallback(() => load(false, true), [load]) };
}
