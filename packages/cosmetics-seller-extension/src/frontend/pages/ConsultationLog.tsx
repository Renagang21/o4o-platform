/**
 * ConsultationLog Page
 *
 * 상담 로그 페이지 - 고객 상담 내역 관리
 * Design Core v1.0 적용
 */

import React, { useState, useEffect } from 'react';
import {
  AGPageHeader,
  AGSection,
  AGKPIGrid,
  AGKPIBlock,
  AGTable,
  AGTableColumn,
  Badge,
  Button,
} from '@o4o/ui';

interface ConsultationItem {
  id: string;
  workflowSessionId?: string;
  customerId?: string;
  resultStatus: 'pending' | 'completed' | 'no_purchase' | 'cancelled';
  consultationDurationMinutes?: number;
  recommendedProducts: Array<{
    productId: string;
    productName?: string;
    reason?: string;
    wasAccepted?: boolean;
  }>;
  purchasedProducts: Array<{
    productId: string;
    productName?: string;
    quantity: number;
    price: number;
  }>;
  notes?: string;
  createdAt: string;
}

interface ConsultationStats {
  totalConsultations: number;
  completedConsultations: number;
  conversionRate: number;
  averageDuration: number;
  totalRecommendations: number;
  totalPurchases: number;
}

interface ConsultationLogProps {
  sellerId: string;
  apiBaseUrl?: string;
}

export const ConsultationLog: React.FC<ConsultationLogProps> = ({
  sellerId,
  apiBaseUrl = '/api/v1/cosmetics-seller',
}) => {
  const [logs, setLogs] = useState<ConsultationItem[]>([]);
  const [stats, setStats] = useState<ConsultationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [sellerId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logsRes, statsRes] = await Promise.all([
        fetch(`${apiBaseUrl}/consultation/seller/${sellerId}?limit=50`),
        fetch(`${apiBaseUrl}/consultation/seller/${sellerId}/stats`),
      ]);

      const logsData = await logsRes.json();
      const statsData = await statsRes.json();

      if (logsData.success) {
        setLogs(logsData.data);
      }
      if (statsData.success) {
        setStats(statsData.data);
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

  const columns: AGTableColumn<ConsultationItem>[] = [
    {
      key: 'createdAt',
      header: '일시',
      width: '15%',
      render: (value: string) => new Date(value).toLocaleString('ko-KR'),
    },
    {
      key: 'resultStatus',
      header: '상태',
      width: '12%',
      align: 'center',
      render: (value: string) => (
        <Badge variant={getStatusVariant(value)}>
          {getStatusLabel(value)}
        </Badge>
      ),
    },
    {
      key: 'recommendedProducts',
      header: '추천 상품',
      width: '12%',
      align: 'center',
      render: (value: ConsultationItem['recommendedProducts']) => `${value?.length || 0}개`,
    },
    {
      key: 'purchasedProducts',
      header: '구매 상품',
      width: '12%',
      align: 'center',
      render: (value: ConsultationItem['purchasedProducts']) => `${value?.length || 0}개`,
    },
    {
      key: 'consultationDurationMinutes',
      header: '상담 시간',
      width: '12%',
      align: 'center',
      render: (value: number | undefined) => value ? `${value}분` : '-',
    },
    {
      key: 'notes',
      header: '비고',
      width: '25%',
      render: (value: string | undefined) => value || '-',
    },
  ];

  return (
    <div>
      <AGPageHeader
        title="상담 로그"
        description="고객 상담 내역을 확인합니다"
        actions={
          <Button variant="outline" onClick={() => fetchData()}>
            새로고침
          </Button>
        }
      />

      {/* Section 1: 상담 통계 */}
      <AGSection title="상담 성과" spacing="md">
        <AGKPIGrid columns={4}>
          <AGKPIBlock
            title="총 상담"
            value={stats?.totalConsultations || 0}
            colorMode="info"
            loading={loading}
          />
          <AGKPIBlock
            title="구매 전환"
            value={stats?.completedConsultations || 0}
            colorMode="positive"
            loading={loading}
          />
          <AGKPIBlock
            title="전환율"
            value={`${stats?.conversionRate?.toFixed(1) || 0}%`}
            colorMode={stats?.conversionRate && stats.conversionRate >= 50 ? 'positive' : 'negative'}
            loading={loading}
          />
          <AGKPIBlock
            title="평균 상담 시간"
            value={`${stats?.averageDuration?.toFixed(0) || 0}분`}
            colorMode="neutral"
            loading={loading}
          />
        </AGKPIGrid>
      </AGSection>

      {/* Section 2: 상담 목록 */}
      <AGSection title="상담 내역" spacing="md">
        <AGTable<ConsultationItem>
          columns={columns}
          data={logs}
          loading={loading}
          emptyMessage="상담 기록이 없습니다."
        />
      </AGSection>

      {/* Error Display */}
      {error && (
        <AGSection spacing="md">
          <div style={{ color: '#ef4444', padding: '1rem', backgroundColor: '#fef2f2', borderRadius: '0.5rem' }}>
            오류: {error}
          </div>
        </AGSection>
      )}
    </div>
  );
};

export default ConsultationLog;
