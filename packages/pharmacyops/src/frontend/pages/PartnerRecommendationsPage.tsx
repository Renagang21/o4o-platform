/**
 * PartnerRecommendationsPage
 *
 * 파트너 제품 추천 페이지
 * PHARMACEUTICAL 제품은 제외됩니다 - 오직 화장품, 건강식품, 일반 제품만 추천됩니다.
 *
 * @package @o4o/pharmacyops
 */

import React, { useState, useEffect } from 'react';
import type {
  PartnerRecommendation,
  RecommendationStats,
} from '../../services/PartnerRecommendationService.js';

// Mock data for development
const mockStats: RecommendationStats = {
  totalRecommendations: 156,
  byProductType: {
    cosmetics: 78,
    health: 65,
    general: 13,
  },
  topPartners: [
    { partnerId: 'partner-001', partnerName: '뷰티파트너', productCount: 45 },
    { partnerId: 'partner-002', partnerName: '헬스웰', productCount: 38 },
    { partnerId: 'partner-003', partnerName: '라이프케어', productCount: 32 },
  ],
};

const mockRecommendations: PartnerRecommendation[] = [
  {
    id: 'rec-001',
    partnerId: 'partner-001',
    partnerName: '뷰티파트너',
    productId: 'prod-001',
    productName: '히알루론산 세럼 50ml',
    productType: 'cosmetics',
    description: '고농축 히알루론산으로 깊은 보습',
    price: 45000,
    discountRate: 15,
    finalPrice: 38250,
    rating: 4.8,
    reviewCount: 256,
    conversionRate: 12.5,
  },
  {
    id: 'rec-002',
    partnerId: 'partner-002',
    partnerName: '헬스웰',
    productId: 'prod-002',
    productName: '종합비타민 60정',
    productType: 'health',
    description: '하루 한 알로 충분한 영양',
    price: 32000,
    discountRate: 10,
    finalPrice: 28800,
    rating: 4.6,
    reviewCount: 189,
    conversionRate: 8.3,
  },
  {
    id: 'rec-003',
    partnerId: 'partner-001',
    partnerName: '뷰티파트너',
    productId: 'prod-003',
    productName: '레티놀 크림 30ml',
    productType: 'cosmetics',
    description: '피부 탄력 개선',
    price: 58000,
    discountRate: 20,
    finalPrice: 46400,
    rating: 4.7,
    reviewCount: 324,
    conversionRate: 15.2,
  },
  {
    id: 'rec-004',
    partnerId: 'partner-003',
    partnerName: '라이프케어',
    productId: 'prod-004',
    productName: '프로바이오틱스 30포',
    productType: 'health',
    description: '장 건강 유산균',
    price: 42000,
    discountRate: 12,
    finalPrice: 36960,
    rating: 4.5,
    reviewCount: 412,
    conversionRate: 10.1,
  },
];

interface ProductTypeBadgeProps {
  type: string;
}

const ProductTypeBadge: React.FC<ProductTypeBadgeProps> = ({ type }) => {
  const colors: Record<string, string> = {
    cosmetics: 'bg-pink-100 text-pink-800',
    health: 'bg-blue-100 text-blue-800',
    general: 'bg-gray-100 text-gray-800',
  };

  const labels: Record<string, string> = {
    cosmetics: '화장품',
    health: '건강식품',
    general: '일반',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
      {labels[type] || type}
    </span>
  );
};

interface RecommendationCardProps {
  recommendation: PartnerRecommendation;
  onViewDetail: (id: string) => void;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onViewDetail,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Product Image Placeholder */}
      <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>

      <div className="p-4">
        {/* Product Type Badge */}
        <div className="mb-2">
          <ProductTypeBadge type={recommendation.productType} />
        </div>

        {/* Product Name */}
        <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
          {recommendation.productName}
        </h3>

        {/* Partner Name */}
        <p className="text-sm text-gray-500 mb-2">
          by {recommendation.partnerName}
        </p>

        {/* Description */}
        {recommendation.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {recommendation.description}
          </p>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-xl font-bold text-blue-600">
            {formatCurrency(recommendation.finalPrice)}
          </span>
          {recommendation.discountRate && recommendation.discountRate > 0 && (
            <>
              <span className="text-sm text-gray-400 line-through">
                {formatCurrency(recommendation.price)}
              </span>
              <span className="text-sm font-medium text-red-500">
                -{recommendation.discountRate}%
              </span>
            </>
          )}
        </div>

        {/* Rating & Reviews */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          {recommendation.rating && (
            <div className="flex items-center">
              <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="font-medium">{recommendation.rating}</span>
            </div>
          )}
          {recommendation.reviewCount && (
            <span className="text-gray-500">
              리뷰 {recommendation.reviewCount}
            </span>
          )}
          {recommendation.conversionRate && (
            <span className="text-green-600">
              전환율 {recommendation.conversionRate}%
            </span>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={() => onViewDetail(recommendation.id)}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          자세히 보기
        </button>
      </div>
    </div>
  );
};

export const PartnerRecommendationsPage: React.FC = () => {
  const [stats, setStats] = useState<RecommendationStats | null>(null);
  const [recommendations, setRecommendations] = useState<PartnerRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    productType: '',
  });

  useEffect(() => {
    // TODO: Replace with actual API call
    setTimeout(() => {
      setStats(mockStats);
      setRecommendations(mockRecommendations);
      setLoading(false);
    }, 500);
  }, []);

  const handleViewDetail = (recommendationId: string) => {
    // TODO: Navigate to detail page or open modal
    console.log('View detail:', recommendationId);
  };

  const filteredRecommendations = recommendations.filter(
    (r) => !filter.productType || r.productType === filter.productType
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">파트너 추천 제품</h1>
          <p className="mt-1 text-sm text-gray-500">
            파트너가 제안하는 화장품, 건강식품, 일반 제품을 확인하세요
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            의약품 제외
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">총 추천 제품</h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {stats.totalRecommendations}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">화장품</h3>
            <p className="mt-1 text-2xl font-semibold text-pink-600">
              {stats.byProductType.cosmetics || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">건강식품</h3>
            <p className="mt-1 text-2xl font-semibold text-blue-600">
              {stats.byProductType.health || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">일반</h3>
            <p className="mt-1 text-2xl font-semibold text-gray-600">
              {stats.byProductType.general || 0}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">필터:</span>
          <button
            onClick={() => setFilter({ productType: '' })}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !filter.productType
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setFilter({ productType: 'cosmetics' })}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter.productType === 'cosmetics'
                ? 'bg-pink-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            화장품
          </button>
          <button
            onClick={() => setFilter({ productType: 'health' })}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter.productType === 'health'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            건강식품
          </button>
          <button
            onClick={() => setFilter({ productType: 'general' })}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter.productType === 'general'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            일반
          </button>
        </div>
      </div>

      {/* Recommendations Grid */}
      {filteredRecommendations.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">추천 제품이 없습니다</h3>
          <p className="mt-2 text-sm text-gray-500">
            선택한 카테고리에 해당하는 추천 제품이 없습니다.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredRecommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              onViewDetail={handleViewDetail}
            />
          ))}
        </div>
      )}

      {/* Info Notice */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              파트너 제품 추천 안내
            </h3>
            <div className="mt-2 text-sm text-green-700">
              <p>
                이 페이지에서는 파트너가 제안하는 화장품, 건강식품, 일반 제품만 표시됩니다.
                의약품(PHARMACEUTICAL)은 파트너 프로그램에서 제외되어 추천 목록에 포함되지 않습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerRecommendationsPage;
