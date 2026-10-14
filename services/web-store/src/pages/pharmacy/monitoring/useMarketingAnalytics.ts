import { useCallback, useRef, useState } from 'react';
import { getMarketingAnalytics, type MarketingAnalyticsData } from '../../../api/storeAnalytics';
import { useLatestStoreRequest } from '../hooks/useLatestStoreRequest';
import { useMonitoringOwner } from './useMonitoringScope';

const count = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
export function validateAnalytics(reply: { success: boolean; data: MarketingAnalyticsData }) {
  const d = reply?.data;
  if (!reply?.success || !d || ![d.totalScans, d.todayScans, d.weeklyScans, d.activeQrCount].every(count) ||
    !d.deviceStats || ![d.deviceStats.mobile, d.deviceStats.tablet, d.deviceStats.desktop].every(count) ||
    !Array.isArray(d.topQrCodes) || d.topQrCodes.some(q => !q || typeof q.id !== 'string' || typeof q.title !== 'string' || typeof q.slug !== 'string' || !count(q.scanCount)) ||
    !Array.isArray(d.dailyScans) || d.dailyScans.some(day => !day || typeof day.date !== 'string' || !Number.isFinite(Date.parse(day.date)) || !count(day.count)))
    throw new Error('Invalid marketing analytics');
  return reply;
}

/** Shared view owns rendering; the service adapter owns freshness and recovery. */
export function useMarketingAnalytics(organizationId: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { begin } = useLatestStoreRequest(organizationId);
  const owner = useMonitoringOwner(organizationId);
  const ownerRef = useRef(owner);
  ownerRef.current = owner;
  const fetchAnalytics = useCallback(async () => {
    const current = begin();
    if (!ownerRef.current()) throw new Error('Inactive store');
    setLoading(true);
    setError(null);
    try {
      const reply = validateAnalytics(await getMarketingAnalytics());
      if (!current() || !ownerRef.current()) throw new Error('Inactive request');
      return reply;
    } catch {
      if (current() && ownerRef.current()) setError('홍보 분석을 불러오지 못했습니다. 다시 시도해 주세요.');
      throw new Error('Marketing analytics unavailable');
    } finally {
      if (current() && ownerRef.current()) setLoading(false);
    }
  }, [begin]);
  return { fetchAnalytics, loading, error };
}
