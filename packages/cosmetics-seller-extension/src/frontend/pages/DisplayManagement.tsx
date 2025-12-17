/**
 * DisplayManagement Page
 *
 * 진열 관리 페이지 - 매장 내 상품 진열 현황 관리
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

interface DisplayItem {
  id: string;
  productId: string;
  productName?: string;
  location: string;
  faceCount: number;
  displayOrder: number;
  isVisible: boolean;
  lastCheckedAt?: string;
}

interface DisplayStats {
  totalDisplays: number;
  averageFaceCount: number;
  visibleCount?: number;
  hiddenCount?: number;
}

interface DisplayManagementProps {
  sellerId: string;
  apiBaseUrl?: string;
}

export const DisplayManagement: React.FC<DisplayManagementProps> = ({
  sellerId,
  apiBaseUrl = '/api/v1/cosmetics-seller',
}) => {
  const [displays, setDisplays] = useState<DisplayItem[]>([]);
  const [stats, setStats] = useState<DisplayStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDisplays();
  }, [sellerId]);

  const fetchDisplays = async () => {
    try {
      setLoading(true);
      const [displayRes, statsRes] = await Promise.all([
        fetch(`${apiBaseUrl}/display/seller/${sellerId}`),
        fetch(`${apiBaseUrl}/display/seller/${sellerId}/stats`),
      ]);

      const displayResult = await displayRes.json();
      const statsResult = await statsRes.json();

      if (displayResult.success) {
        setDisplays(displayResult.data);
      } else {
        setError(displayResult.message);
      }

      if (statsResult.success) {
        setStats(statsResult.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const columns: AGTableColumn<DisplayItem>[] = [
    {
      key: 'location',
      header: '위치',
      width: '15%',
    },
    {
      key: 'productName',
      header: '상품',
      width: '25%',
      render: (value: string | undefined, row: DisplayItem) => value || row.productId,
    },
    {
      key: 'faceCount',
      header: '페이싱',
      width: '10%',
      align: 'center',
    },
    {
      key: 'displayOrder',
      header: '진열순서',
      width: '10%',
      align: 'center',
    },
    {
      key: 'isVisible',
      header: '상태',
      width: '10%',
      align: 'center',
      render: (value: boolean) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? '노출' : '숨김'}
        </Badge>
      ),
    },
    {
      key: 'lastCheckedAt',
      header: '최근 점검',
      width: '15%',
      render: (value: string | undefined) =>
        value ? new Date(value).toLocaleDateString() : '-',
    },
  ];

  // 통계 계산
  const visibleCount = displays.filter(d => d.isVisible).length;
  const hiddenCount = displays.filter(d => !d.isVisible).length;

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
            title="총 진열"
            value={stats?.totalDisplays || displays.length}
            colorMode="info"
            loading={loading}
          />
          <AGKPIBlock
            title="평균 페이싱"
            value={stats?.averageFaceCount?.toFixed(1) || '0'}
            colorMode="neutral"
            loading={loading}
          />
          <AGKPIBlock
            title="노출 중"
            value={visibleCount}
            colorMode="positive"
            loading={loading}
          />
          <AGKPIBlock
            title="숨김"
            value={hiddenCount}
            colorMode={hiddenCount > 0 ? 'negative' : 'neutral'}
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
