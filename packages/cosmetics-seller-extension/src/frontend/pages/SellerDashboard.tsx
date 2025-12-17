/**
 * SellerDashboard Page
 *
 * 판매원 대시보드 - 전체 현황 요약 페이지
 * Design Core v1.0 적용
 *
 * WO-COSMETICS-KPI-VISUALIZATION-ENHANCEMENT:
 * - Sample KPI 블록 추가 (재고, 사용, 전환)
 * - Display KPI 블록 추가 (진열 건강도)
 * - 기간 필터 추가 (일/주/월)
 */

import React, { useState, useEffect } from 'react';
import {
  AGPageHeader,
  AGSection,
  AGKPIGrid,
  AGKPIBlock,
  AGCard,
  AGTable,
  AGTableColumn,
  Badge,
  Button,
} from '@o4o/ui';

type PeriodType = 'daily' | 'weekly' | 'monthly';

interface DashboardStats {
  display: {
    totalDisplays: number;
    averageFaceCount: number;
  };
  sample: {
    totalSamples: number;
    lowStockCount: number;
  };
  inventory: {
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  consultation: {
    totalConsultations: number;
    conversionRate: number;
  };
  kpi: {
    todayConsultations: number;
    todaySales: number;
  };
}

// WO-COSMETICS-KPI-VISUALIZATION-ENHANCEMENT: Sample KPI 타입 추가
interface SampleInventoryStats {
  totalItems: number;
  totalQuantity: number;
  lowStockCount: number;
  outOfStockCount: number;
}

interface SampleUsageStats {
  totalUsage: number;
  uniqueProducts: number;
  purchaseCount: number;
  conversionRate: number;
}

interface SampleAnalyticsOverall {
  totalSamples: number;
  totalUsage: number;
  totalOrders: number;
  conversionRate: number;
}

interface DisplaySummary {
  totalDisplays: number;
  activeDisplays: number;
  verifiedDisplays: number;
  unverifiedDisplays: number;
  healthScore: number;
}

interface RecentConsultation {
  id: string;
  createdAt: string;
  resultStatus: string;
  recommendedProducts: unknown[];
  purchasedProducts: unknown[];
}

interface SellerDashboardProps {
  sellerId: string;
  storeId?: string; // WO-COSMETICS-KPI-VISUALIZATION-ENHANCEMENT: storeId 추가
  apiBaseUrl?: string;
  sampleApiBaseUrl?: string; // WO-COSMETICS-KPI-VISUALIZATION-ENHANCEMENT: sample API base URL
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({
  sellerId,
  storeId,
  apiBaseUrl = '/api/v1/cosmetics-seller',
  sampleApiBaseUrl = '/api/v1/cosmetics-sample',
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentConsultations, setRecentConsultations] = useState<RecentConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // WO-COSMETICS-KPI-VISUALIZATION-ENHANCEMENT: 기간 필터 및 확장 KPI 상태 추가
  const [period, setPeriod] = useState<PeriodType>('daily');
  const [sampleInventoryStats, setSampleInventoryStats] = useState<SampleInventoryStats | null>(null);
  const [sampleUsageStats, setSampleUsageStats] = useState<SampleUsageStats | null>(null);
  const [sampleAnalytics, setSampleAnalytics] = useState<SampleAnalyticsOverall | null>(null);
  const [displaySummary, setDisplaySummary] = useState<DisplaySummary | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);

  // 실제 storeId 결정 (prop으로 전달되지 않으면 sellerId 사용)
  const effectiveStoreId = storeId || sellerId;

  useEffect(() => {
    fetchDashboardData();
  }, [sellerId]);

  // WO-COSMETICS-KPI-VISUALIZATION-ENHANCEMENT: 기간 변경 시 KPI 다시 조회
  useEffect(() => {
    fetchExtendedKPIData();
  }, [effectiveStoreId, period]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [displayRes, sampleRes, inventoryRes, consultationRes, consultationListRes] = await Promise.all([
        fetch(`${apiBaseUrl}/display/seller/${sellerId}/stats`),
        fetch(`${apiBaseUrl}/sample/seller/${sellerId}/stats`),
        fetch(`${apiBaseUrl}/inventory/seller/${sellerId}/stats`),
        fetch(`${apiBaseUrl}/consultation/seller/${sellerId}/stats`),
        fetch(`${apiBaseUrl}/consultation/seller/${sellerId}?limit=5`),
      ]);

      const displayData = await displayRes.json();
      const sampleData = await sampleRes.json();
      const inventoryData = await inventoryRes.json();
      const consultationData = await consultationRes.json();
      const consultationListData = await consultationListRes.json();

      setStats({
        display: displayData.success
          ? displayData.data
          : { totalDisplays: 0, averageFaceCount: 0 },
        sample: sampleData.success
          ? sampleData.data
          : { totalSamples: 0, lowStockCount: 0 },
        inventory: inventoryData.success
          ? inventoryData.data
          : { totalProducts: 0, lowStockCount: 0, outOfStockCount: 0 },
        consultation: consultationData.success
          ? consultationData.data
          : { totalConsultations: 0, conversionRate: 0 },
        kpi: { todayConsultations: 0, todaySales: 0 },
      });

      if (consultationListData.success) {
        setRecentConsultations(consultationListData.data.slice(0, 5));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // WO-COSMETICS-KPI-VISUALIZATION-ENHANCEMENT: 확장 KPI 데이터 조회 함수
  const fetchExtendedKPIData = async () => {
    if (!effectiveStoreId) return;

    try {
      setKpiLoading(true);

      // 기간에 따른 days 파라미터 결정
      const daysParam = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;

      const [inventoryRes, usageRes, analyticsRes, displayRes] = await Promise.all([
        // Sample Inventory Stats
        fetch(`${sampleApiBaseUrl}/inventory/${effectiveStoreId}/stats`),
        // Sample Usage (기간별)
        fetch(`${sampleApiBaseUrl}/usage/${effectiveStoreId}/daily?days=${daysParam}`),
        // Sample Analytics Overall
        fetch(`${sampleApiBaseUrl}/analytics/overall`),
        // Display Summary
        fetch(`${sampleApiBaseUrl}/display/${effectiveStoreId}/summary`),
      ]);

      // Sample Inventory Stats 파싱
      if (inventoryRes.ok) {
        const inventoryData = await inventoryRes.json();
        setSampleInventoryStats(inventoryData);
      }

      // Sample Usage Stats 파싱 (집계)
      if (usageRes.ok) {
        const usageData = await usageRes.json();
        // 일별 데이터를 집계하여 통계로 변환
        if (Array.isArray(usageData)) {
          const totalUsage = usageData.reduce((sum: number, d: { usageCount?: number }) => sum + (d.usageCount || 0), 0);
          const purchaseCount = usageData.reduce((sum: number, d: { purchaseCount?: number }) => sum + (d.purchaseCount || 0), 0);
          const uniqueProducts = new Set(usageData.map((d: { productId?: string }) => d.productId)).size;
          setSampleUsageStats({
            totalUsage,
            uniqueProducts,
            purchaseCount,
            conversionRate: totalUsage > 0 ? (purchaseCount / totalUsage) * 100 : 0,
          });
        }
      }

      // Sample Analytics Overall 파싱
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setSampleAnalytics(analyticsData);
      }

      // Display Summary 파싱
      if (displayRes.ok) {
        const displayData = await displayRes.json();
        setDisplaySummary({
          totalDisplays: displayData.totalDisplays || 0,
          activeDisplays: displayData.activeDisplays || 0,
          verifiedDisplays: displayData.verifiedDisplays || 0,
          unverifiedDisplays: displayData.unverifiedDisplays || 0,
          healthScore: displayData.healthScore || (displayData.verifiedDisplays && displayData.totalDisplays
            ? Math.round((displayData.verifiedDisplays / displayData.totalDisplays) * 100)
            : 0),
        });
      }
    } catch (err: unknown) {
      console.error('Extended KPI fetch error:', err);
      // 확장 KPI 오류는 주요 기능을 차단하지 않음
    } finally {
      setKpiLoading(false);
    }
  };

  // 기간 필터 레이블
  const getPeriodLabel = (p: PeriodType) => {
    switch (p) {
      case 'daily':
        return '오늘';
      case 'weekly':
        return '이번 주';
      case 'monthly':
        return '이번 달';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return '구매 완료';
      case 'no_purchase':
        return '미구매';
      case 'cancelled':
        return '취소';
      default:
        return '진행 중';
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'no_purchase':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const consultationColumns: AGTableColumn<RecentConsultation>[] = [
    {
      key: 'createdAt',
      header: '일시',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'resultStatus',
      header: '상태',
      render: (value: string) => (
        <Badge variant={getStatusVariant(value)}>{getStatusLabel(value)}</Badge>
      ),
    },
    {
      key: 'recommendedProducts',
      header: '추천',
      render: (value: unknown[]) => `${value?.length || 0}개`,
    },
    {
      key: 'purchasedProducts',
      header: '구매',
      render: (value: unknown[]) => `${value?.length || 0}개`,
    },
  ];

  const todayDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <div>
      <AGPageHeader
        title="판매원 대시보드"
        description={todayDate}
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {/* WO-COSMETICS-KPI-VISUALIZATION-ENHANCEMENT: 기간 필터 버튼 */}
            <div style={{ display: 'flex', gap: '0.25rem', marginRight: '0.5rem' }}>
              {(['daily', 'weekly', 'monthly'] as PeriodType[]).map((p) => (
                <Button
                  key={p}
                  variant={period === p ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriod(p)}
                >
                  {getPeriodLabel(p)}
                </Button>
              ))}
            </div>
            <Button variant="outline" onClick={() => { fetchDashboardData(); fetchExtendedKPIData(); }}>
              새로고침
            </Button>
          </div>
        }
      />

      {/* Section 1: 주요 KPI */}
      <AGSection title="주요 KPI" spacing="md">
        <AGKPIGrid columns={4}>
          <AGKPIBlock
            title="총 상담"
            value={stats?.consultation.totalConsultations || 0}
            colorMode="info"
            loading={loading}
          />
          <AGKPIBlock
            title="전환율"
            value={`${stats?.consultation.conversionRate || 0}%`}
            colorMode="positive"
            loading={loading}
          />
          <AGKPIBlock
            title="진열 수"
            value={stats?.display.totalDisplays || 0}
            colorMode="neutral"
            loading={loading}
          />
          <AGKPIBlock
            title="재고 부족"
            value={stats?.inventory.lowStockCount || 0}
            colorMode={stats?.inventory.lowStockCount ? 'negative' : 'neutral'}
            loading={loading}
          />
        </AGKPIGrid>
      </AGSection>

      {/* WO-COSMETICS-KPI-VISUALIZATION-ENHANCEMENT: Sample KPI 섹션 */}
      <AGSection title={`샘플 성과 (${getPeriodLabel(period)})`} spacing="md">
        <AGKPIGrid columns={4}>
          <AGKPIBlock
            title="총 재고"
            value={sampleInventoryStats?.totalQuantity || 0}
            subtitle={`${sampleInventoryStats?.totalItems || 0}종`}
            colorMode="info"
            loading={kpiLoading}
          />
          <AGKPIBlock
            title="샘플 사용"
            value={sampleUsageStats?.totalUsage || 0}
            subtitle={`${sampleUsageStats?.uniqueProducts || 0}개 제품`}
            colorMode="neutral"
            loading={kpiLoading}
          />
          <AGKPIBlock
            title="샘플→구매 전환"
            value={`${(sampleUsageStats?.conversionRate || sampleAnalytics?.conversionRate || 0).toFixed(1)}%`}
            subtitle={`${sampleUsageStats?.purchaseCount || sampleAnalytics?.totalOrders || 0}건 구매`}
            colorMode="positive"
            loading={kpiLoading}
          />
          <AGKPIBlock
            title="재고 부족"
            value={sampleInventoryStats?.lowStockCount || 0}
            subtitle={`품절: ${sampleInventoryStats?.outOfStockCount || 0}`}
            colorMode={sampleInventoryStats?.lowStockCount ? 'negative' : 'neutral'}
            loading={kpiLoading}
          />
        </AGKPIGrid>
      </AGSection>

      {/* WO-COSMETICS-KPI-VISUALIZATION-ENHANCEMENT: 진열 건강도 섹션 */}
      <AGSection title="진열 건강도" spacing="md">
        <AGKPIGrid columns={4}>
          <AGKPIBlock
            title="건강 점수"
            value={`${displaySummary?.healthScore || 0}%`}
            colorMode={
              (displaySummary?.healthScore || 0) >= 80
                ? 'positive'
                : (displaySummary?.healthScore || 0) >= 50
                  ? 'neutral'
                  : 'negative'
            }
            loading={kpiLoading}
          />
          <AGKPIBlock
            title="총 진열"
            value={displaySummary?.totalDisplays || 0}
            subtitle={`활성: ${displaySummary?.activeDisplays || 0}`}
            colorMode="info"
            loading={kpiLoading}
          />
          <AGKPIBlock
            title="인증 완료"
            value={displaySummary?.verifiedDisplays || 0}
            colorMode="positive"
            loading={kpiLoading}
          />
          <AGKPIBlock
            title="미인증"
            value={displaySummary?.unverifiedDisplays || 0}
            colorMode={displaySummary?.unverifiedDisplays ? 'negative' : 'neutral'}
            loading={kpiLoading}
          />
        </AGKPIGrid>
      </AGSection>

      {/* Section 2: 진열 현황 요약 (기존) */}
      <AGSection title="진열 현황" spacing="md">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <AGCard title="총 진열">
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
              {loading ? '...' : stats?.display.totalDisplays || 0}
            </div>
          </AGCard>
          <AGCard title="평균 페이싱">
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
              {loading ? '...' : stats?.display.averageFaceCount?.toFixed(1) || 0}
            </div>
          </AGCard>
          <AGCard title="샘플 부족">
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: stats?.sample.lowStockCount ? '#ef4444' : 'inherit' }}>
              {loading ? '...' : stats?.sample.lowStockCount || 0}
            </div>
          </AGCard>
        </div>
      </AGSection>

      {/* Section 3: 최근 상담 요약 */}
      <AGSection title="최근 상담" spacing="md">
        <AGTable<RecentConsultation>
          columns={consultationColumns}
          data={recentConsultations}
          loading={loading}
          emptyMessage="최근 상담 기록이 없습니다."
        />
      </AGSection>

      {/* Error Display */}
      {error && (
        <AGSection spacing="md">
          <AGCard>
            <div style={{ color: '#ef4444', padding: '1rem' }}>
              오류: {error}
            </div>
          </AGCard>
        </AGSection>
      )}
    </div>
  );
};

export default SellerDashboard;
