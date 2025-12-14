/**
 * Sample Dashboard
 *
 * 샘플 & 진열 대시보드
 * - 샘플 재고 요약
 * - 최근 샘플 사용 로그
 * - 전환 KPI 카드
 *
 * Phase 7-G: Cosmetics Sample & Display UI Redesign (AG Design System)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  AGPageHeader,
  AGSection,
  AGKPIBlock,
  AGKPIGrid,
  AGCard,
  AGButton,
  AGTable,
  AGTag,
} from '@o4o/ui';
import type { AGTableColumn } from '@o4o/ui';
import {
  Beaker,
  Package,
  TrendingUp,
  Layout,
  RefreshCw,
  ArrowRight,
  AlertTriangle,
  ShoppingCart,
  Clock,
  BarChart2,
} from 'lucide-react';

interface DashboardSummary {
  inventory: {
    totalProducts: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
  };
  usage: {
    todayUsage: number;
    weekUsage: number;
    todayPurchases: number;
    weekPurchases: number;
  };
  conversion: {
    rate: number;
    previousRate: number;
    change: number;
  };
  display: {
    totalDisplays: number;
    verified: number;
    needsRefill: number;
  };
  recentUsage: Array<{
    id: string;
    productName: string;
    usedAt: string;
    resultedInPurchase: boolean;
  }>;
}

const SampleDashboard: React.FC = () => {
  const api = authClient.api;
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      // Demo data - replace with actual API calls
      setSummary({
        inventory: {
          totalProducts: 45,
          inStock: 32,
          lowStock: 8,
          outOfStock: 5,
        },
        usage: {
          todayUsage: 28,
          weekUsage: 186,
          todayPurchases: 8,
          weekPurchases: 52,
        },
        conversion: {
          rate: 28.0,
          previousRate: 25.5,
          change: 2.5,
        },
        display: {
          totalDisplays: 38,
          verified: 30,
          needsRefill: 4,
        },
        recentUsage: [
          { id: '1', productName: '하이드로 부스팅 세럼', usedAt: '2024-12-12T14:30:00Z', resultedInPurchase: true },
          { id: '2', productName: '비타민C 앰플', usedAt: '2024-12-12T13:45:00Z', resultedInPurchase: false },
          { id: '3', productName: '수분크림', usedAt: '2024-12-12T12:20:00Z', resultedInPurchase: true },
          { id: '4', productName: '선스크린 SPF50+', usedAt: '2024-12-12T11:15:00Z', resultedInPurchase: false },
          { id: '5', productName: '클렌징 폼', usedAt: '2024-12-12T10:00:00Z', resultedInPurchase: true },
        ],
      });
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    return date.toLocaleDateString('ko-KR');
  };

  // Recent usage table columns
  const usageColumns: AGTableColumn<DashboardSummary['recentUsage'][0]>[] = [
    {
      key: 'productName',
      header: '제품명',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            row.resultedInPurchase ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            {row.resultedInPurchase ? (
              <ShoppingCart className="w-4 h-4 text-green-600" />
            ) : (
              <Beaker className="w-4 h-4 text-gray-500" />
            )}
          </div>
          <span className="font-medium">{value}</span>
        </div>
      ),
    },
    {
      key: 'usedAt',
      header: '사용 시간',
      render: (value) => (
        <span className="text-gray-500 flex items-center gap-1 text-sm">
          <Clock className="w-3 h-3" />
          {formatTimeAgo(value)}
        </span>
      ),
    },
    {
      key: 'resultedInPurchase',
      header: '결과',
      align: 'center',
      render: (value) => value ? (
        <AGTag color="green" size="sm">구매</AGTag>
      ) : (
        <AGTag color="gray" size="sm">미구매</AGTag>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <AGKPIGrid columns={4}>
          {[1, 2, 3, 4].map((i) => (
            <AGKPIBlock key={i} title="로딩 중..." value="-" loading />
          ))}
        </AGKPIGrid>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <AGPageHeader
        title="Sample Dashboard"
        description="샘플 재고, 사용, 진열 현황"
        icon={<Beaker className="w-5 h-5" />}
        actions={
          <AGButton
            variant="ghost"
            size="sm"
            onClick={fetchSummary}
            iconLeft={<RefreshCw className="w-4 h-4" />}
          >
            새로고침
          </AGButton>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Alert Banner */}
        {(summary?.inventory.lowStock || summary?.inventory.outOfStock) ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-yellow-800">재고 보충 필요</p>
              <p className="text-yellow-700 text-sm mt-1">
                {summary?.inventory.lowStock}개 제품 재고 부족, {summary?.inventory.outOfStock}개 제품 품절
              </p>
            </div>
            <Link to="/cosmetics-sample/tracking">
              <AGButton variant="primary" size="sm">
                확인하기
              </AGButton>
            </Link>
          </div>
        ) : null}

        {/* KPI Grid */}
        <AGSection>
          <AGKPIGrid columns={4}>
            <AGKPIBlock
              title="샘플 재고"
              value={summary?.inventory.totalProducts || 0}
              subtitle={`정상: ${summary?.inventory.inStock} | 부족: ${summary?.inventory.lowStock}`}
              colorMode="info"
              icon={<Package className="w-5 h-5 text-blue-500" />}
            />
            <AGKPIBlock
              title="오늘 사용"
              value={summary?.usage.todayUsage || 0}
              subtitle={`주간: ${summary?.usage.weekUsage}개`}
              colorMode="neutral"
              icon={<Beaker className="w-5 h-5 text-purple-500" />}
            />
            <AGKPIBlock
              title="전환율"
              value={`${summary?.conversion.rate || 0}%`}
              delta={summary?.conversion.change}
              deltaLabel="vs 이전"
              colorMode={summary?.conversion.change && summary.conversion.change >= 0 ? 'positive' : 'negative'}
              trend={summary?.conversion.change && summary.conversion.change >= 0 ? 'up' : 'down'}
              icon={<TrendingUp className="w-5 h-5 text-green-500" />}
            />
            <AGKPIBlock
              title="진열 현황"
              value={`${summary?.display.verified || 0}/${summary?.display.totalDisplays || 0}`}
              subtitle={`인증됨 | 보충필요: ${summary?.display.needsRefill}`}
              colorMode="neutral"
              icon={<Layout className="w-5 h-5 text-orange-500" />}
            />
          </AGKPIGrid>
        </AGSection>

        {/* Quick Actions & Recent Usage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <AGSection title="빠른 실행">
            <div className="space-y-3">
              <Link to="/cosmetics-sample/tracking" className="block">
                <AGCard hoverable padding="md">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Package className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">샘플 입고/사용</h3>
                      <p className="text-sm text-gray-500">재고 입출고 관리</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </AGCard>
              </Link>

              <Link to="/cosmetics-sample/display" className="block">
                <AGCard hoverable padding="md">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                      <Layout className="w-6 h-6 text-orange-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">진열 관리</h3>
                      <p className="text-sm text-gray-500">진열 레이아웃 설정</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </AGCard>
              </Link>

              <Link to="/cosmetics-sample/analytics" className="block">
                <AGCard hoverable padding="md">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                      <BarChart2 className="w-6 h-6 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">전환율 분석</h3>
                      <p className="text-sm text-gray-500">샘플→구매 분석</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </AGCard>
              </Link>
            </div>
          </AGSection>

          {/* Recent Usage */}
          <AGSection
            title="최근 사용 로그"
            action={
              <Link
                to="/cosmetics-sample/tracking"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
              >
                전체보기 <ArrowRight className="w-4 h-4" />
              </Link>
            }
          >
            <AGCard padding="none">
              <AGTable
                columns={usageColumns}
                data={summary?.recentUsage || []}
                emptyMessage="최근 사용 기록이 없습니다"
              />
            </AGCard>
          </AGSection>
        </div>
      </div>
    </div>
  );
};

export default SampleDashboard;
