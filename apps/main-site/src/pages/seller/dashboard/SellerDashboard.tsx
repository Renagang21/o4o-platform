/**
 * SellerDashboard Page
 *
 * Cosmetics Seller Mode - 판매원 대시보드
 * Design Core v1.0 적용
 *
 * 적용 기준 문서:
 * - WO-01: Seller Dashboard 화면 정의서
 * - WO-02: Design Core KPI 컴포넌트 규칙
 * - WO-03: API As-Is 점검 보고서
 * - WO-04: 비활성화 테스트 시나리오
 */

import React from 'react';
import {
  AGPageHeader,
  AGSection,
  AGKPIGrid,
  AGKPIBlock,
  AGCard,
  AGTable,
  type AGTableColumn,
  Badge,
  Button,
} from '@o4o/ui';

import type { PeriodType, RecentConsultation } from './sellerDashboard.types';
import { PERIOD_OPTIONS } from './sellerDashboard.types';
import {
  useSellerDashboard,
  getConversionRateColorMode,
  getHealthScoreColorMode,
  getLowStockColorMode,
  getUnverifiedDisplayColorMode,
} from './useSellerDashboard';

// ========================================
// Props
// ========================================

interface SellerDashboardProps {
  sellerId: string;
  storeId?: string;
}

// ========================================
// 헬퍼 함수
// ========================================

function getPeriodLabel(period: PeriodType): string {
  const option = PERIOD_OPTIONS.find((o) => o.value === period);
  return option?.label || '오늘';
}

function getStatusLabel(status: string): string {
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
}

function getStatusVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
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
}

// ========================================
// 컴포넌트
// ========================================

export const SellerDashboard: React.FC<SellerDashboardProps> = ({
  sellerId,
  storeId,
}) => {
  const {
    // 기본 데이터
    consultationStats,
    displayStats,
    inventoryStats,
    recentConsultations,

    // 확장 KPI 데이터
    sampleInventoryStats,
    displaySummary,

    // 계산된 값
    computed,

    // 로딩/에러 상태
    loading,
    kpiLoading,
    error,

    // 기간 상태
    period,
    setPeriod,

    // 액션
    refresh,
  } = useSellerDashboard({ sellerId, storeId });

  // 오늘 날짜 표시
  const todayDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  // 테이블 컬럼 정의
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

  return (
    <div>
      {/* 헤더 */}
      <AGPageHeader
        title="판매원 대시보드"
        description={todayDate}
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {/* 기간 필터 (오늘/이번 주/이번 달만 - 확장 금지) */}
            <div style={{ display: 'flex', gap: '0.25rem', marginRight: '0.5rem' }}>
              {PERIOD_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={period === opt.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriod(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <Button variant="outline" onClick={refresh}>
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
            value={consultationStats?.totalConsultations || 0}
            colorMode="info"
            loading={loading}
          />
          <AGKPIBlock
            title="전환율"
            value={`${consultationStats?.conversionRate || 0}%`}
            colorMode={getConversionRateColorMode(
              consultationStats?.conversionRate || 0
            )}
            loading={loading}
          />
          <AGKPIBlock
            title="진열 수"
            value={displayStats?.totalDisplays || 0}
            colorMode="neutral"
            loading={loading}
          />
          <AGKPIBlock
            title="재고 부족"
            value={inventoryStats?.lowStockCount || 0}
            colorMode={getLowStockColorMode(inventoryStats?.lowStockCount || 0)}
            loading={loading}
          />
        </AGKPIGrid>
      </AGSection>

      {/* Section 2: 샘플 성과 */}
      <AGSection title={`샘플 성과 (${getPeriodLabel(period)})`} spacing="md">
        {sampleInventoryStats ? (
          <AGKPIGrid columns={4}>
            <AGKPIBlock
              title="총 재고"
              value={computed.totalQuantity}
              subtitle={`${sampleInventoryStats.totalProducts}종`}
              colorMode="info"
              loading={kpiLoading}
            />
            <AGKPIBlock
              title="샘플 사용"
              value={computed.totalUsage}
              subtitle={`${sampleInventoryStats.totalProducts}개 제품`}
              colorMode="neutral"
              loading={kpiLoading}
            />
            <AGKPIBlock
              title="샘플→구매 전환"
              value={`${computed.sampleConversionRate.toFixed(1)}%`}
              subtitle={`${computed.totalPurchases}건 구매`}
              colorMode="positive"
              loading={kpiLoading}
            />
            <AGKPIBlock
              title="재고 부족"
              value={sampleInventoryStats.lowStock}
              subtitle={`품절: ${sampleInventoryStats.outOfStock}`}
              colorMode={getLowStockColorMode(sampleInventoryStats.lowStock)}
              loading={kpiLoading}
            />
          </AGKPIGrid>
        ) : (
          <AGCard>
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
              {kpiLoading ? '로딩 중...' : '샘플 데이터를 불러올 수 없습니다'}
            </div>
          </AGCard>
        )}
      </AGSection>

      {/* Section 3: 진열 건강도 */}
      <AGSection title="진열 건강도" spacing="md">
        {displaySummary ? (
          <AGKPIGrid columns={4}>
            <AGKPIBlock
              title="건강 점수"
              value={`${computed.healthScore}%`}
              colorMode={getHealthScoreColorMode(computed.healthScore)}
              loading={kpiLoading}
            />
            <AGKPIBlock
              title="총 진열"
              value={displaySummary.totalDisplays}
              subtitle={`활성: ${displaySummary.activeDisplays}`}
              colorMode="info"
              loading={kpiLoading}
            />
            <AGKPIBlock
              title="인증 완료"
              value={displaySummary.verifiedDisplays}
              colorMode="positive"
              loading={kpiLoading}
            />
            <AGKPIBlock
              title="미인증"
              value={computed.unverifiedDisplays}
              colorMode={getUnverifiedDisplayColorMode(computed.unverifiedDisplays)}
              loading={kpiLoading}
            />
          </AGKPIGrid>
        ) : (
          <AGCard>
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
              {kpiLoading ? '로딩 중...' : '진열 데이터를 불러올 수 없습니다'}
            </div>
          </AGCard>
        )}
      </AGSection>

      {/* Section 4: 진열 현황 */}
      <AGSection title="진열 현황" spacing="md">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <AGCard title="총 진열">
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
              {loading ? '...' : displayStats?.totalDisplays || 0}
            </div>
          </AGCard>
          <AGCard title="평균 페이싱">
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
              {loading
                ? '...'
                : displayStats?.totalDisplays
                  ? (
                      displayStats.totalFaceCount / displayStats.totalDisplays
                    ).toFixed(1)
                  : 0}
            </div>
          </AGCard>
          <AGCard title="샘플 부족">
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: (sampleInventoryStats?.lowStock || 0) > 0 ? '#ef4444' : 'inherit',
              }}
            >
              {loading ? '...' : sampleInventoryStats?.lowStock || 0}
            </div>
          </AGCard>
        </div>
      </AGSection>

      {/* Section 5: 최근 상담 */}
      <AGSection title="최근 상담" spacing="md">
        <AGTable<RecentConsultation>
          columns={consultationColumns}
          data={recentConsultations}
          loading={loading}
          emptyMessage="최근 상담 기록이 없습니다."
        />
      </AGSection>

      {/* 에러 표시 (있을 경우에만) */}
      {error && (
        <AGSection spacing="md">
          <AGCard>
            <div style={{ color: '#ef4444', padding: '1rem' }}>오류: {error}</div>
          </AGCard>
        </AGSection>
      )}
    </div>
  );
};

export default SellerDashboard;
