/**
 * Conversion Analytics Page
 *
 * 샘플→구매 전환율 분석
 * - 전환율 차트
 * - 매장 순위 (Top Stores)
 * - 제품별 전환율
 *
 * Phase 6-H: Cosmetics Sample & Display Extension
 */

import React, { useState, useEffect, useCallback } from 'react';
import { authClient } from '@o4o/auth-client';
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

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversion Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">샘플→구매 전환율 분석</p>
        </div>
        <div className="flex gap-2">
          <select
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value as PeriodType)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="daily">일별</option>
            <option value="weekly">주별</option>
            <option value="monthly">월별</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="새로고침"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">전체 전환율</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {overallStats.overallRate}%
              </p>
              <p className={`text-xs mt-0.5 ${overallStats.rateChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {overallStats.rateChange >= 0 ? '+' : ''}{overallStats.rateChange}% vs 이전
              </p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">총 샘플 사용</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {overallStats.totalSamples}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">이번 기간</p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">전환 구매</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {overallStats.totalPurchases}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">건</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <BarChart2 className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">전환 매출</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {formatCurrency(overallStats.totalRevenue)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">이번 기간</p>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Conversion Trend Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            전환율 추이
          </h2>
        </div>

        {/* Simple Bar Chart */}
        <div className="flex items-end gap-2 h-48">
          {conversionTrend.map((data, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-gradient-to-t from-green-500 to-green-300 rounded-t-lg transition-all hover:from-green-600 hover:to-green-400 relative group"
                style={{ height: `${(data.conversionRate / maxRate) * 100}%`, minHeight: 20 }}
              >
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  {data.conversionRate}% ({data.purchases}/{data.sampleUsed})
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">{data.period}</p>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex justify-center gap-6 text-sm text-gray-500">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded"></span>
            전환율 (%)
          </span>
        </div>
      </div>

      {/* Rankings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Store Rankings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Store className="w-5 h-5 text-gray-400" />
              매장별 전환율 순위
            </h2>
          </div>

          <div className="space-y-3">
            {storeRankings.map((store, index) => (
              <div
                key={store.storeId}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
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
        </div>

        {/* Product Conversions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-400" />
              제품별 전환율
            </h2>
          </div>

          <div className="space-y-3">
            {productConversions.map((product) => (
              <div
                key={product.productId}
                className="p-3 bg-gray-50 rounded-lg"
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
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-5 border border-green-100">
        <h3 className="font-semibold text-gray-900 mb-3">💡 인사이트</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-green-500 mt-0.5" />
            <span>
              <strong>하이드로 부스팅 세럼</strong>이 40% 전환율로 가장 높은 성과를 보이고 있습니다.
              해당 제품의 샘플 수량을 늘리는 것을 권장합니다.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Store className="w-4 h-4 text-blue-500 mt-0.5" />
            <span>
              <strong>강남 플래그십</strong>이 35.2%로 최고 전환율을 기록 중입니다.
              성공 요인을 분석하여 다른 매장에 적용해 보세요.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <TrendingDown className="w-4 h-4 text-red-500 mt-0.5" />
            <span>
              <strong>신촌 유플렉스</strong>의 전환율이 하락 추세입니다.
              진열 상태 및 샘플 품질을 점검해 주세요.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ConversionAnalyticsPage;
