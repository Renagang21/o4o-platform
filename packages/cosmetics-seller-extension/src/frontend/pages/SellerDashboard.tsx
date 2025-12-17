/**
 * SellerDashboard Page
 *
 * 판매원 대시보드 - 전체 현황 요약 페이지
 * Design Core v1.0 적용
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

interface RecentConsultation {
  id: string;
  createdAt: string;
  resultStatus: string;
  recommendedProducts: unknown[];
  purchasedProducts: unknown[];
}

interface SellerDashboardProps {
  sellerId: string;
  apiBaseUrl?: string;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({
  sellerId,
  apiBaseUrl = '/api/v1/cosmetics-seller',
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentConsultations, setRecentConsultations] = useState<RecentConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [sellerId]);

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
          <Button variant="outline" onClick={() => fetchDashboardData()}>
            새로고침
          </Button>
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

      {/* Section 2: 진열 현황 요약 */}
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
