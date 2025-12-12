/**
 * Sample Dashboard
 *
 * 샘플 & 진열 대시보드
 * - 샘플 재고 요약
 * - 최근 샘플 사용 로그
 * - 전환 KPI 카드
 *
 * Phase 6-H: Cosmetics Sample & Display Extension
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  Beaker,
  Package,
  TrendingUp,
  Layout,
  RefreshCw,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShoppingCart,
  Eye,
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

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sample Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">샘플 재고, 사용, 진열 현황</p>
        </div>
        <button
          onClick={fetchSummary}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          title="새로고침"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Alerts */}
      {(summary?.inventory.lowStock || summary?.inventory.outOfStock) ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-yellow-800">재고 보충 필요</p>
            <p className="text-yellow-700 text-sm mt-1">
              {summary?.inventory.lowStock}개 제품 재고 부족, {summary?.inventory.outOfStock}개 제품 품절
            </p>
          </div>
          <Link
            to="/cosmetics-sample/tracking"
            className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700"
          >
            확인하기
          </Link>
        </div>
      ) : null}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Inventory Status */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">샘플 재고</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {summary?.inventory.totalProducts}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                정상: {summary?.inventory.inStock} | 부족: {summary?.inventory.lowStock}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Today Usage */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">오늘 사용</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {summary?.usage.todayUsage}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                주간: {summary?.usage.weekUsage}개
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <Beaker className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">전환율</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {summary?.conversion.rate}%
              </p>
              <p className={`text-xs mt-0.5 ${
                (summary?.conversion.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(summary?.conversion.change || 0) >= 0 ? '+' : ''}{summary?.conversion.change}% vs 이전
              </p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        {/* Display Status */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">진열 현황</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {summary?.display.verified}/{summary?.display.totalDisplays}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                인증됨 | 보충필요: {summary?.display.needsRefill}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <Layout className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">빠른 실행</h2>

          <Link
            to="/cosmetics-sample/tracking"
            className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:border-blue-300 transition-colors group flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100">
              <Package className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">샘플 입고/사용</h3>
              <p className="text-sm text-gray-500">재고 입출고 관리</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
          </Link>

          <Link
            to="/cosmetics-sample/display"
            className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:border-orange-300 transition-colors group flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center group-hover:bg-orange-100">
              <Layout className="w-6 h-6 text-orange-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">진열 관리</h3>
              <p className="text-sm text-gray-500">진열 레이아웃 설정</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500" />
          </Link>

          <Link
            to="/cosmetics-sample/analytics"
            className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:border-green-300 transition-colors group flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center group-hover:bg-green-100">
              <BarChart2 className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">전환율 분석</h3>
              <p className="text-sm text-gray-500">샘플→구매 분석</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-500" />
          </Link>
        </div>

        {/* Recent Usage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">최근 사용 로그</h2>
            <Link
              to="/cosmetics-sample/tracking"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              전체보기 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {summary?.recentUsage.map((usage) => (
              <div
                key={usage.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    usage.resultedInPurchase ? 'bg-green-100' : 'bg-gray-200'
                  }`}>
                    {usage.resultedInPurchase ? (
                      <ShoppingCart className="w-4 h-4 text-green-600" />
                    ) : (
                      <Beaker className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{usage.productName}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(usage.usedAt)}
                    </p>
                  </div>
                </div>
                {usage.resultedInPurchase && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                    구매
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SampleDashboard;
