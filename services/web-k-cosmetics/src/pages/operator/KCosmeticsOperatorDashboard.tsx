/**
 * KCosmeticsOperatorDashboard — 5-Block Unified Operator Dashboard
 *
 * WO-O4O-OPERATOR-DASHBOARD-DATA-NORMALIZATION-V1:
 *   Normalized to Neture pass-through pattern.
 *   Single API call to /cosmetics/operator/dashboard returns 5-block data directly.
 */

import { useState, useEffect, useCallback } from 'react';
import { OperatorDashboardLayout, type OperatorDashboardConfig } from '@o4o/operator-ux-core';
import { AxisNavigationSection, type OperatorAxisGroup } from '@o4o/operator-core-ui';
import { operatorApi } from '@/services/operatorApi';
import { buildKCosmeticsOperatorConfig } from './operatorConfig';

// WO-O4O-OPERATOR-DASHBOARD-AXIS-NAVIGATION-COMMONIZATION-V1
const KCOS_AXES: OperatorAxisGroup[] = [
  {
    key: 'store-hub',
    title: '매장 HUB 운영',
    description: '매장 · 상품 · 주문 · 이벤트',
    icon: '🏪',
    tone: 'emerald',
    links: [
      { key: 'stores', label: '매장 관리', href: '/operator/stores' },
      { key: 'products', label: '상품 관리', href: '/operator/products' },
      { key: 'orders', label: '주문 관리', href: '/operator/orders' },
      { key: 'event-offers', label: '이벤트 오퍼', href: '/operator/event-offers' },
    ],
  },
  {
    key: 'content',
    title: '콘텐츠 운영',
    description: '콘텐츠 · LMS · 자료실 · 사이니지',
    icon: '📋',
    tone: 'blue',
    links: [
      { key: 'content-management', label: '콘텐츠 관리', href: '/operator/content-management' },
      { key: 'lms', label: '강의 관리', href: '/operator/lms' },
      { key: 'resources', label: '자료실', href: '/operator/resources' },
      { key: 'signage', label: '사이니지', href: '/operator/signage/hq-media' },
    ],
  },
];

export default function KCosmeticsOperatorDashboard() {
  const [config, setConfig] = useState<OperatorDashboardConfig | null>(null);
  // WO-O4O-STORE-DASHBOARD-ORDER-METRICS-SAFE-FALLBACK-V1
  const [orderMetricsReady, setOrderMetricsReady] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await operatorApi.getDashboardSummary();
      if (result.config) {
        setConfig(buildKCosmeticsOperatorConfig(result.config));
        setOrderMetricsReady(result.orderMetricsReady);
      } else {
        setError('데이터를 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('Failed to fetch operator dashboard:', err);
      setError('데이터를 불러오지 못했습니다.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 mb-4">{error || '데이터를 불러올 수 없습니다.'}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* WO-O4O-OPERATOR-DASHBOARD-AXIS-NAVIGATION-COMMONIZATION-V1: 2축 운영 네비게이션 */}
      <AxisNavigationSection axes={KCOS_AXES} />

      {/* WO-O4O-STORE-DASHBOARD-ORDER-METRICS-SAFE-FALLBACK-V1:
          주문/매출 지표 미준비 (백엔드 meta.featureStatus='not_ready') 상태 안내.
          KPI 카드의 '진행 주문 0' / '월간 매출 0' 거짓 신호 대신 명시. */}
      {!orderMetricsReady && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-amber-600 text-lg leading-none mt-0.5">⚠</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 m-0 mb-1">
                주문/매출 지표를 준비 중입니다.
              </p>
              <p className="text-[13px] text-amber-700 m-0">
                현재 이 지표는 준비 중입니다. 다른 운영자 기능은 계속 이용할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      )}

      <OperatorDashboardLayout config={config} />
    </div>
  );
}
