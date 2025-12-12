/**
 * Cosmetics Supplier Samples
 *
 * 샘플 관리
 * - 샘플 출고 기록
 * - 전환 추적
 * - 매장별 성과 분석
 *
 * Phase 6-G: Cosmetics Supplier Extension
 */

import React, { useState, useEffect, useCallback } from 'react';
import { authClient } from '@o4o/auth-client';
import {
  Package,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  Truck,
  CheckCircle,
  Clock,
  BarChart2,
  Store,
  Filter,
} from 'lucide-react';

type SampleStatus = 'shipped' | 'delivered' | 'used' | 'expired';
type SampleType = 'trial' | 'display' | 'tester' | 'gift' | 'promotional';

interface Sample {
  id: string;
  productId: string;
  productName: string;
  storeId?: string;
  storeName?: string;
  partnerId?: string;
  partnerName?: string;
  sampleType: SampleType;
  status: SampleStatus;
  quantityShipped: number;
  quantityUsed: number;
  quantityRemaining: number;
  unitCost: number;
  totalCost: number;
  conversionCount: number;
  conversionRevenue: number;
  shippedAt: string;
  deliveredAt?: string;
}

interface StoreRanking {
  storeId: string;
  storeName: string;
  totalSamples: number;
  totalConversions: number;
  conversionRate: number;
  totalRevenue: number;
}

const CosmeticsSupplierSamples: React.FC = () => {
  const api = authClient.api;
  const [samples, setSamples] = useState<Sample[]>([]);
  const [rankings, setRankings] = useState<StoreRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'samples' | 'rankings'>('samples');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SampleStatus | 'all'>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Demo data
      setSamples([
        {
          id: '1',
          productId: 'prod-1',
          productName: '하이드로 부스팅 세럼 30ml',
          storeId: 'store-1',
          storeName: '뷰티샵 강남점',
          sampleType: 'trial',
          status: 'delivered',
          quantityShipped: 50,
          quantityUsed: 35,
          quantityRemaining: 15,
          unitCost: 5000,
          totalCost: 250000,
          conversionCount: 12,
          conversionRevenue: 540000,
          shippedAt: '2024-12-01T00:00:00Z',
          deliveredAt: '2024-12-03T00:00:00Z',
        },
        {
          id: '2',
          productId: 'prod-2',
          productName: '비타민C 앰플 15ml',
          storeId: 'store-2',
          storeName: '코스메틱 홍대점',
          sampleType: 'tester',
          status: 'used',
          quantityShipped: 30,
          quantityUsed: 30,
          quantityRemaining: 0,
          unitCost: 3500,
          totalCost: 105000,
          conversionCount: 18,
          conversionRevenue: 576000,
          shippedAt: '2024-11-20T00:00:00Z',
          deliveredAt: '2024-11-22T00:00:00Z',
        },
        {
          id: '3',
          productId: 'prod-3',
          productName: '수분크림 미니 10ml',
          partnerId: 'partner-1',
          partnerName: '@beauty_guru',
          sampleType: 'gift',
          status: 'shipped',
          quantityShipped: 100,
          quantityUsed: 0,
          quantityRemaining: 100,
          unitCost: 2000,
          totalCost: 200000,
          conversionCount: 0,
          conversionRevenue: 0,
          shippedAt: '2024-12-10T00:00:00Z',
        },
      ]);

      setRankings([
        {
          storeId: 'store-2',
          storeName: '코스메틱 홍대점',
          totalSamples: 120,
          totalConversions: 45,
          conversionRate: 37.5,
          totalRevenue: 1800000,
        },
        {
          storeId: 'store-1',
          storeName: '뷰티샵 강남점',
          totalSamples: 200,
          totalConversions: 52,
          conversionRate: 26.0,
          totalRevenue: 2340000,
        },
        {
          storeId: 'store-3',
          storeName: '스킨케어 전문점 신촌',
          totalSamples: 80,
          totalConversions: 18,
          conversionRate: 22.5,
          totalRevenue: 720000,
        },
      ]);
    } catch (err) {
      console.error('Failed to fetch samples:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusBadge = (status: SampleStatus) => {
    switch (status) {
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Truck className="w-3 h-3" /> 배송중
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" /> 배송완료
          </span>
        );
      case 'used':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            소진됨
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            만료됨
          </span>
        );
    }
  };

  const getSampleTypeBadge = (type: SampleType) => {
    const labels: Record<SampleType, string> = {
      trial: '체험용',
      display: '진열용',
      tester: '테스터',
      gift: '사은품',
      promotional: '프로모션',
    };
    return (
      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
        {labels[type]}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const totalShipped = samples.reduce((sum, s) => sum + s.quantityShipped, 0);
  const totalUsed = samples.reduce((sum, s) => sum + s.quantityUsed, 0);
  const totalConversions = samples.reduce((sum, s) => sum + s.conversionCount, 0);
  const totalRevenue = samples.reduce((sum, s) => sum + s.conversionRevenue, 0);
  const overallConversionRate = totalUsed > 0 ? (totalConversions / totalUsed) * 100 : 0;

  const filteredSamples = samples.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (
        !s.productName.toLowerCase().includes(search) &&
        !s.storeName?.toLowerCase().includes(search) &&
        !s.partnerName?.toLowerCase().includes(search)
      ) {
        return false;
      }
    }
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">샘플 관리</h1>
          <p className="text-gray-500 text-sm mt-1">샘플 출고 및 전환 추적</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="새로고침"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            샘플 출고
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{totalShipped}</p>
              <p className="text-sm text-gray-500">총 출고량</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{totalUsed}</p>
              <p className="text-sm text-gray-500">사용량</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-green-600">
                {overallConversionRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500">전환율</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{totalRevenue.toLocaleString()}원</p>
              <p className="text-sm text-gray-500">전환 매출</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('samples')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'samples'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            샘플 목록
          </button>
          <button
            onClick={() => setActiveTab('rankings')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
              activeTab === 'rankings'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Store className="w-4 h-4" />
            매장 순위
          </button>
        </nav>
      </div>

      {activeTab === 'samples' ? (
        <>
          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="상품명 또는 매장명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SampleStatus | 'all')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">전체 상태</option>
              <option value="shipped">배송중</option>
              <option value="delivered">배송완료</option>
              <option value="used">소진됨</option>
              <option value="expired">만료됨</option>
            </select>
          </div>

          {/* Sample List */}
          <div className="space-y-3">
            {filteredSamples.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>해당하는 샘플이 없습니다</p>
              </div>
            ) : (
              filteredSamples.map((sample) => (
                <div
                  key={sample.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{sample.productName}</h3>
                        {getSampleTypeBadge(sample.sampleType)}
                        {getStatusBadge(sample.status)}
                      </div>
                      <p className="text-sm text-gray-600">
                        {sample.storeName || sample.partnerName}
                      </p>

                      {/* Quantity Info */}
                      <div className="mt-3 flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-orange-500 h-2 rounded-full"
                              style={{
                                width: `${(sample.quantityUsed / sample.quantityShipped) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-500">
                            {sample.quantityUsed}/{sample.quantityShipped}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">전환:</span>
                          <span className="ml-1 font-medium text-green-600">
                            {sample.conversionCount}건
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">매출:</span>
                          <span className="ml-1 font-medium">
                            {sample.conversionRevenue.toLocaleString()}원
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-400 mt-3">
                        출고일: {formatDate(sample.shippedAt)}
                        {sample.deliveredAt && ` / 배송완료: ${formatDate(sample.deliveredAt)}`}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-gray-500">비용</p>
                      <p className="font-semibold">{sample.totalCost.toLocaleString()}원</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        /* Rankings Tab */
        <div className="space-y-3">
          {rankings.map((rank, index) => (
            <div
              key={rank.storeId}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    index === 0
                      ? 'bg-yellow-100 text-yellow-700'
                      : index === 1
                      ? 'bg-gray-100 text-gray-700'
                      : index === 2
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-50 text-gray-500'
                  }`}
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{rank.storeName}</h3>
                  <div className="flex gap-6 mt-2 text-sm">
                    <div>
                      <span className="text-gray-500">샘플:</span>
                      <span className="ml-1 font-medium">{rank.totalSamples}개</span>
                    </div>
                    <div>
                      <span className="text-gray-500">전환:</span>
                      <span className="ml-1 font-medium">{rank.totalConversions}건</span>
                    </div>
                    <div>
                      <span className="text-gray-500">전환율:</span>
                      <span className="ml-1 font-medium text-green-600">
                        {rank.conversionRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">총 매출</p>
                  <p className="font-bold text-lg">{rank.totalRevenue.toLocaleString()}원</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CosmeticsSupplierSamples;
