/**
 * DisplayManagement Page
 *
 * 진열 관리 페이지 - 매장 내 상품 진열 현황 관리
 * Design Core v1.0 적용
 *
 * Uses cosmetics-sample-display-extension API:
 * - GET /api/v1/cosmetics-sample/display/:storeId
 * - GET /api/v1/cosmetics-sample/display/:storeId/stats
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

interface DisplayItem {
  id: string;
  name: string;
  layoutType: string;
  location?: string;
  position: number;
  assignedProducts: Array<{ productId: string; slotIndex: number; productName?: string }>;
  isActive: boolean;
  performanceScore?: number;
  lastOptimizedAt?: string;
}

interface DisplayStats {
  totalLayouts: number;
  activeLayouts: number;
  totalSlots: number;
  occupiedSlots: number;
  averagePerformance: number;
}

interface DisplayManagementProps {
  sellerId: string;
  storeId?: string;  // Added storeId for store-based API
  apiBaseUrl?: string;
}

export const DisplayManagement: React.FC<DisplayManagementProps> = ({
  sellerId,
  storeId,
  apiBaseUrl = '/api/v1/cosmetics-sample',  // Updated to use new API
}) => {
  const [displays, setDisplays] = useState<DisplayItem[]>([]);
  const [stats, setStats] = useState<DisplayStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use storeId if provided, fallback to sellerId
  const effectiveStoreId = storeId || sellerId;

  useEffect(() => {
    fetchDisplays();
  }, [effectiveStoreId]);

  const fetchDisplays = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use new cosmetics-sample-display-extension API endpoints
      const [displayRes, statsRes] = await Promise.all([
        fetch(`${apiBaseUrl}/display/${effectiveStoreId}`),
        fetch(`${apiBaseUrl}/display/${effectiveStoreId}/stats`),
      ]);

      if (!displayRes.ok) {
        throw new Error(`Failed to fetch displays: ${displayRes.statusText}`);
      }
      if (!statsRes.ok) {
        throw new Error(`Failed to fetch stats: ${statsRes.statusText}`);
      }

      const displayResult = await displayRes.json();
      const statsResult = await statsRes.json();

      // Handle both array response and wrapped response
      setDisplays(Array.isArray(displayResult) ? displayResult : (displayResult.data || []));
      setStats(statsResult.stats || statsResult.data || statsResult);
    } catch (err: unknown) {
      console.error('Display fetch error:', err);
      setError(err instanceof Error ? err.message : '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const columns: AGTableColumn<DisplayItem>[] = [
    {
      key: 'name',
      header: '레이아웃',
      width: '20%',
    },
    {
      key: 'layoutType',
      header: '유형',
      width: '10%',
      render: (value: string) => {
        const types: Record<string, string> = {
          shelf: '선반',
          gondola: '곤돌라',
          endcap: '엔드캡',
          wall: '벽면',
          window: '윈도우',
        };
        return types[value] || value;
      },
    },
    {
      key: 'location',
      header: '위치',
      width: '15%',
      render: (value: string | undefined) => value || '-',
    },
    {
      key: 'assignedProducts',
      header: '배치 상품',
      width: '15%',
      align: 'center',
      render: (value: Array<unknown>) => `${value?.length || 0}개`,
    },
    {
      key: 'performanceScore',
      header: '성과점수',
      width: '10%',
      align: 'center',
      render: (value: number | undefined) => value ? `${value.toFixed(1)}점` : '-',
    },
    {
      key: 'isActive',
      header: '상태',
      width: '10%',
      align: 'center',
      render: (value: boolean) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? '활성' : '비활성'}
        </Badge>
      ),
    },
    {
      key: 'lastOptimizedAt',
      header: '최근 최적화',
      width: '15%',
      render: (value: string | undefined) =>
        value ? new Date(value).toLocaleDateString() : '-',
    },
  ];

  // 통계 계산
  const activeCount = displays.filter(d => d.isActive).length;
  const inactiveCount = displays.filter(d => !d.isActive).length;

  return (
    <div>
      <AGPageHeader
        title="진열 관리"
        description="매장 내 상품 진열 현황을 확인합니다"
        actions={
          <Button variant="outline" onClick={() => fetchDisplays()}>
            새로고침
          </Button>
        }
      />

      {/* Section 1: 진열 KPI */}
      <AGSection title="진열 현황 요약" spacing="md">
        <AGKPIGrid columns={4}>
          <AGKPIBlock
            title="총 레이아웃"
            value={stats?.totalLayouts || displays.length}
            colorMode="info"
            loading={loading}
          />
          <AGKPIBlock
            title="활성 레이아웃"
            value={stats?.activeLayouts || activeCount}
            colorMode="positive"
            loading={loading}
          />
          <AGKPIBlock
            title="슬롯 현황"
            value={stats ? `${stats.occupiedSlots}/${stats.totalSlots}` : `${activeCount}/${displays.length}`}
            colorMode="neutral"
            loading={loading}
          />
          <AGKPIBlock
            title="평균 성과"
            value={stats?.averagePerformance?.toFixed(1) || '-'}
            colorMode={stats?.averagePerformance && stats.averagePerformance >= 70 ? 'positive' : 'neutral'}
            loading={loading}
          />
        </AGKPIGrid>
      </AGSection>

      {/* Section 2: 진열 목록 */}
      <AGSection title="진열 목록" spacing="md">
        <AGTable<DisplayItem>
          columns={columns}
          data={displays}
          loading={loading}
          emptyMessage="등록된 진열 정보가 없습니다."
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

export default DisplayManagement;
