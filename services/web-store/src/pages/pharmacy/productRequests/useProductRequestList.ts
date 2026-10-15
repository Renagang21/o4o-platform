import { useCallback, useEffect, useState } from 'react';
import { listProductRequests, type StoreProductRequest, type StoreProductRequestsResult } from '../../../api/storeProductRequests';
import { useLatestStoreRequest } from '../hooks/useLatestStoreRequest';
import { useRequestSession } from './requestSession';

export const REQUEST_PAGE_LIMIT = 20;
export function validateRequestList(reply: StoreProductRequestsResult, page: number) {
  if (!reply || !Array.isArray(reply.items) || !reply.meta || reply.meta.page !== page ||
    reply.meta.limit !== REQUEST_PAGE_LIMIT || !Number.isSafeInteger(reply.meta.total) || reply.meta.total < 0 ||
    reply.items.length > REQUEST_PAGE_LIMIT || reply.items.length > reply.meta.total ||
    reply.items.some(r => !r || typeof r.id !== 'string' || !r.id || typeof r.displayStatusLabel !== 'string' ||
      !['reviewing', 'revision_requested', 'registered', 'rejected'].includes(r.displayStatus) ||
      typeof r.editable !== 'boolean' || (r.editable && r.displayStatus !== 'revision_requested') ||
      typeof r.createdAt !== 'string' || !Number.isFinite(Date.parse(r.createdAt)) ||
      [r.productName, r.manufacturer, r.barcode, r.reviewNote].some(v => v != null && typeof v !== 'string') ||
      (r.classification != null && typeof r.classification.label !== 'string')) ||
    new Set(reply.items.map(r => r.id)).size !== reply.items.length) throw new Error('Invalid product request list');
  return reply;
}

export function useProductRequestList(organizationId: string, refreshKey?: number) {
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const subject = `${page}:${retry}:${refreshKey ?? ''}`;
  const [settled, setSettled] = useState<string | null>(null);
  const [items, setItems] = useState<StoreProductRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const current = useRequestSession(organizationId);
  const { begin, cancel } = useLatestStoreRequest(String(page));
  useEffect(() => {
    const active = begin();
    setLoading(true); setError(null); setItems([]); setTotal(0);
    void (async () => {
      try {
        const reply = validateRequestList(await listProductRequests({ page, limit: REQUEST_PAGE_LIMIT }), page);
        if (!active() || !current()) return;
        const lastPage = Math.max(1, Math.ceil(reply.meta.total / REQUEST_PAGE_LIMIT));
        if (page > lastPage) { cancel(); setPage(lastPage); return; }
        setItems(reply.items); setTotal(reply.meta.total);
      } catch {
        if (active() && current()) setError('요청 현황을 불러오지 못했습니다. 다시 시도해 주세요.');
      } finally { if (active() && current()) { setLoading(false); setSettled(subject); } }
    })();
    return cancel;
  }, [page, retry, refreshKey, begin, cancel, current, subject]);
  const refresh = useCallback(() => { cancel(); setRetry(value => value + 1); }, [cancel]);
  const waiting = loading || settled !== subject;
  return { page, setPage, items: waiting ? [] : items, total: waiting ? 0 : total, loading: waiting, error: waiting ? null : error, refresh,
    totalPages: Math.max(1, Math.ceil(total / REQUEST_PAGE_LIMIT)) };
}
