/**
 * Conversion Analytics Page
 *
 * 샘플→구매 전환율 분석
 * - 전환율 차트
 * - 매장 순위 (Top Stores)
 * - 제품별 전환율
 *
 * Phase 7-G: Cosmetics Sample & Display UI Redesign (AG Design System)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { authClient } from '@o4o/auth-client';
import {
  AGPageHeader,
  AGSection,
  AGKPIBlock,
  AGKPIGrid,
  AGCard,
  AGButton,
  AGSelect,
  AGTable,
} from '@o4o/ui';
import type { AGTableColumn } from '@o4o/ui';
import {
  TrendingUp,
  TrendingDown,
  BarChart2,
  RefreshCw,
  Calendar,
  Store,
  Package,
  Award,
  ChevronUp,
  ChevronDown,
  Minus,
} from 'lucide-react';

type PeriodType = 'daily' | 'weekly' | 'monthly';
type TabType = 'overview' | 'products' | 'stores';

interface ConversionData {
  period: string;
  sampleUsed: number;
  purchases: number;
  conversionRate: number;
  revenue: number;
}

interface StoreRanking {
  storeId: string;
  storeName: string;
  conversionRate: number;
  sampleUsed: number;
  purchases: number;
  revenue: number;
  trend: 'up' | 'down' | 'stable';
}

interface ProductConversion {
  productId: string;
  productName: string;
  sampleUsed: number;
  purchases: number;
  conversionRate: number;
  avgPurchaseAmount: number;
}

const ConversionAnalyticsPage: React.FC = () => {
  const api = authClient.api;
  const [loading, setLoading] = useState(true);
  const [periodType, setPeriodType] = useState<PeriodType>('weekly');
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [conversionTrend, setConversionTrend] = useState<ConversionData[]>([]);
  const [storeRankings, setStoreRankings] = useState<StoreRanking[]>([]);
  const [productConversions, setProductConversions] = useState<ProductConversion[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalSamples: 0,
    totalPurchases: 0,
    overallRate: 0,
    totalRevenue: 0,
    rateChange: 0,
  });

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      // Demo data - replace with actual API calls
      setConversionTrend([
        { period: '12/06', sampleUsed: 42, purchases: 11, conversionRate: 26.2, revenue: 385000 },
        { period: '12/07', sampleUsed: 38, purchases: 9, conversionRate: 23.7, revenue: 315000 },
        { period: '12/08', sampleUsed: 45, purchases: 14, conversionRate: 31.1, revenue: 490000 },
        { period: '12/09', sampleUsed: 50, purchases: 15, conversionRate: 30.0, revenue: 525000 },
        { period: '12/10', sampleUsed: 35, purchases: 10, conversionRate: 28.6, revenue: 350000 },
        { period: '12/11', sampleUsed: 48, purchases: 13, conversionRate: 27.1, revenue: 455000 },
        { period: '12/12', sampleUsed: 28, purchases: 8, conversionRate: 28.6, revenue: 280000 },
      ]);

      setStoreRankings([
        { storeId: 's1', storeName: '강남 플래그십', conversionRate: 35.2, sampleUsed: 85, purchases: 30, revenue: 1050000, trend: 'up' },
        { storeId: 's2', storeName: '홍대 본점', conversionRate: 32.8, sampleUsed: 64, purchases: 21, revenue: 735000, trend: 'up' },
        { storeId: 's3', storeName: '명동 중앙점', conversionRate: 28.5, sampleUsed: 70, purchases: 20, revenue: 700000, trend: 'stable' },
        { storeId: 's4', storeName: '신촌 유플렉스', conversionRate: 25.0, sampleUsed: 48, purchases: 12, revenue: 420000, trend: 'down' },
        { storeId: 's5', storeName: '잠실 롯데점', conversionRate: 22.2, sampleUsed: 54, purchases: 12, revenue: 420000, trend: 'stable' },
      ]);

      setProductConversions([
        { productId: 'p1', productName: '하이드로 부스팅 세럼 30ml', sampleUsed: 95, purchases: 38, conversionRate: 40.0, avgPurchaseAmount: 45000 },
        { productId: 'p2', productName: '비타민C 앰플 15ml', sampleUsed: 72, purchases: 25, conversionRate: 34.7, avgPurchaseAmount: 52000 },
        { productId: 'p3', productName: '수분크림 50ml', sampleUsed: 60, purchases: 18, conversionRate: 30.0, avgPurchaseAmount: 38000 },
        { productId: 'p4', productName: '선스크린 SPF50+ 50ml', sampleUsed: 45, purchases: 12, conversionRate: 26.7, avgPurchaseAmount: 28000 },
        { productId: 'p5', productName: '클렌징 폼 150ml', sampleUsed: 38, purchases: 8, conversionRate: 21.1, avgPurchaseAmount: 22000 },
      ]);

      setOverallStats({
        totalSamples: 286,
        totalPurchases: 80,
        overallRate: 28.0,
        totalRevenue: 2800000,
        rateChange: 2.5,
      });
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [api, periodType]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <ChevronUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <ChevronDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  // Simple bar chart visualization
  const maxRate = Math.max(...conversionTrend.map((d) => d.conversionRate), 1);

  // Product table columns
  const productColumns: AGTableColumn<ProductConversion>[] = [
    {
      key: 'productName',
      header: '제품명',
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'sampleUsed',
      header: '샘플 사용',
      align: 'center',
    },
    {
      key: 'purchases',
      header: '구매 건수',
      align: 'center',
    },
    {
      key: 'conversionRate',
      header: '전환율',
      align: 'center',
      render: (value) => (
        <div className="flex items-center justify-center gap-2">
          <div className="w-16 bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${value}%` }}
            />
          </div>
          <span className="font-bold text-green-600 w-12">{value}%</span>
        </div>
      ),
    },
    {
      key: 'avgPurchaseAmount',
      header: '평균 구매액',
      align: 'right',
      render: (value) => formatCurrency(value),
    },
  ];

  const tabs: { key: TabType; label: string }[] = [
    { key: 'overview', label: '전체' },
    { key: 'products', label: '제품별' },
    { key: 'stores', label: '매장별' },
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
        title="Conversion Analytics"
        description="샘플→구매 전환율 분석"
        icon={<BarChart2 className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <AGSelect
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as PeriodType)}
              className="w-28"
            >
              <option value="daily">일별</option>
              <option value="weekly">주별</option>
              <option value="monthly">월별</option>
            </AGSelect>
            <AGButton
              variant="ghost"
              size="sm"
              onClick={fetchAnalytics}
              iconLeft={<RefreshCw className="w-4 h-4" />}
            >
              새로고침
            </AGButton>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Overall Stats */}
        <AGSection>
          <AGKPIGrid columns={4}>
            <AGKPIBlock
              title="전체 전환율"
              value={`${overallStats.overallRate}%`}
              delta={overallStats.rateChange}
              deltaLabel="vs 이전"
              colorMode={overallStats.rateChange >= 0 ? 'positive' : 'negative'}
              trend={overallStats.rateChange >= 0 ? 'up' : 'down'}
              icon={<TrendingUp className="w-5 h-5 text-green-500" />}
            />
            <AGKPIBlock
              title="총 샘플 사용"
              value={overallStats.totalSamples}
              subtitle="이번 기간"
              colorMode="neutral"
              icon={<Package className="w-5 h-5 text-purple-500" />}
            />
            <AGKPIBlock
              title="전환 구매"
              value={overallStats.totalPurchases}
              subtitle="건"
              colorMode="info"
              icon={<BarChart2 className="w-5 h-5 text-blue-500" />}
            />
            <AGKPIBlock
              title="전환 매출"
              value={formatCurrency(overallStats.totalRevenue)}
              subtitle="이번 기간"
              colorMode="neutral"
              icon={<Award className="w-5 h-5 text-orange-500" />}
            />
          </AGKPIGrid>
        </AGSection>

        {/* Tabs */}
        <AGSection>
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </AGSection>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Conversion Trend Chart */}
            <AGSection title="전환율 추이" action={<Calendar className="w-5 h-5 text-gray-400" />}>
              <AGCard>
                <div className="flex items-end gap-2 h-48 pt-8">
                  {conversionTrend.map((data, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-gradient-to-t from-green-500 to-green-300 rounded-t-lg transition-all hover:from-green-600 hover:to-green-400 relative group cursor-pointer"
                        style={{ height: `${(data.conversionRate / maxRate) * 100}%`, minHeight: 20 }}
                      >
                        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                          {data.conversionRate}% ({data.purchases}/{data.sampleUsed})
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">{data.period}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-center gap-6 text-sm text-gray-500 border-t pt-4">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded"></span>
                    전환율 (%)
                  </span>
                </div>
              </AGCard>
            </AGSection>

            {/* Rankings Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Store Rankings */}
              <AGSection title="매장별 전환율 순위" action={<Store className="w-5 h-5 text-gray-400" />}>
                <AGCard padding="none">
                  <div className="divide-y divide-gray-100">
                    {storeRankings.map((store, index) => (
                      <div
                        key={store.storeId}
                        className="flex items-center gap-4 p-4 hover:bg-gray-50"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-200 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{store.storeName}</p>
                          <p className="text-xs text-gray-500">
                            {store.purchases}/{store.sampleUsed} 전환 | {formatCurrency(store.revenue)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{store.conversionRate}%</p>
                          <div className="flex items-center justify-end">
                            {getTrendIcon(store.trend)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </AGCard>
              </AGSection>

              {/* Product Conversions */}
              <AGSection title="제품별 전환율" action={<Package className="w-5 h-5 text-gray-400" />}>
                <AGCard padding="none">
                  <div className="divide-y divide-gray-100">
                    {productConversions.map((product) => (
                      <div
                        key={product.productId}
                        className="p-4 hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-gray-900 text-sm">{product.productName}</p>
                          <p className="font-bold text-green-600">{product.conversionRate}%</p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full"
                            style={{ width: `${product.conversionRate}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1 text-xs text-gray-500">
                          <span>{product.purchases}/{product.sampleUsed} 전환</span>
                          <span>평균 {formatCurrency(product.avgPurchaseAmount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </AGCard>
              </AGSection>
            </div>
          </>
        )}

        {activeTab === 'products' && (
          <AGSection title="제품별 전환율 분석">
            <AGCard padding="none">
              <AGTable
                columns={productColumns}
                data={productConversions}
                emptyMessage="데이터가 없습니다"
              />
            </AGCard>
          </AGSection>
        )}

        {activeTab === 'stores' && (
          <AGSection title="매장별 전환율 분석">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {storeRankings.map((store, index) => (
                <AGCard key={store.storeId} padding="lg">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-200 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{store.storeName}</h3>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          {getTrendIcon(store.trend)}
                          <span>{store.trend === 'up' ? '상승' : store.trend === 'down' ? '하락' : '유지'}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-green-600">{store.conversionRate}%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center border-t pt-4">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{store.sampleUsed}</p>
                      <p className="text-xs text-gray-500">샘플 사용</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{store.purchases}</p>
                      <p className="text-xs text-gray-500">구매 전환</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{formatCurrency(store.revenue).replace('₩', '')}</p>
                      <p className="text-xs text-gray-500">매출</p>
                    </div>
                  </div>
                </AGCard>
              ))}
            </div>
          </AGSection>
        )}

        {/* Insights */}
        <AGSection>
          <AGCard className="bg-gradient-to-r from-green-50 to-blue-50 border-green-100">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-xl">💡</span> 인사이트
            </h3>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>하이드로 부스팅 세럼</strong>이 40% 전환율로 가장 높은 성과를 보이고 있습니다.
                  해당 제품의 샘플 수량을 늘리는 것을 권장합니다.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Store className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>강남 플래그십</strong>이 35.2%로 최고 전환율을 기록 중입니다.
                  성공 요인을 분석하여 다른 매장에 적용해 보세요.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <TrendingDown className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>신촌 유플렉스</strong>의 전환율이 하락 추세입니다.
                  진열 상태 및 샘플 품질을 점검해 주세요.
                </span>
              </li>
            </ul>
          </AGCard>
        </AGSection>
      </div>
    </div>
  );
};

export default ConversionAnalyticsPage;
