import { getMarketingAnalytics, type MarketingAnalyticsData } from '../../../api/storeAnalytics';
import { getStoreExecutionAssets } from '../../../api/storeExecutionAssets';
import { getListings } from '../../../api/pharmacyProducts';
import { apiClient } from '../../../api/client';
import type { LiveSignals } from '../../../api/storeHub';

const signalLabels = { newOrders: '주문 현황', pendingTabletRequests: '상담 요청' } as const;
type SignalKey = keyof typeof signalLabels;
type HomeSignals = Record<SignalKey, number | null>;
type SignalResponse = LiveSignals & { availability?: Partial<Record<SignalKey, string>> };

function readSignals(data: SignalResponse) {
  const signals: HomeSignals = { newOrders: null, pendingTabletRequests: null };
  const unavailable: string[] = [];
  for (const key of Object.keys(signalLabels) as SignalKey[]) {
    if (data.availability?.[key] === 'available' && Number.isSafeInteger(data[key]) && data[key] >= 0) signals[key] = data[key];
    else unavailable.push(signalLabels[key]);
  }
  return { signals, unavailable };
}

export interface HomeOverview {
  analytics: MarketingAnalyticsData | null;
  libraryCount: number | null;
  productCount: number | null;
  signals: HomeSignals | null;
  unavailable: string[];
}
export const emptyOverview: HomeOverview = { analytics: null, libraryCount: null, productCount: null, signals: null, unavailable: [] };
function confirmed<T>(result: { success: boolean; data: T }): T {
  if (result.success !== true || result.data == null) throw new Error('Unconfirmed overview');
  return result.data;
}
const count = (value: number) => Number.isFinite(value) && value >= 0;

/** Independent sources remain independent: missing data is never a zero or a no-store verdict. */
export async function loadHomeOverview(organizationId: string): Promise<HomeOverview> {
  const results = await Promise.allSettled([
    getMarketingAnalytics().then(result => {
      const data = confirmed(result);
      if (!count(data.activeQrCount) || !count(data.weeklyScans) || !Array.isArray(data.topQrCodes)) throw new Error('Invalid analytics');
      return data;
    }),
    getStoreExecutionAssets({ page: 1, limit: 1 }).then(result => {
      const data = confirmed(result);
      if (!count(data.total) || data.items.some(item => item.organizationId !== organizationId)) throw new Error('Invalid assets');
      return data.total;
    }),
    getListings().then(result => {
      const data = confirmed(result);
      if (!Array.isArray(data)) throw new Error('Invalid products');
      return data.filter(item => item.is_active).length;
    }),
    // Keep the envelope: the shared live-signals convenience wrapper substitutes zeros for null data.
    apiClient.get<{ success: boolean; data: SignalResponse }>('/store-hub/live-signals').then(result => readSignals(confirmed(result))),
  ] as const);
  const labels = ['홍보 성과', '보관 자료', '진열 상품', '처리할 업무'];
  return {
    analytics: results[0].status === 'fulfilled' ? results[0].value : null,
    libraryCount: results[1].status === 'fulfilled' ? results[1].value : null,
    productCount: results[2].status === 'fulfilled' ? results[2].value : null,
    signals: results[3].status === 'fulfilled' ? results[3].value.signals : null,
    unavailable: [
      ...results.flatMap((result, index) => result.status === 'rejected' ? [labels[index]] : []),
      ...(results[3].status === 'fulfilled' ? results[3].value.unavailable : []),
    ],
  };
}
