/**
 * Cosmetics Supplier Price Policies
 *
 * 가격 정책 관리
 * - 최저가 정책 설정
 * - 가격 위반 모니터링
 * - 정책별 적용 현황
 *
 * Phase 6-G: Cosmetics Supplier Extension
 */

import React, { useState, useEffect, useCallback } from 'react';
import { authClient } from '@o4o/auth-client';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Search,
  Eye,
  Clock,
  DollarSign,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';

type PolicyStatus = 'draft' | 'active' | 'suspended' | 'expired';
type PolicyScope = 'product' | 'category' | 'brand' | 'global';

interface PricePolicy {
  id: string;
  policyName: string;
  description?: string;
  scope: PolicyScope;
  productId?: string;
  productName?: string;
  categoryId?: string;
  categoryName?: string;
  wholesalePrice: number;
  minSalePrice: number;
  maxSalePrice?: number;
  recommendedPrice?: number;
  status: PolicyStatus;
  violationCount: number;
  appliedSellerCount: number;
  createdAt: string;
}

interface PriceViolation {
  id: string;
  policyId: string;
  policyName: string;
  sellerId: string;
  sellerName: string;
  productName: string;
  sellerPrice: number;
  minSalePrice: number;
  violationType: 'below_min' | 'above_max';
  violationAmount: number;
  detectedAt: string;
}

const CosmeticsSupplierPricePolicies: React.FC = () => {
  const api = authClient.api;
  const [policies, setPolicies] = useState<PricePolicy[]>([]);
  const [violations, setViolations] = useState<PriceViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'policies' | 'violations'>('policies');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Demo data
      setPolicies([
        {
          id: '1',
          policyName: '프리미엄 세럼 최저가',
          description: '프리미엄 라인 세럼 최저가 정책',
          scope: 'product',
          productId: 'prod-1',
          productName: '하이드로 부스팅 세럼 30ml',
          wholesalePrice: 25000,
          minSalePrice: 35000,
          maxSalePrice: 55000,
          recommendedPrice: 45000,
          status: 'active',
          violationCount: 2,
          appliedSellerCount: 18,
          createdAt: '2024-11-01T00:00:00Z',
        },
        {
          id: '2',
          policyName: '선케어 라인 정책',
          description: '선케어 카테고리 전체 적용',
          scope: 'category',
          categoryId: 'cat-suncare',
          categoryName: '선케어',
          wholesalePrice: 15000,
          minSalePrice: 22000,
          status: 'active',
          violationCount: 1,
          appliedSellerCount: 25,
          createdAt: '2024-10-15T00:00:00Z',
        },
        {
          id: '3',
          policyName: '신제품 런칭가',
          scope: 'product',
          productId: 'prod-new',
          productName: '비타민C 앰플 15ml',
          wholesalePrice: 18000,
          minSalePrice: 28000,
          recommendedPrice: 32000,
          status: 'draft',
          violationCount: 0,
          appliedSellerCount: 0,
          createdAt: '2024-12-10T00:00:00Z',
        },
      ]);

      setViolations([
        {
          id: 'v1',
          policyId: '1',
          policyName: '프리미엄 세럼 최저가',
          sellerId: 'seller-3',
          sellerName: '뷰티샵 신촌점',
          productName: '하이드로 부스팅 세럼 30ml',
          sellerPrice: 32000,
          minSalePrice: 35000,
          violationType: 'below_min',
          violationAmount: 3000,
          detectedAt: '2024-12-11T14:30:00Z',
        },
        {
          id: 'v2',
          policyId: '1',
          policyName: '프리미엄 세럼 최저가',
          sellerId: 'seller-5',
          sellerName: '코스메틱존 명동',
          productName: '하이드로 부스팅 세럼 30ml',
          sellerPrice: 33500,
          minSalePrice: 35000,
          violationType: 'below_min',
          violationAmount: 1500,
          detectedAt: '2024-12-10T09:15:00Z',
        },
        {
          id: 'v3',
          policyId: '2',
          policyName: '선케어 라인 정책',
          sellerId: 'seller-8',
          sellerName: '피부과 연계샵',
          productName: '데일리 선스크린 SPF50+',
          sellerPrice: 19900,
          minSalePrice: 22000,
          violationType: 'below_min',
          violationAmount: 2100,
          detectedAt: '2024-12-09T16:45:00Z',
        },
      ]);
    } catch (err) {
      console.error('Failed to fetch price policies:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusBadge = (status: PolicyStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" /> 활성
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Clock className="w-3 h-3" /> 초안
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            중지됨
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            만료됨
          </span>
        );
    }
  };

  const getScopeBadge = (scope: PolicyScope) => {
    const colors = {
      product: 'bg-blue-100 text-blue-700',
      category: 'bg-purple-100 text-purple-700',
      brand: 'bg-pink-100 text-pink-700',
      global: 'bg-gray-100 text-gray-700',
    };
    const labels = {
      product: '상품',
      category: '카테고리',
      brand: '브랜드',
      global: '전체',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[scope]}`}>
        {labels[scope]}
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

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-1/3"></div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
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
          <h1 className="text-2xl font-bold text-gray-900">가격 정책</h1>
          <p className="text-gray-500 text-sm mt-1">최저가 정책 관리 및 위반 모니터링</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="새로고침"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            새 정책
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{policies.length}</p>
              <p className="text-sm text-gray-500">전체 정책</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">
                {policies.filter((p) => p.status === 'active').length}
              </p>
              <p className="text-sm text-gray-500">활성 정책</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-600">{violations.length}</p>
              <p className="text-sm text-gray-500">가격 위반</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">
                {violations.reduce((sum, v) => sum + v.violationAmount, 0).toLocaleString()}원
              </p>
              <p className="text-sm text-gray-500">총 위반 금액</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('policies')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'policies'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            정책 목록
          </button>
          <button
            onClick={() => setActiveTab('violations')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
              activeTab === 'violations'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            위반 내역
            {violations.length > 0 && (
              <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-xs">
                {violations.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="정책명 또는 상품명으로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Content */}
      {activeTab === 'policies' ? (
        <div className="space-y-3">
          {policies.map((policy) => (
            <div
              key={policy.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{policy.policyName}</h3>
                    {getScopeBadge(policy.scope)}
                    {getStatusBadge(policy.status)}
                  </div>
                  {policy.description && (
                    <p className="text-sm text-gray-500 mb-2">{policy.description}</p>
                  )}
                  <p className="text-sm text-gray-600">
                    {policy.productName || policy.categoryName}
                  </p>

                  {/* Price Info */}
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">도매가:</span>
                      <span className="ml-1 font-medium">
                        {policy.wholesalePrice.toLocaleString()}원
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">최저가:</span>
                      <span className="ml-1 font-medium text-blue-600">
                        {policy.minSalePrice.toLocaleString()}원
                      </span>
                    </div>
                    {policy.maxSalePrice && (
                      <div>
                        <span className="text-gray-500">최고가:</span>
                        <span className="ml-1 font-medium">
                          {policy.maxSalePrice.toLocaleString()}원
                        </span>
                      </div>
                    )}
                    {policy.recommendedPrice && (
                      <div>
                        <span className="text-gray-500">권장가:</span>
                        <span className="ml-1 font-medium text-green-600">
                          {policy.recommendedPrice.toLocaleString()}원
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="mt-3 flex gap-4 text-xs text-gray-500">
                    <span>적용 셀러: {policy.appliedSellerCount}명</span>
                    {policy.violationCount > 0 && (
                      <span className="text-red-600">
                        위반: {policy.violationCount}건
                      </span>
                    )}
                    <span>생성일: {formatDate(policy.createdAt)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {violations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-300" />
              <p>현재 가격 위반이 없습니다</p>
            </div>
          ) : (
            violations.map((violation) => (
              <div
                key={violation.id}
                className="bg-white rounded-xl shadow-sm border border-red-200 p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <h3 className="font-semibold text-gray-900">{violation.productName}</h3>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                        최저가 미달
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      판매자: {violation.sellerName}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      정책: {violation.policyName}
                    </p>

                    {/* Price Comparison */}
                    <div className="mt-3 flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">판매가</p>
                        <p className="text-lg font-bold text-red-600">
                          {violation.sellerPrice.toLocaleString()}원
                        </p>
                      </div>
                      <TrendingDown className="w-5 h-5 text-red-400" />
                      <div className="text-center">
                        <p className="text-xs text-gray-500">최저가</p>
                        <p className="text-lg font-bold text-blue-600">
                          {violation.minSalePrice.toLocaleString()}원
                        </p>
                      </div>
                      <div className="ml-4 px-3 py-1 bg-red-50 rounded">
                        <p className="text-sm font-medium text-red-700">
                          -{violation.violationAmount.toLocaleString()}원
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 mt-3">
                      발견일시: {formatDateTime(violation.detectedAt)}
                    </p>
                  </div>

                  <button className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
                    경고 발송
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Modal Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">새 가격 정책</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-500 text-sm mb-4">
              가격 정책 생성 폼이 여기에 표시됩니다.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CosmeticsSupplierPricePolicies;
