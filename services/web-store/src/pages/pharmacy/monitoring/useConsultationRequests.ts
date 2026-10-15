import { useCallback, useEffect, useRef, useState } from 'react';
import type { BulkResult, BulkResultItem } from '@o4o/ui';
import { fetchStaffInterestRequests, updateInterestAction, type StaffInterestRequest } from '../../../api/tabletStaff';
import { useMonitoringOwner } from './useMonitoringScope';

export type ConsultationAction = 'acknowledge' | 'complete' | 'cancel';
const target = { acknowledge: 'ACKNOWLEDGED', complete: 'COMPLETED', cancel: 'CANCELLED' } as const;
export function validateRequests(value: unknown): StaffInterestRequest[] {
  if (!Array.isArray(value) || value.some(r => !r || typeof r.id !== 'string' || !r.id ||
    typeof r.productName !== 'string' || !['REQUESTED', 'ACKNOWLEDGED'].includes(r.status) ||
    typeof r.createdAt !== 'string' || !Number.isFinite(Date.parse(r.createdAt)) ||
    (r.acknowledgedAt != null && (typeof r.acknowledgedAt !== 'string' || !Number.isFinite(Date.parse(r.acknowledgedAt)))) ||
    (r.customerName != null && typeof r.customerName !== 'string') ||
    (r.customerNote != null && typeof r.customerNote !== 'string')) ||
    new Set(value.map(r => r.id)).size !== value.length) throw new Error('Invalid consultation list');
  return value;
}

export function useConsultationRequests(organizationId: string) {
  const [rows, setRows] = useState<StaffInterestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const rowsRef = useRef(rows);
  const revision = useRef(0);
  const reading = useRef(false);
  const writing = useRef(false);
  const failedAction = useRef<ConsultationAction | null>(null);
  const owner = useMonitoringOwner(organizationId);
  const ownerRef = useRef(owner);
  ownerRef.current = owner;
  const load = useCallback(async (afterMutation = false) => {
    if (reading.current || (writing.current && !afterMutation) || !ownerRef.current()) return;
    const token = ++revision.current;
    reading.current = true;
    try {
      const data = validateRequests(await fetchStaffInterestRequests());
      if (!ownerRef.current() || token !== revision.current) return;
      rowsRef.current = data;
      setRows(data);
      setSelectedKeys(keys => keys.filter(id => data.some(r => r.id === id)));
      setError(null);
    } catch {
      if (ownerRef.current() && token === revision.current)
        setError('상담 요청을 불러오지 못했습니다. 최신 목록을 확인한 뒤 처리해 주세요.');
    } finally {
      // A write may have invalidated this read and started a newer refresh.
      if (token === revision.current) {
        reading.current = false;
        if (ownerRef.current()) setLoading(false);
      }
    }
  }, []);
  const refresh = useCallback(() => load(), [load]);
  const cancelRead = useCallback(() => { revision.current++; reading.current = false; }, []);
  useEffect(() => {
    void refresh();
    const poll = setInterval(() => { void refresh(); }, 5000);
    return () => { clearInterval(poll); cancelRead(); };
  }, [refresh, cancelRead]);

  const run = useCallback(async (ids: string[], action: ConsultationAction, confirmMessage?: string) => {
    if (writing.current || !ownerRef.current() || error || loading || ids.length === 0) return;
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    writing.current = true;
    revision.current++; // Earlier polls can no longer restore a completed request.
    reading.current = false;
    setBusy(true);
    failedAction.current = action;
    const acknowledgedAt = new Map<string, string>();
    const unique = [...new Set(ids)];
    const outcomes: BulkResultItem[] = await Promise.all(unique.map(async id => {
      const row = rowsRef.current.find(r => r.id === id);
      if (!row || (action === 'acknowledge' && row.status !== 'REQUESTED'))
        return { id, status: 'skipped' as const };
      try {
        const reply = await updateInterestAction(id, action);
        if (reply?.id !== id || reply.status !== target[action] || !Number.isFinite(Date.parse(reply.updatedAt)))
          throw new Error('Invalid transition response');
        acknowledgedAt.set(id, reply.updatedAt);
        return { id, status: 'success' as const };
      } catch {
        return { id, status: 'failed' as const, error: '처리 결과를 확인하지 못했습니다. 최신 목록 확인 후 다시 시도해 주세요.' };
      }
    }));
    if (!ownerRef.current()) return;
    const successful = new Set(outcomes.filter(r => r.status === 'success').map(r => r.id));
    rowsRef.current = rowsRef.current.flatMap(row => !successful.has(row.id) ? [row] :
      action === 'acknowledge' ? [{ ...row, status: 'ACKNOWLEDGED' as const, acknowledgedAt: acknowledgedAt.get(row.id) }] : []);
    setRows(rowsRef.current);
    setSelectedKeys(keys => keys.filter(id => !successful.has(id)));
    setResult({ results: outcomes, successCount: successful.size,
      failedCount: outcomes.filter(r => r.status === 'failed').length,
      skippedCount: outcomes.filter(r => r.status === 'skipped').length });
    setShowResult(true);
    // A refresh failure is a read failure, never a reason to resubmit confirmed writes.
    await load(true); // Keep the mutation lock through the canonical refresh.
    writing.current = false;
    if (ownerRef.current()) setBusy(false);
  }, [error, loading, load]);
  const retryFailed = () => {
    if (failedAction.current && result) void run(result.results.filter(r => r.status === 'failed').map(r => r.id), failedAction.current);
  };
  return { rows, loading, error, busy, selectedKeys, setSelectedKeys, refresh, run,
    result, showResult, closeResult: () => setShowResult(false), retryFailed };
}
